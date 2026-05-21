// Simulação do ciclo FMO do Cb Alain
// Equipe: Prontidão Verde | dataInicio: 18/Fev/2026

// Prontidão Verde: referência 22/Jan/2026 é Verde (dia 0)
// Ciclo: Verde=0, Amarela=1, Azul=2 (cada 3 dias)
// Verde cai quando (diff_dias % 3 === 0)

function getProntidao(date) {
  const ref = new Date(2026, 0, 22); // 22/Jan/2026 = Verde
  const diff = Math.floor((date - ref) / (1000 * 60 * 60 * 24));
  const mod = ((diff % 3) + 3) % 3;
  if (mod === 0) return 'Verde';
  if (mod === 1) return 'Amarela';
  return 'Azul';
}

function fmt(d) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

// Dados do Alain
const dataInicio = new Date(2026, 1, 18); // 18/Fev
const equipe = 'Verde';

// Afastamentos (tipo → [ini, fim])
const afastamentos = [
  // Férias: 01/Fev a 14/Fev (mas dataInicio é 18/Fev, então não importam)
  // FMO usadas:
  { tipo: 'FMO', ini: new Date(2026, 2, 23), fim: new Date(2026, 2, 23) }, // 23/Mar
  { tipo: 'FMO', ini: new Date(2026, 3, 19), fim: new Date(2026, 3, 19) }, // 19/Abr
];

// Trocas onde SAI (cede o dia — não conta no ciclo)
const diasCedidos = new Set(['2026-05-01']); // 01/Mai — sai para Cb Vieira

const INTERRUPT = new Set(['F','LP','DS','LT','D','LTS','C','CFS','CAS','EAP','TAF']);
const PAUSE = new Set(['PA','FMO','FO','AG','ME','EX','VD','AM','AZ']);

// Construir mapa afastamento por dia
const afMap = new Map();
for (const af of afastamentos) {
  for (let d = new Date(af.ini); d <= af.fim; d.setDate(d.getDate() + 1)) {
    const k = ymd(d);
    if (!afMap.has(k) || INTERRUPT.has(af.tipo)) afMap.set(k, af.tipo);
  }
}

// Simular ciclo
const hoje = new Date(2026, 4, 21); // 21/Mai/2026 (hoje simulado)
let ciclo = 0;
let inicioConquista = null;
let fmoGeradas = 0;

console.log('\n=== SIMULAÇÃO CICLO FMO — Cb Alain (Verde, inicio 18/Fev) ===\n');
console.log('Data       | Pront | Cedido | Afastamento | Ciclo | Ação');
console.log('-----------|-------|--------|-------------|-------|-----');

for (let d = new Date(dataInicio); d <= hoje; d.setDate(d.getDate() + 1)) {
  const k = ymd(d);
  const pront = getProntidao(d);
  if (pront !== equipe) continue; // não é dia de serviço da Verde

  const cedido = diasCedidos.has(k);
  if (cedido) {
    console.log(`${fmt(d)} | Verde | SIM    |             | ${ciclo}     | DIA CEDIDO (não conta)`);
    continue;
  }

  const sigla = afMap.get(k) ?? '';
  let acao = '';

  if (sigla && INTERRUPT.has(sigla)) {
    acao = `INTERRUPÇÃO (${sigla}) → ciclo zerado`;
    ciclo = 0;
    inicioConquista = null;
  } else if (sigla && PAUSE.has(sigla)) {
    acao = `PAUSA (${sigla}) → ciclo mantido`;
  } else {
    if (ciclo === 0) inicioConquista = new Date(d);
    ciclo++;
    acao = `serviço válido → ciclo=${ciclo}`;
    if (ciclo >= 9) {
      fmoGeradas++;
      acao += ` → FMO #${fmoGeradas} GERADA! (${fmt(inicioConquista)} a ${fmt(d)})`;
      ciclo = 0;
      inicioConquista = null;
    }
  }

  console.log(`${fmt(d)} | Verde | NÃO    | ${sigla.padEnd(11)} | ${ciclo}     | ${acao}`);
}

console.log(`\n=== RESULTADO ===`);
console.log(`FMO geradas: ${fmoGeradas}`);
console.log(`Ciclo atual: ${ciclo}/9`);
console.log(`\nEsperado pelo usuário:`);
console.log(`Após FMO em 19/Abr (ciclo 17Mar-13Abr):`);
console.log(`16/Abr - 22/Abr - 25/Abr - 28/Abr - (01/Mai cedido) - 04/Mai - 07/Mai - 10/Mai - 13/Mai - 16/Mai = ciclo fecha em 16/Mai`);
