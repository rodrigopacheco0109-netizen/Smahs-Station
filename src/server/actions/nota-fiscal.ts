"use server";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getCategoriasDespesa } from "./despesas";

export interface DadosExtraidosNotaFiscal {
  descricao: string;
  valor: number;
  categoriaId: string;
  categoriaNome: string;
  dataEmissao: string | null;
  fornecedor: string | null;
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

  const NotaFiscalSchema = z.object({
    descricao: z.string().describe("Descrição curta da despesa: fornecedor + o que foi comprado"),
    valor: z.number().describe("Valor total da nota, em reais, apenas o número"),
    categoria: z.enum(nomesCategorias).describe("Categoria mais adequada dentre as opções fornecidas"),
    dataEmissao: z.string().nullable().describe("Data de emissão no formato YYYY-MM-DD, ou null se ilegível"),
    fornecedor: z.string().nullable().describe("Nome do fornecedor/emissor, ou null se não identificado"),
  });

  const client = new Anthropic();

  let resposta;
  try {
    resposta = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            documentoParaAnalise,
            {
              type: "text",
              text: "Esta é uma nota fiscal ou recibo de despesa de um restaurante (hamburgueria). Leia o documento e extraia os dados pedidos.",
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

  const categoriaEncontrada = categorias.find((c) => c.nome === dados.categoria)!;

  return {
    status: "ok",
    dados: {
      descricao: dados.descricao,
      valor: dados.valor,
      categoriaId: categoriaEncontrada.id,
      categoriaNome: categoriaEncontrada.nome,
      dataEmissao: dados.dataEmissao,
      fornecedor: dados.fornecedor,
    },
  };
}
