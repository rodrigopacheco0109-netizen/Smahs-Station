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

// Códigos de unidade como "CX5", "PC1", "UN1" trazem o multiplicador de
// pacotes/unidades embutido no próprio código (letras + número final). Isso é
// texto literal da nota, então extrair por regex é bem mais confiável do que
// pedir para o modelo "calcular" esse número à parte (ele já confundiu com a
// quantidade pedida em testes reais).
function extrairMultiplicadorDoCodigoUnidade(unidade: string): number | null {
  const match = unidade.trim().match(/^[A-Za-zÀ-ÿ]+(\d+)$/);
  return match ? Number(match[1]) : null;
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
    quantidade: z
      .number()
      .describe(
        "Quantidade comprada deste item, exatamente como está na coluna de quantidade da nota. Para itens vendidos em caixa, é o número de CAIXAS pedidas — não multiplique por nada, apenas copie o número da nota.",
      ),
    unidade: z.string().describe("Unidade/tipo conforme a nota, ex: UN, PC, CX, KG, L, PCT — copie como aparece"),
    valorUnitario: z.number().describe("Valor unitário do item, em reais, apenas o número"),
    valorTotal: z.number().describe("Valor total da linha (quantidade x valor unitário), em reais"),
    pesoKgUnitario: z
      .number()
      .nullable()
      .describe(
        "Peso em quilos de UM PACOTE/UNIDADE INDIVIDUAL do produto — NÃO da caixa inteira. Ex: se a nota diz 'pacote de 2,5kg' e vêm 5 pacotes por caixa, use 2.5 (não 12.5). Somente se a nota indicar peso explicitamente; null caso contrário.",
      ),
    unidadesPorCaixa: z
      .number()
      .nullable()
      .describe(
        "Quando a unidade for caixa (CX) e a nota indicar quantos pacotes/unidades individuais vêm dentro de cada caixa (ex: 'CX5' = 5 pacotes por caixa), copie esse número aqui, sem multiplicar por nada. Null se não for vendido em caixa ou a nota não indicar essa quebra.",
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
              text: "Esta é uma nota fiscal ou recibo de despesa de um restaurante (hamburgueria). Extraia também o número da nota fiscal/recibo (numeroNota), se houver.\n\nLeia o documento e extraia CADA item/produto da nota separadamente (ex: batata, nuggets, refrigerante), com quantidade, unidade/tipo, valor unitário, valor total, peso por unidade (se indicado) e categoria de cada um — não junte tudo em um único item.\n\nAtenção especial a itens vendidos em caixa (CX): a coluna de unidade/tipo costuma trazer códigos como 'CX5', 'PC1', 'UN1', onde o número final é o multiplicador de pacotes por caixa (CX5 = 5 pacotes por caixa; PC1/UN1 = 1, unidade avulsa). Copie o código de unidade exatamente como está (ex: 'CX5'), e a quantidade continua sendo o número de caixas pedidas — não multiplique nada você mesmo. Exemplo: nota de batata congelada com pacote de 2,5kg, código de unidade 'CX5' e 3 caixas pedidas, deve ser lido como: quantidade=3, unidade='CX5', pesoKgUnitario=2.5 (o peso do pacote, não da caixa).",
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
    const multiplicadorDoCodigo = extrairMultiplicadorDoCodigoUnidade(item.unidade);
    return {
      descricao: item.descricao,
      quantidade: item.quantidade,
      unidade: item.unidade,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
      pesoKgUnitario: item.pesoKgUnitario,
      unidadesPorCaixa: multiplicadorDoCodigo ?? item.unidadesPorCaixa,
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
