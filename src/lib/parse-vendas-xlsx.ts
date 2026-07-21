import ExcelJS from "exceljs";
import JSZip from "jszip";

function numeroParaColuna(n: number): string {
  let s = "";
  let resto = n;
  while (resto > 0) {
    const rem = (resto - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    resto = Math.floor((resto - 1) / 26);
  }
  return s;
}

/**
 * Alguns exportadores de PDV (ex: Smash Dom) geram XLSX válidos mas sem os
 * atributos `r` (referência de linha/célula) em `<row>`/`<c>` — opcionais
 * pela especificação OOXML, mas o exceljs exige explicitamente e quebra com
 * "Invalid row number in model" sem eles. Reescreve o XML da planilha
 * adicionando essas referências pela ordem em que aparecem, sem alterar
 * nenhum dado.
 */
async function repararReferenciasSeNecessario(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const planilhas = Object.keys(zip.files).filter((nome) => /^xl\/worksheets\/sheet\d+\.xml$/.test(nome));

  let precisaReparo = false;
  for (const caminho of planilhas) {
    const xml = await zip.file(caminho)!.async("string");
    if (!/<row[^>]*\sr="/.test(xml)) {
      precisaReparo = true;
      break;
    }
  }
  if (!precisaReparo) return buffer;

  for (const caminho of planilhas) {
    const arquivo = zip.file(caminho)!;
    const xml = await arquivo.async("string");
    let numeroLinha = 0;
    const xmlCorrigido = xml.replace(/<row(\s[^>]*)?>([\s\S]*?)<\/row>/g, (_match, atributosLinha, conteudo) => {
      numeroLinha++;
      let numeroColuna = 0;
      const conteudoCorrigido = conteudo.replace(/<c(\s[^>]*)?>/g, (_cellMatch: string, atributosCelula?: string) => {
        numeroColuna++;
        const ref = `${numeroParaColuna(numeroColuna)}${numeroLinha}`;
        const resto = (atributosCelula ?? "").trim();
        return `<c r="${ref}"${resto ? ` ${resto}` : ""}>`;
      });
      const restoLinha = (atributosLinha ?? "").trim();
      return `<row r="${numeroLinha}"${restoLinha ? ` ${restoLinha}` : ""}>${conteudoCorrigido}</row>`;
    });
    zip.file(caminho, xmlCorrigido);
  }

  const novoBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return novoBuffer;
}

export interface VendaProduto {
  nome: string;
  quantidade: number;
  totalVenda: number;
  ticketMedio: number;
  totalSemTaxa: number;
  totalTaxa: number;
  totalDesconto: number;
}

export interface VendaSessao {
  data: Date;
  produtos: VendaProduto[];
}

const PREFIXOS_IGNORADOS = ["Local", "Grupo", "Total"];

function parseDataSessao(texto: string, ano: number): Date {
  const match = texto.match(/(\d{2})\/(\d{2})/);
  if (!match) {
    throw new Error(`Não foi possível extrair a data de "${texto}"`);
  }
  const [, dia, mes] = match;
  return new Date(ano, Number(mes) - 1, Number(dia));
}

function parseMoeda(valor: unknown): number {
  if (typeof valor === "number") return valor;
  if (typeof valor !== "string") return 0;
  const limpo = valor.replace(/R\$\s?/g, "").trim().replace(/\./g, "").replace(",", ".");
  const num = Number(limpo);
  return Number.isNaN(num) ? 0 : num;
}

/**
 * Formato "por sessão/local" (relatório do PDV SysCashPay — Smash Club):
 * blocos repetidos de "Sessão : DD/MM-DIASEMANA" / "Local : ..." /
 * cabeçalho / linhas de produto / "Total Local" / "Total Sessão", um bloco
 * por dia. O ano não vem no relatório — assume-se o ano corrente.
 */
async function parseSessoesPorDia(worksheet: ExcelJS.Worksheet, ano: number): Promise<VendaSessao[]> {
  const sessoes: VendaSessao[] = [];
  let sessaoAtual: VendaSessao | null = null;

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const a = row.getCell(1).value;
    if (typeof a === "string" && a.trim().startsWith("Sessão")) {
      sessaoAtual = { data: parseDataSessao(a, ano), produtos: [] };
      sessoes.push(sessaoAtual);
      return;
    }
    if (typeof a === "string" && PREFIXOS_IGNORADOS.some((p) => a.trim().startsWith(p))) {
      return;
    }
    if (!sessaoAtual) return;

    const nome = row.getCell(2).value;
    const venda = row.getCell(4).value;
    if (!nome || typeof venda !== "number") return;

    sessaoAtual.produtos.push({
      nome: String(nome).trim(),
      quantidade: venda,
      totalVenda: Number(row.getCell(5).value ?? 0),
      ticketMedio: Number(row.getCell(6).value ?? 0),
      totalSemTaxa: Number(row.getCell(7).value ?? 0),
      totalTaxa: Number(row.getCell(8).value ?? 0),
      totalDesconto: Number(row.getCell(9).value ?? 0),
    });
  });

  return sessoes;
}

const LINHAS_IGNORADAS_TABELA_PLANA = ["outras despesas, descontos e frete", "total:"];

/**
 * Formato "tabela plana" (relatório da Smash Dom — sistema Crl Automação):
 * uma única tabela (Cod, Produto, Custo un, Valor un, Vendidos, Custo,
 * Valor, Lucro, Lucro %, CMV %) sem data — o período é informado por quem
 * sobe o arquivo. Valores vêm como texto "R$ X,XX". Variações de
 * modificador (ex: "BATATA FRITA - SIM MAIONESE") são somadas sob o nome
 * base (antes do " - ").
 */
function parseTabelaPlana(worksheet: ExcelJS.Worksheet, dataReferencia: Date): VendaSessao[] {
  const porNomeBase = new Map<string, { quantidade: number; totalVenda: number }>();

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const nome = row.getCell(2).value;
    const vendidos = row.getCell(5).value;
    if (!nome || typeof vendidos !== "number") return;
    const nomeStr = String(nome).trim();
    if (LINHAS_IGNORADAS_TABELA_PLANA.includes(nomeStr.toLowerCase())) return;

    const nomeBase = nomeStr.split(" - ")[0].trim();
    const valorTotal = parseMoeda(row.getCell(7).value);

    const atual = porNomeBase.get(nomeBase) ?? { quantidade: 0, totalVenda: 0 };
    atual.quantidade += vendidos;
    atual.totalVenda += valorTotal;
    porNomeBase.set(nomeBase, atual);
  });

  const produtos: VendaProduto[] = [...porNomeBase.entries()].map(([nome, v]) => ({
    nome,
    quantidade: v.quantidade,
    totalVenda: v.totalVenda,
    ticketMedio: v.quantidade > 0 ? v.totalVenda / v.quantidade : 0,
    totalSemTaxa: v.totalVenda,
    totalTaxa: 0,
    totalDesconto: 0,
  }));

  return [{ data: dataReferencia, produtos }];
}

export type FormatoVendas = "sessoes" | "tabela_plana";

function detectarFormato(worksheet: ExcelJS.Worksheet): FormatoVendas {
  for (let i = 1; i <= Math.min(5, worksheet.rowCount); i++) {
    const a = worksheet.getRow(i).getCell(1).value;
    if (typeof a === "string" && a.trim() === "Cod") return "tabela_plana";
    if (typeof a === "string" && a.trim().startsWith("Sessão")) return "sessoes";
  }
  return "sessoes";
}

export async function parseVendas(
  buffer: Buffer,
  opts: { ano?: number; dataReferencia?: Date } = {}
): Promise<VendaSessao[]> {
  const bufferCorrigido = await repararReferenciasSeNecessario(buffer);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bufferCorrigido as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Planilha vazia ou sem abas.");
  }

  const formato = detectarFormato(worksheet);
  if (formato === "tabela_plana") {
    if (!opts.dataReferencia) {
      throw new Error(
        "Esse arquivo não tem data — informe a data de referência para essa importação."
      );
    }
    return parseTabelaPlana(worksheet, opts.dataReferencia);
  }
  return parseSessoesPorDia(worksheet, opts.ano ?? new Date().getFullYear());
}
