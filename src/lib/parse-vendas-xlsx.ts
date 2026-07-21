import ExcelJS from "exceljs";

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

/**
 * Formato do relatório do PDV (SysCashPay): blocos repetidos de
 * "Sessão : DD/MM-DIASEMANA" / "Local : ..." / cabeçalho / linhas de produto
 * / "Total Local" / "Total Sessão", um bloco por dia. O ano não vem no
 * relatório — assume-se o ano corrente no momento da importação.
 */
export async function parseVendasXlsx(buffer: Buffer, ano = new Date().getFullYear()): Promise<VendaSessao[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Planilha vazia ou sem abas.");
  }

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
