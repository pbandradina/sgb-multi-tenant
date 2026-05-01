// Verificar: período de concessão = 24 dias corridos a partir do dataInicio?
// Lucian: dataInicio=22/Jan, 22/Jan + 24 dias = 15/Fev
// Isso explicaria "22JAN a 15FEV"

const MESES_ABREV = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
function formatDateBR(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const mes = MESES_ABREV[date.getMonth()];
  return `${d}${mes}`;
}

// dataInicio: 22/Jan/2026
const dataInicio = new Date(2026, 0, 22);

// Período de 24 dias corridos (3 ciclos × 3 equipes × 8 dias? ou 9 serviços × ~2.67 dias/serviço?)
// 9 serviços × 3 dias/ciclo = 27 dias corridos
// Mas 22/Jan + 26 dias = 17/Fev (que é o 9º serviço)
// 22/Jan + 24 dias = 15/Fev

// Verificar: talvez o período de concessão seja calculado como:
// dataInicio do ciclo + (9 * 3 - 1) dias = dataInicio + 26 dias
// Mas o usuário diz que é 22JAN a 15FEV = 24 dias

// Outra hipótese: o período de concessão é dataInicio do 1º serviço a dataInicio do 1º serviço + 24 dias
// 22/Jan + 24 dias = 15/Fev ✓

console.log("22/Jan + 24 dias =", formatDateBR(new Date(2026, 0, 22 + 24)));
console.log("22/Jan + 25 dias =", formatDateBR(new Date(2026, 0, 22 + 25)));
console.log("22/Jan + 26 dias =", formatDateBR(new Date(2026, 0, 22 + 26)));
console.log("22/Jan + 27 dias =", formatDateBR(new Date(2026, 0, 22 + 27)));

// Hipótese: período de concessão = 9 serviços × 3 dias/ciclo = 27 dias corridos, mas começa no dataInicio
// e vai até dataInicio + 27 - 1 = dataInicio + 26 dias
// 22/Jan + 26 = 17/Fev (mas usuário diz 15/Fev)

// Outra hipótese: o período de concessão é fixo de 24 dias corridos
// Isso é independente de quando os serviços caem
// 22/Jan a 15/Fev = 24 dias (inclusive)

const inicio = new Date(2026, 0, 22);
const fim = new Date(2026, 1, 15);
const diffMs = fim.getTime() - inicio.getTime();
const diffDias = diffMs / (1000 * 60 * 60 * 24);
console.log(`\n22/Jan a 15/Fev = ${diffDias} dias corridos`);

// Hipótese: 9 serviços a cada 3 dias = 27 dias, mas o período é de 24 dias?
// Ou: o período é calculado como dataInicio do 1º serviço até o dia ANTES do 9º serviço?
// 9º serviço = 17/Fev, dia anterior = 16/Fev (não é 15/Fev)

// Outra hipótese: o período é calculado como 8 serviços × 3 dias = 24 dias
// Ou seja: o período vai do 1º ao 8º serviço (não ao 9º)?
// 8º serviço = 14/Fev, mas usuário diz 15/Fev

// Hipótese mais provável: o período é de 24 dias corridos a partir do dataInicio
// Independente de quantos serviços caem nesse período
// 22/Jan + 24 dias = 15/Fev ✓

console.log("\n=== Hipótese: período fixo de 24 dias corridos ===");
console.log(`1º período: ${formatDateBR(inicio)} a ${formatDateBR(new Date(inicio.getTime() + 24 * 24 * 60 * 60 * 1000 - 1))}`);
// Espera: 22/Jan a 15/Fev? Vamos calcular:
const fimPeriodo = new Date(inicio);
fimPeriodo.setDate(fimPeriodo.getDate() + 24); // +24 dias = 15/Fev? 
console.log(`22/Jan + 24 dias = ${formatDateBR(fimPeriodo)}`);
// 22 + 24 = 46, Jan tem 31 dias, então 46-31=15/Fev ✓

// Verificar com o projeto de referência: foCalculator.ts
// A regra original era: período de concessão = 9 serviços, cada serviço = 1 dia de prontidão
// Mas o período de CONCESSÃO (para usar a FMO) pode ser diferente do período de CONQUISTA

// Talvez o período de concessão seja: do dataInicio até o dia do 9º serviço - 2 dias?
// 9º serviço = 17/Fev, 17/Fev - 2 = 15/Fev ✓ 

console.log("\n=== Hipótese: período vai até (9º serviço - 2 dias) ===");
const CYCLE_EQUIPES = ["Prontidão Verde", "Prontidão Amarela", "Prontidão Azul"];
const CYCLE_REFERENCE_MS = new Date(2026, 0, 1).getTime();
function getProntidaoDoDia(date) {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((target - CYCLE_REFERENCE_MS) / (1000 * 60 * 60 * 24));
  const idx = ((diffDays % 3) + 3) % 3;
  return CYCLE_EQUIPES[idx];
}

const equipe = "Prontidão Azul";
let contador = 0;
let nonoServico = null;
for (let d = new Date(inicio); contador < 9; d.setDate(d.getDate() + 1)) {
  if (getProntidaoDoDia(d) === equipe) {
    contador++;
    if (contador === 9) nonoServico = new Date(d);
  }
}
console.log(`9º serviço da Azul a partir de 22/Jan: ${formatDateBR(nonoServico)}`);
const fimHipotese = new Date(nonoServico);
fimHipotese.setDate(fimHipotese.getDate() - 2);
console.log(`9º serviço - 2 dias = ${formatDateBR(fimHipotese)}`);
// Se der 15/Fev, a hipótese é: período vai até (9º serviço - 2 dias)
