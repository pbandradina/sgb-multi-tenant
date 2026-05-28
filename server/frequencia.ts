/**
 * Gerador de Planilha de Controle de Frequência
 * Formato: igual ao modelo 1.CONTROLEDEFREQUÊNCIA2ºSGBABRIL_2026.xlsx
 *
 * Estrutura:
 *   Linha 1: POLÍCIA MILITAR
 *   Linha 2: DO | OPM | CÓDIGO DA OPM | MÊS | ANO | Nº DE PÁGINAS | PÁGINA Nº
 *   Linha 3: ESTADO DE SÃO PAULO | <nome quartel> | <código> | <mês> | <ano> | ...
 *   Linha 4: (vazia)
 *   Linha 5: Legenda
 *   Linha 6: (vazia)
 *   Linha 7: Posto/Grad | RE | (col C vazia) | NOME | DIAS (1..31) | DA | AA | OBSERVAÇÃO
 *   Linha 8: (números dos dias 1..N)
 *   Linhas 9+: um bombeiro por linha
 *
 * Colunas:
 *   A = Posto/Grad
 *   B = RE
 *   C = (col extra — na referência col C tem valor numérico, possivelmente turno/grupo)
 *   D = NOME
 *   E..AH = dias 1..31 (apenas os dias do mês)
 *   AI = (vazia — separador)
 *   AJ = DA  (fórmula)
 *   AK = AA  (fórmula)
 *   AL = OBSERVAÇÃO
 *
 * Legenda de valores por dia:
 *   3  = dia de serviço (prontidão 18-24h)
 *   A  = afastamento genérico (dia sem serviço)
 *   F  = Férias
 *   LP = Licença Prêmio
 *   FS = Falta ao Serviço
 *   (demais siglas do sistema → A)
 */

import ExcelJS from "exceljs";
import { getDb, parseDateLocal } from "./db.js";
import { bombeiros, afastamentos, quarteis, bombeiroProntidaoHistorico } from "../drizzle/schema.js";
import { and, eq } from "drizzle-orm";

const MESES_NOME = [
  "JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO",
  "JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO",
];

const CYCLE_EQUIPES = ["Prontidão Verde", "Prontidão Amarela", "Prontidão Azul"] as const;
const CYCLE_REFERENCE_MS = new Date(2026, 0, 1).getTime();

function getProntidaoDoDia(date: Date): string {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((target - CYCLE_REFERENCE_MS) / (1000 * 60 * 60 * 24));
  const idx = ((diffDays % 3) + 3) % 3;
  return CYCLE_EQUIPES[idx];
}

function dateToYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Mapeamento de siglas do sistema → valor na planilha
function siglaParaValor(sigla: string): string | number {
  if (sigla === "F")  return "F";
  if (sigla === "LP") return "LP";
  if (sigla === "FS") return "FS";
  // FMO, PA, AG, ME, EX, etc. → A (afastamento genérico)
  return "A";
}

// Retorna o valor para um dia específico de um bombeiro
function calcularValorDia(
  date: Date,
  equipeAtiva: string,
  afastamentosNoDia: Map<string, string>,
  trocasEntra: Set<string>,
  trocasSai: Set<string>,
): string | number {
  const chave = dateToYMD(date);
  const sigla = afastamentosNoDia.get(chave);

  // Afastamento registrado tem prioridade sobre qualquer outra regra
  if (sigla) {
    return siglaParaValor(sigla);
  }

  // Regime Administrativo: seg-sex = 1 (8h-18h), sáb/dom = A
  if (equipeAtiva === "Administrativo") {
    const diaSemana = date.getDay(); // 0=Dom, 6=Sáb
    if (diaSemana === 0 || diaSemana === 6) return "A";
    return 1; // dia útil
  }

  // Dia cedido por troca: bombeiro não trabalhou
  if (trocasSai.has(chave)) return "A";

  // Dia de serviço da prontidão do bombeiro (ou dia de troca que ele entrou)
  const prontidaoDoDia = getProntidaoDoDia(date);
  if (prontidaoDoDia === equipeAtiva || trocasEntra.has(chave)) {
    return 3; // 18-24h
  }

  // Dia sem serviço e sem afastamento → A (demais afastamentos)
  return "A";
}

export async function gerarPlanilhaFrequencia(
  quartelId: number,
  ano: number,
  mes: number, // 0-indexed (0=Jan, 11=Dez)
): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  // Buscar quartel
  const quartelRows = await db.select().from(quarteis).where(eq(quarteis.id, quartelId)).limit(1);
  const quartel = quartelRows[0];
  const nomeQuartel = quartel?.nome ?? "QUARTEL";

  // Buscar bombeiros do quartel ordenados por posto
  const POSTO_ORDEM: Record<string, number> = {
    "1º Sargento": 1, "2º Sargento": 2, "3º Sargento": 3, "Cabo": 4, "Soldado": 5,
  };
  const POSTO_ABREV: Record<string, string> = {
    "1º Sargento": "1º Sgt",
    "2º Sargento": "2º Sgt",
    "3º Sargento": "3º Sgt",
    "Cabo":        "Cb",
    "Soldado":     "Sd",
  };

  const bombeirosList = await db
    .select()
    .from(bombeiros)
    .where(and(eq(bombeiros.quartelId, quartelId), eq(bombeiros.ativo, true)));

  bombeirosList.sort((a, b) => {
    const oa = POSTO_ORDEM[a.posto] ?? 99;
    const ob = POSTO_ORDEM[b.posto] ?? 99;
    if (oa !== ob) return oa - ob;
    return (a.nomeGuerra ?? a.nome).localeCompare(b.nomeGuerra ?? b.nome);
  });

  // Buscar afastamentos do mês
  const primeiroDia = `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
  const ultimoDiaDate = new Date(ano, mes + 1, 0);
  const ultimoDia = dateToYMD(ultimoDiaDate);

  const todosAfastamentos = await db
    .select()
    .from(afastamentos)
    .where(eq(afastamentos.quartelId, quartelId));

  // Buscar trocas do mês (importar trocasServico)
  const { trocasServico } = await import("../drizzle/schema");
  const trocasMes = await db
    .select()
    .from(trocasServico)
    .where(
      and(
        eq(trocasServico.quartelId, quartelId),
      )
    );

  // Número de dias no mês
  const diasNoMes = ultimoDiaDate.getDate();

  // ─── Criar workbook ────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "SGB Sistema";
  wb.created = new Date();

  const ws = wb.addWorksheet("Controle de Frequência", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  // Larguras de colunas
  ws.getColumn("A").width = 12; // Posto/Grad
  ws.getColumn("B").width = 9;  // RE
  ws.getColumn("C").width = 4;  // (grupo/turno)
  ws.getColumn("D").width = 18; // Nome
  // Colunas de dias (E = col 5 até E+diasNoMes-1)
  for (let d = 1; d <= 31; d++) {
    const col = ws.getColumn(4 + d); // E=5, F=6, ...
    col.width = 4;
  }
  ws.getColumn(4 + 31 + 1).width = 2;  // separador AI
  ws.getColumn(4 + 31 + 2).width = 8;  // DA (AJ)
  ws.getColumn(4 + 31 + 3).width = 6;  // AA (AK)
  ws.getColumn(4 + 31 + 4).width = 20; // OBSERVAÇÃO (AL)

  // ─── Estilos ───────────────────────────────────────────────────────────────
  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  const titleFont: Partial<ExcelJS.Font> = { bold: true, size: 11 };
  const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: "center", vertical: "middle", wrapText: true };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" }, bottom: { style: "thin" },
    left: { style: "thin" }, right: { style: "thin" },
  };

  // Coluna final de dados (último dia do mês)
  const lastDayCol = 4 + diasNoMes; // ex: abril=30 → col 34 = AH
  const daCol = lastDayCol + 2;     // DA
  const aaCol = lastDayCol + 3;     // AA
  const obsCol = lastDayCol + 4;    // OBSERVAÇÃO
  const totalCols = obsCol;

  // ─── Linha 1: POLÍCIA MILITAR ─────────────────────────────────────────────
  ws.getRow(1).height = 18;
  ws.mergeCells(1, 1, 1, totalCols);
  const r1 = ws.getCell(1, 1);
  r1.value = "POLÍCIA MILITAR";
  r1.font = { ...titleFont, size: 13 };
  r1.alignment = centerAlign;

  // ─── Linha 2: cabeçalho de campos ─────────────────────────────────────────
  ws.getRow(2).height = 16;
  const r2Labels: Array<[number, string]> = [
    [1, "DO"], [11, "OPM"], [25, "CÓDIGO DA OPM"], [daCol, "MÊS"], [aaCol, "ANO"],
  ];
  for (const [col, label] of r2Labels) {
    const c = ws.getCell(2, col);
    c.value = label;
    c.font = { bold: true, size: 9 };
    c.alignment = centerAlign;
  }

  // ─── Linha 3: valores do cabeçalho ────────────────────────────────────────
  ws.getRow(3).height = 18;
  ws.getCell(3, 1).value = "ESTADO DE SÃO PAULO";
  ws.getCell(3, 1).font = titleFont;
  ws.getCell(3, 11).value = nomeQuartel.toUpperCase();
  ws.getCell(3, 11).font = titleFont;
  ws.getCell(3, daCol).value = MESES_NOME[mes];
  ws.getCell(3, daCol).font = { bold: true, size: 10 };
  ws.getCell(3, aaCol).value = ano;
  ws.getCell(3, aaCol).font = { bold: true, size: 10 };

  // ─── Linha 4: vazia ───────────────────────────────────────────────────────
  ws.getRow(4).height = 6;

  // ─── Linha 5: legenda ─────────────────────────────────────────────────────
  ws.getRow(5).height = 28;
  ws.mergeCells(5, 1, 5, totalCols);
  const r5 = ws.getCell(5, 1);
  r5.value = '"0" INFERIOR A 8h / "1" - IGUAL OU SUPERIOR 8h E INFERIOR A 12h / "2" - IGUAL OU SUPERIOR 12h E INFERIOR A 18h / "3" - IGUAL OU SUPERIOR 18h E IGUAL OU INFERIOR A 24h / F - FÉRIAS / LP - LICENÇA PRÊMIO / FS - FALTA AO SERVIÇO / A - DEMAIS AFASTAMENTOS';
  r5.font = { size: 8, italic: true };
  r5.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

  // ─── Linha 6: vazia ───────────────────────────────────────────────────────
  ws.getRow(6).height = 6;

  // ─── Linha 7: cabeçalho de colunas ────────────────────────────────────────
  ws.getRow(7).height = 22;
  const r7Headers: Array<[number, string]> = [
    [1, "Posto/Grad"], [2, "RE"], [4, "NOME"], [5, "DIAS"],
    [daCol, "TOTAL"], [obsCol, "OBSERVAÇÃO"],
  ];
  for (const [col, label] of r7Headers) {
    const c = ws.getCell(7, col);
    c.value = label;
    c.font = headerFont;
    c.fill = headerFill;
    c.alignment = centerAlign;
    c.border = thinBorder;
  }
  // Mesclar "DIAS" sobre todos os dias
  ws.mergeCells(7, 5, 7, lastDayCol);
  ws.getCell(7, 5).value = "DIAS";
  ws.getCell(7, 5).font = headerFont;
  ws.getCell(7, 5).fill = headerFill;
  ws.getCell(7, 5).alignment = centerAlign;
  ws.getCell(7, 5).border = thinBorder;
  // Mesclar "TOTAL" sobre DA e AA
  ws.mergeCells(7, daCol, 7, aaCol);
  ws.getCell(7, daCol).value = "TOTAL";
  ws.getCell(7, daCol).font = headerFont;
  ws.getCell(7, daCol).fill = headerFill;
  ws.getCell(7, daCol).alignment = centerAlign;
  ws.getCell(7, daCol).border = thinBorder;

  // ─── Linha 8: números dos dias ────────────────────────────────────────────
  ws.getRow(8).height = 16;
  ws.getCell(8, 1).value = "Posto/Grad";
  ws.getCell(8, 2).value = "RE";
  ws.getCell(8, 4).value = "NOME";
  for (let d = 1; d <= diasNoMes; d++) {
    const c = ws.getCell(8, 4 + d);
    c.value = d;
    c.font = { bold: true, size: 9 };
    c.alignment = centerAlign;
    c.border = thinBorder;
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
  }
  ws.getCell(8, daCol).value = "DA";
  ws.getCell(8, daCol).font = { bold: true, size: 9 };
  ws.getCell(8, daCol).alignment = centerAlign;
  ws.getCell(8, daCol).border = thinBorder;
  ws.getCell(8, aaCol).value = "AA";
  ws.getCell(8, aaCol).font = { bold: true, size: 9 };
  ws.getCell(8, aaCol).alignment = centerAlign;
  ws.getCell(8, aaCol).border = thinBorder;
  ws.getCell(8, obsCol).value = "OBSERVAÇÃO";
  ws.getCell(8, obsCol).font = { bold: true, size: 9 };
  ws.getCell(8, obsCol).alignment = centerAlign;
  ws.getCell(8, obsCol).border = thinBorder;

  // ─── Linhas de bombeiros ───────────────────────────────────────────────────
  for (let bi = 0; bi < bombeirosList.length; bi++) {
    const bom = bombeirosList[bi];
    const rowNum = 9 + bi;
    ws.getRow(rowNum).height = 16;

    // Construir mapa de afastamentos deste bombeiro no mês
    const afNoDia = new Map<string, string>();
    for (const af of todosAfastamentos) {
      if (af.bombeiroId !== bom.id) continue;
      const ini = parseDateLocal(af.dataInicio as any);
      const fim = parseDateLocal(af.dataFim as any);
      for (let d = new Date(ini); d <= fim; d.setDate(d.getDate() + 1)) {
        const chave = dateToYMD(d);
        if (!afNoDia.has(chave)) afNoDia.set(chave, af.tipo);
      }
    }

    // Trocas deste bombeiro
    const trocasEntraSet = new Set<string>(
      trocasMes.filter(t => t.bombeiroEntraId === bom.id).map(t => t.dataTroca as string)
    );
    const trocasSaiSet = new Set<string>(
      trocasMes.filter(t => t.bombeireSaiId === bom.id).map(t => t.dataTroca as string)
    );

    // Equipe ativa no mês (usa equipe atual do bombeiro, sem histórico complexo)
    const equipeAtiva = bom.equipe;

    // Posto abreviado
    const postoAbrev = POSTO_ABREV[bom.posto] ?? bom.posto;
    const nomeGuerra = bom.nomeGuerra?.trim() || bom.nome;

    // Preencher células
    ws.getCell(rowNum, 1).value = postoAbrev;
    ws.getCell(rowNum, 2).value = ""; // RE não disponível no cadastro atual
    ws.getCell(rowNum, 3).value = ""; // col C (turno/grupo — deixar vazio)
    ws.getCell(rowNum, 4).value = nomeGuerra;

    // Dias do mês
    for (let d = 1; d <= diasNoMes; d++) {
      const date = new Date(ano, mes, d);
      const valor = calcularValorDia(date, equipeAtiva, afNoDia, trocasEntraSet, trocasSaiSet);
      const c = ws.getCell(rowNum, 4 + d);
      c.value = valor === "" ? null : valor;
      c.alignment = centerAlign;
      c.border = thinBorder;
      c.font = { size: 9 };

      // Colorir: 3 = azul claro, A = cinza, F/LP = amarelo, FS = vermelho
      if (valor === 3) {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBDD7EE" } };
      } else if (valor === "F" || valor === "LP") {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
      } else if (valor === "FS") {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } };
      } else if (valor === "A") {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
      }
    }

    // Fórmulas DA e AA
    // DA = soma ponderada: 0*n0 + 1*n1 + 2*n2 + 3*n3
    // AA = contagem de dias trabalhados (qualquer valor numérico)
    const firstDayColLetter = colLetter(5);
    const lastDayColLetter = colLetter(4 + diasNoMes);
    const daCell = ws.getCell(rowNum, daCol);
    const aaCell = ws.getCell(rowNum, aaCol);

    daCell.value = {
      formula: `COUNTIF($${firstDayColLetter}${rowNum}:$${lastDayColLetter}${rowNum},"=0")*0+COUNTIF($${firstDayColLetter}${rowNum}:$${lastDayColLetter}${rowNum},"=1")*1+COUNTIF($${firstDayColLetter}${rowNum}:$${lastDayColLetter}${rowNum},"=2")*2+COUNTIF($${firstDayColLetter}${rowNum}:$${lastDayColLetter}${rowNum},"=3")*3`,
    };
    aaCell.value = {
      formula: `COUNTIF($${firstDayColLetter}${rowNum}:$${lastDayColLetter}${rowNum},"=0")*1+COUNTIF($${firstDayColLetter}${rowNum}:$${lastDayColLetter}${rowNum},"=1")*1+COUNTIF($${firstDayColLetter}${rowNum}:$${lastDayColLetter}${rowNum},"=2")*1+COUNTIF($${firstDayColLetter}${rowNum}:$${lastDayColLetter}${rowNum},"=3")*1`,
    };
    daCell.font = { bold: true, size: 9 };
    daCell.alignment = centerAlign;
    daCell.border = thinBorder;
    aaCell.font = { bold: true, size: 9 };
    aaCell.alignment = centerAlign;
    aaCell.border = thinBorder;

    // Observação
    ws.getCell(rowNum, obsCol).value = "VER TABELA ABAIXO";
    ws.getCell(rowNum, obsCol).font = { size: 8, italic: true };
    ws.getCell(rowNum, obsCol).alignment = { horizontal: "left", vertical: "middle" };

    // Bordas nas colunas de identificação
    for (const col of [1, 2, 3, 4]) {
      ws.getCell(rowNum, col).border = thinBorder;
      ws.getCell(rowNum, col).font = { size: 9 };
    }
  }

  // ─── Congelar painel ──────────────────────────────────────────────────────
  ws.views = [{ state: "frozen", xSplit: 4, ySplit: 8 }];

  // ─── Gerar buffer ─────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Converte número de coluna (1-based) para letra(s) Excel
function colLetter(col: number): string {
  let result = "";
  while (col > 0) {
    const rem = (col - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    col = Math.floor((col - 1) / 26);
  }
  return result;
}
