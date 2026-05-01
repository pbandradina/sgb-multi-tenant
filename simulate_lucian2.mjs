// Simula o cálculo de FMO para o Lucian com dados reais do banco
// equipe: Prontidão Azul, dataInicio: 22/Jan/2026
// Afastamentos: F em 16/Fev a 28/Fev, 01/Mar, 02/Mar

const INTERRUPT_SIGLAS = new Set(['F', 'LP', 'DS', 'LT', 'D', 'LTS', 'C', 'CFS', 'CAS', 'EAP', 'TAF']);
const PAUSE_SIGLAS = new Set(['PA', 'FMO', 'FO', 'AG', 'ME', 'EX', 'VD', 'AM', 'AZ']);
const CYCLE_EQUIPES = ["Prontidão Verde", "Prontidão Amarela", "Prontidão Azul"];
const CYCLE_REFERENCE_MS = new Date(2026, 0, 1).getTime();

function getProntidaoDoDia(date) {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((target - CYCLE_REFERENCE_MS) / (1000 * 60 * 60 * 24));
  const idx = ((diffDays % 3) + 3) % 3;
  return CYCLE_EQUIPES[idx];
}

function dateToYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MESES_ABREV = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
function formatDateBR(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const mes = MESES_ABREV[date.getMonth()];
  return `${d}${mes}`;
}

// Dados reais do Lucian
const equipe = "Prontidão Azul";
const dataInicio = new Date(2026, 0, 22); // 22/Jan/2026
const dataFim = new Date(2026, 2, 13);    // 13/Mar/2026

// Afastamentos reais (F = Férias, código interruptor)
// DB retorna com UTC offset (05:00), mas parseDateLocal extrai só a data
function parseDateFromDB(isoStr) {
  // "2026-02-16T05:00:00.000Z" → pega apenas a parte da data
  const dateStr = isoStr.split('T')[0];
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const afastamentosDB = [
  { tipo: 'F', dataInicio: parseDateFromDB('2026-03-01T05:00:00.000Z'), dataFim: parseDateFromDB('2026-03-01T05:00:00.000Z') },
  { tipo: 'F', dataInicio: parseDateFromDB('2026-03-02T05:00:00.000Z'), dataFim: parseDateFromDB('2026-03-02T05:00:00.000Z') },
  { tipo: 'F', dataInicio: parseDateFromDB('2026-02-16T05:00:00.000Z'), dataFim: parseDateFromDB('2026-02-16T05:00:00.000Z') },
  { tipo: 'F', dataInicio: parseDateFromDB('2026-02-17T05:00:00.000Z'), dataFim: parseDateFromDB('2026-02-17T05:00:00.000Z') },
  { tipo: 'F', dataInicio: parseDateFromDB('2026-02-18T05:00:00.000Z'), dataFim: parseDateFromDB('2026-02-18T05:00:00.000Z') },
  { tipo: 'F', dataInicio: parseDateFromDB('2026-02-19T05:00:00.000Z'), dataFim: parseDateFromDB('2026-02-19T05:00:00.000Z') },
  { tipo: 'F', dataInicio: parseDateFromDB('2026-02-20T05:00:00.000Z'), dataFim: parseDateFromDB('2026-02-20T05:00:00.000Z') },
  { tipo: 'F', dataInicio: parseDateFromDB('2026-02-21T05:00:00.000Z'), dataFim: parseDateFromDB('2026-02-21T05:00:00.000Z') },
  { tipo: 'F', dataInicio: parseDateFromDB('2026-02-22T05:00:00.000Z'), dataFim: parseDateFromDB('2026-02-22T05:00:00.000Z') },
  { tipo: 'F', dataInicio: parseDateFromDB('2026-02-23T05:00:00.000Z'), dataFim: parseDateFromDB('2026-02-23T05:00:00.000Z') },
  { tipo: 'F', dataInicio: parseDateFromDB('2026-02-24T05:00:00.000Z'), dataFim: parseDateFromDB('2026-02-24T05:00:00.000Z') },
  { tipo: 'F', dataInicio: parseDateFromDB('2026-02-25T05:00:00.000Z'), dataFim: parseDateFromDB('2026-02-25T05:00:00.000Z') },
  { tipo: 'F', dataInicio: parseDateFromDB('2026-02-26T05:00:00.000Z'), dataFim: parseDateFromDB('2026-02-26T05:00:00.000Z') },
  { tipo: 'F', dataInicio: parseDateFromDB('2026-02-27T05:00:00.000Z'), dataFim: parseDateFromDB('2026-02-27T05:00:00.000Z') },
  { tipo: 'F', dataInicio: parseDateFromDB('2026-02-28T05:00:00.000Z'), dataFim: parseDateFromDB('2026-02-28T05:00:00.000Z') },
];

// Construir mapa de afastamentos
const afastamentoNoDia = new Map();
for (const af of afastamentosDB) {
  for (let d = new Date(af.dataInicio); d <= af.dataFim; d.setDate(d.getDate() + 1)) {
    const chave = dateToYMD(d);
    if (!afastamentoNoDia.has(chave) || INTERRUPT_SIGLAS.has(af.tipo)) {
      afastamentoNoDia.set(chave, af.tipo);
    }
  }
}

// Dias de serviço da Prontidão Azul de 22/Jan a 13/Mar
const diasDeServico = [];
for (let d = new Date(dataInicio); d <= dataFim; d.setDate(d.getDate() + 1)) {
  if (getProntidaoDoDia(d) === equipe) {
    diasDeServico.push(new Date(d));
  }
}

console.log("=== Dias de serviço da Prontidão Azul (22/Jan a 13/Mar) ===");
diasDeServico.forEach((d, i) => {
  const chave = dateToYMD(d);
  const sigla = afastamentoNoDia.get(chave) || '-';
  console.log(`  ${i+1}. ${formatDateBR(d)} (${chave}) → afastamento: ${sigla}`);
});
console.log(`Total: ${diasDeServico.length} dias\n`);

// Calcular FMO com lógica atual (F interrompe)
console.log("=== Cálculo ATUAL (F interrompe o ciclo) ===");
{
  let fmoGeradas = 0;
  let cicloAtual = 0;
  let dataInicioConquista = null;
  const periodosConcessao = [];

  for (const data of diasDeServico) {
    const chave = dateToYMD(data);
    const sigla = afastamentoNoDia.get(chave);

    if (sigla && INTERRUPT_SIGLAS.has(sigla)) {
      console.log(`  ${formatDateBR(data)}: INTERRUPÇÃO (${sigla}) → ciclo zerado (estava em ${cicloAtual})`);
      cicloAtual = 0;
      dataInicioConquista = null;
    } else if (sigla && PAUSE_SIGLAS.has(sigla)) {
      console.log(`  ${formatDateBR(data)}: PAUSA (${sigla}) → ciclo mantido em ${cicloAtual}`);
    } else {
      if (cicloAtual === 0) dataInicioConquista = data;
      cicloAtual++;
      console.log(`  ${formatDateBR(data)}: serviço ${cicloAtual}/9 (desde ${formatDateBR(dataInicioConquista)})`);
      if (cicloAtual >= 9) {
        fmoGeradas++;
        periodosConcessao.push({
          numero: fmoGeradas,
          dataInicio: formatDateBR(dataInicioConquista),
          dataFim: formatDateBR(data),
        });
        console.log(`  *** FMO #${fmoGeradas} GERADA: ${formatDateBR(dataInicioConquista)} a ${formatDateBR(data)} ***`);
        cicloAtual = 0;
        dataInicioConquista = null;
      }
    }
  }

  console.log(`\nResultado atual: ${fmoGeradas} FMOs, ciclo atual: ${cicloAtual}/9`);
  periodosConcessao.forEach(p => console.log(`  FMO #${p.numero}: ${p.dataInicio} a ${p.dataFim}`));
}

// Verificar: quais dias de serviço da Azul caem no período de férias?
console.log("\n=== Dias de serviço Azul que caem nas férias (16/Fev a 02/Mar) ===");
const feriasInicio = new Date(2026, 1, 16);
const feriasFim = new Date(2026, 2, 2);
for (let d = new Date(feriasInicio); d <= feriasFim; d.setDate(d.getDate() + 1)) {
  if (getProntidaoDoDia(d) === equipe) {
    console.log(`  ${formatDateBR(d)} (${dateToYMD(d)}) é dia de serviço Azul → F interrompe`);
  }
}
