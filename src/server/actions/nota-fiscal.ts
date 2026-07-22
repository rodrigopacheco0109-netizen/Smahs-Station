"use server";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getCategoriasDespesa } from "./despesas";

export interface ItemNotaFiscal {
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  pesoKgUnitario: number | null;
  unidadesPorCaixa: number | null;
  categoriaId: string;
  categoriaNome: string;
}

export interface DadosExtraidosNotaFiscal {
  fornecedor: string | null;
  dataEmissao: string | null;
  numeroNota: string | null;
  itens: ItemNotaFiscal[];
}

// Códigos de unidade como "CX5", "PC1", "UN1", "KG1" trazem o multiplicador
// (quantas unidades elementares por caixa/pacote) embutido no próprio código:
// letras + número final. É texto literal da nota, então extrair por regex é
// bem mais confiável do que pedir para o modelo "copiar" esse número à parte
// (ele já confundiu com a quantidade pedida em testes reais). Quando o
// prefixo é KG, a própria quantidade já É o peso total em kg — não há
// pacote/caixa nem peso unitário para multiplicar.
function interpretarCodigoUnidade(unidade: string): { multiplicador: number | null; ehQuilo: boolean } {
  const limpo = unidade.trim().toUpperCase().replace(/\s+/g, "");
  const match = limpo.match(/^([A-ZÀ-ÿ]+)(\d+)$/);
  if (!match) return { multiplicador: null, ehQuilo: false };
  const [, prefixo, numero] = match;
  return { multiplicador: Number(numero), ehQuilo: prefixo === "KG" };
}

// Muitas descrições já trazem o peso por extenso (ex: "5X2,5KG" = 5 pacotes
// de 2,5kg cada; "BANHA ANIMAL AURORA 1KG" = 1kg). Prioriza esse texto sobre
// o campo livre pesoKgUnitario da IA, por ser um trecho maior e mais fácil de
// ler certo do que a coluna estreita de unidade/quantidade.
function extrairPesoDaDescricao(descricao: string): number | null {
  const comMultiplicador = descricao.match(/\d+\s*[xX]\s*(\d+(?:[,.]\d+)?)\s*KG\b/i);
  if (comMultiplicador) return Number(comMultiplicador[1].replace(",", "."));
  const somentePeso = descricao.match(/(\d+(?:[,.]\d+)?)\s*KG\b/i);
  if (somentePeso) return Number(somentePeso[1].replace(",", "."));
  return null;
}

export type ResultadoLeituraNota =
  | { status: "ok"; dados: DadosExtraidosNotaFiscal }
  | { status: "erro"; mensagem: string };

const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"] as const;
const TIPO_PDF = "application/pdf";

export async function lerNotaFiscal(formData: FormData): Promise<ResultadoLeituraNota> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: "erro", mensagem: "ANTHROPIC_API_KEY não configurada no servidor." };
  }

  const arquivo = formData.get("nota") as File | null;
  if (!arquivo || arquivo.size === 0) {
    return { status: "erro", mensagem: "Selecione uma foto ou PDF da nota fiscal." };
  }
  if (arquivo.size > 15 * 1024 * 1024) {
    return { status: "erro", mensagem: "Arquivo muito grande (máximo 15 MB)." };
  }

  const ehImagem = (TIPOS_IMAGEM as readonly string[]).includes(arquivo.type);
  const ehPdf = arquivo.type === TIPO_PDF;
  if (!ehImagem && !ehPdf) {
    return { status: "erro", mensagem: "Formato não suportado. Envie JPG, PNG, WEBP ou PDF." };
  }

  const categorias = await getCategoriasDespesa();
  if (categorias.length === 0) {
    return { status: "erro", mensagem: "Nenhuma categoria de despesa cadastrada ainda." };
  }
  const nomesCategorias = categorias.map((c) => c.nome) as [string, ...string[]];

  const base64 = Buffer.from(await arquivo.arrayBuffer()).toString("base64");

  const documentoParaAnalise = ehPdf
    ? ({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      } as const)
    : ({
        type: "image",
        source: { type: "base64", media_type: arquivo.type as "image/jpeg" | "image/png" | "image/webp", data: base64 },
      } as const);

  const ItemSchema = z.object({
    descricao: z.string().describe("Nome do item/produto exatamente como está na nota (ex: Batata congelada, Nuggets, Refrigerante)"),
    unidade: z
      .string()
      .describe(
        "Código da coluna UNID, copiado EXATAMENTE caractere por caractere (ex: 'PC1', 'UN1', 'BD1', 'CX5', 'KG1'). Não interprete, não separe, não calcule nada — apenas transcreva o texto da célula.",
      ),
    quantidade: z
      .number()
      .describe(
        "Número da coluna QUANTIDADE da nota (não confundir com a coluna UNID, que fica ao lado). Use ponto decimal (ex: '6,3780' na nota vira 6.378). Não multiplique por nada — copie o número exatamente como está.",
      ),
    valorUnitario: z.number().describe("Valor unitário do item, em reais, apenas o número"),
    valorTotal: z.number().describe("Valor total da linha (quantidade x valor unitário), em reais"),
    pesoKgUnitario: z
      .number()
      .nullable()
      .describe(
        "Peso em quilos de UMA unidade/pacote individual do produto, se identificável na descrição (ex: descrição '...5X2,5KG' ou '...1KG' → 2.5 ou 1). NÃO multiplique pelo tamanho da caixa. Null se a descrição não indicar peso.",
      ),
    unidadesPorCaixa: z
      .number()
      .nullable()
      .describe(
        "Apenas um palpite de reserva — o sistema já calcula isso a partir do código da unidade. Se não tiver certeza, deixe null.",
      ),
    categoria: z.enum(nomesCategorias).describe("Categoria mais adequada para este item dentre as opções fornecidas"),
  });

  const NotaFiscalSchema = z.object({
    fornecedor: z.string().nullable().describe("Nome do fornecedor/emissor da nota, ou null se não identificado"),
    dataEmissao: z.string().nullable().describe("Data de emissão no formato YYYY-MM-DD, ou null se ilegível"),
    numeroNota: z.string().nullable().describe("Número da nota fiscal/recibo, exatamente como impresso, ou null se não identificado"),
    itens: z.array(ItemSchema).min(1).describe("Um item para cada produto/linha distinta da nota — não agrupe tudo em um só"),
  });

  const client = new Anthropic();

  let resposta;
  try {
    resposta = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            documentoParaAnalise,
            {
              type: "text",
              text: "Esta é uma nota fiscal (DANFE) de um restaurante (hamburgueria). Extraia também o número da nota fiscal (numeroNota), se houver.\n\nNa tabela 'DADOS DO PRODUTO/SERVIÇOS', leia CADA linha/item separadamente (ex: batata, bacon, queijo), extraindo com cuidado célula por célula — as colunas NCM/SH, CST, CFOP, UNID e QUANTIDADE ficam bem próximas umas das outras, não confunda os valores entre elas.\n\nA coluna UNID traz um código de letras + um número final (ex: 'PC1', 'UN1', 'BD1', 'CX5', 'CX2', 'CX6', 'KG1') — copie esse código EXATAMENTE como está impresso, caractere por caractere, no campo unidade. Não interprete nem separe o número — apenas copie o texto da célula.\n\nA coluna QUANTIDADE é um número separado (ex: '3,0000', '6,3780') — os números na nota usam vírgula como separador decimal (formato brasileiro); converta para ponto decimal nos campos numéricos (ex: '6,3780' vira 6.378).\n\nO peso do item, quando existir, normalmente já aparece por extenso na própria descrição do produto (ex: 'BATATA ... 5X2,5KG' ou 'BANHA ANIMAL AURORA 1KG') — extraia esse peso em pesoKgUnitario quando conseguir identificá-lo na descrição.",
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(NotaFiscalSchema) },
    });
  } catch (err) {
    return {
      status: "erro",
      mensagem: err instanceof Error ? `Erro ao chamar a IA: ${err.message}` : "Erro ao chamar a IA.",
    };
  }

  const dados = resposta.parsed_output;
  if (!dados) {
    return { status: "erro", mensagem: "A IA não conseguiu ler os dados da nota. Tente outra foto/arquivo." };
  }

  const itens: ItemNotaFiscal[] = dados.itens.map((item) => {
    const categoriaEncontrada = categorias.find((c) => c.nome === item.categoria)!;
    const { multiplicador, ehQuilo } = interpretarCodigoUnidade(item.unidade);
    const pesoDaDescricao = extrairPesoDaDescricao(item.descricao);
    return {
      descricao: item.descricao,
      quantidade: item.quantidade,
      unidade: item.unidade,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
      pesoKgUnitario: ehQuilo ? 1 : (pesoDaDescricao ?? item.pesoKgUnitario),
      unidadesPorCaixa: ehQuilo ? 1 : (multiplicador ?? item.unidadesPorCaixa),
      categoriaId: categoriaEncontrada.id,
      categoriaNome: categoriaEncontrada.nome,
    };
  });

  return {
    status: "ok",
    dados: {
      fornecedor: dados.fornecedor,
      dataEmissao: dados.dataEmissao,
      numeroNota: dados.numeroNota,
      itens,
    },
  };
}
