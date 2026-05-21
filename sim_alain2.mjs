// Simulação CORRIGIDA do ciclo FMO do Cb Alain
// Equipe: Prontidão Verde | dataInicio: 18/Fev/2026
// Referência: 01/Jan/2026 = Verde

const CYCLE_EQUIPES = ['Prontidão Verde', 'Prontidão Amarela', 'Prontidão Azul'];
const REF = new Date(2026, 0, 1).getTime();

function getPront(d) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((t - REF) / 86400000);
  return CYCLE_EQUIPES[((diff % 3) + 3) % 3];
}

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}

function fmtBR(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

const INTERRUPT = new Set(['F','LP','DS','LT','D','LTS','C','CFS','CAS','EAP','TAF']);
const PAUSE = new Set(['PA','FMO','FO','AG','ME','EX','VD','AM','AZ']);

// Afastamentos reais do Alain
const afastamentos = [
  { tipo: 'FMO', ini: new Date(2026, 2, 23), fim: new Date(2026, 2, 23) }, // 23/Mar — FMO usada
  { tipo: 'FMO', ini: new Date(2026, 3, 19), fim: new Date(2026, 3, 19) }, // 19/Abr — FMO usada
];

// Trocas onde SAI (cede o dia)
const diasCedidos = new Set(['2026-05-01']); // 01/Mai — sai para Cb Vieira

// Construir mapa afastamento por dia
const afMap = new Map();
for (const af of afastamentos) {
  for (let d = new Date(af.ini); d <= af.fim; d.setDate(d.getDate() + 1)) {
    const k = ymd(d);
    if (!afMap.has(k) || INTERRUPT.has(af.tipo)) afMap.set(k, af.tipo);
  }
}

const dataInicio = new Date(2026, 1, 18); // 18/Fev
const equipe = 'Prontidão Verde';
const hoje = new Date(2026, 4, 21); // 21/Mai/2026

let ciclo = 0;
let inicioConquista = null;
let fmoGeradas = 0;

console.log('\n=== SIMULAÇÃO CICLO FMO — Cb Alain (Verde, inicio 18/Fev) ===');
console.log('Data  | Afastamento | Ciclo | Ação');
console.log('------|-------------|-------|-----');

for (let d = new Date(dataInicio); d <= hoje; d.setDate(d.getDate() + 1)) {
  const k = ymd(d);
  if (getPront(d) !== equipe) continue;

  const cedido = diasCedidos.has(k);
  if (cedido) {
    console.log(`${fmtBR(d)}   | CEDIDO      | ${ciclo}     | dia cedido (não conta)`);
    continue;
  }

  const sigla = afMap.get(k) ?? '';

  if (sigla && INTERRUPT.has(sigla)) {
    ciclo = 0;
    inicioConquista = null;
    console.log(`${fmtBR(d)}   | ${sigla.padEnd(11)} | ${ciclo}     | INTERRUPÇÃO → ciclo zerado`);
  } else if (sigla && PAUSE.has(sigla)) {
    console.log(`${fmtBR(d)}   | ${sigla.padEnd(11)} | ${ciclo}     | PAUSA → ciclo mantido`);
  } else {
    if (ciclo === 0) inicioConquista = new Date(d);
    ciclo++;
    let acao = `serviço válido → ciclo=${ciclo}`;
    if (ciclo >= 9) {
      fmoGeradas++;
      acao += ` → FMO #${fmoGeradas} GERADA! (${fmtBR(inicioConquista)} a ${fmtBR(d)})`;
      ciclo = 0;
      inicioConquista = null;
    }
    console.log(`${fmtBR(d)}   | ${sigla.padEnd(11)} | ${ciclo}     | ${acao}`);
  }
}

console.log(`\n=== RESULTADO ===`);
console.log(`FMO geradas: ${fmoGeradas}`);
console.log(`Ciclo atual: ${ciclo}/9`);
console.log(`\nEsperado pelo usuário:`);
console.log(`Ciclo 2: 17/Mar a 13/Abr → FMO em 19/Abr`);
console.log(`Ciclo 3: 16/Abr - 22/Abr - 25/Abr - 28/Abr - (01/Mai cedido) - 04/Mai - 07/Mai - 10/Mai - 13/Mai - 16/Mai`);
