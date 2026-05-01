// Simula o cálculo de FMO para o Lucian
// dataInicio: 22/Jan/2026, equipe: precisa descobrir

const INTERRUPT_SIGLAS = new Set(['F', 'LP', 'DS', 'LT', 'D', 'LTS', 'C', 'CFS', 'CAS', 'EAP', 'TAF']);
const PAUSE_SIGLAS = new Set(['PA', 'FMO', 'FO', 'AG', 'ME', 'EX', 'VD', 'AM', 'AZ']);
const CYCLE_EQUIPES = ["Prontidão Verde", "Prontidão Amarela", "Prontidão Azul"];
const CYCLE_REFERENCE_MS = new Date(2026, 0, 1).getTime(); // 01/Jan/2026 = Verde

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

// Lucian dataInicio: 22/Jan/2026
const dataInicio = new Date(2026, 0, 22); // 22/Jan/2026
const dataFim = new Date(2026, 2, 13);    // 13/Mar/2026 (dia em que insere a FMO)

// Qual é a equipe do dia 22/Jan/2026?
console.log("Equipe em 22/Jan/2026:", getProntidaoDoDia(dataInicio));
console.log("Equipe em 23/Jan/2026:", getProntidaoDoDia(new Date(2026, 0, 23)));
console.log("Equipe em 24/Jan/2026:", getProntidaoDoDia(new Date(2026, 0, 24)));
console.log("");

// Testar com cada equipe possível
for (const equipe of CYCLE_EQUIPES) {
  // Verificar se 22/Jan é desta equipe
  if (getProntidaoDoDia(dataInicio) !== equipe) continue;
  
  console.log(`\n=== Simulação com equipe: ${equipe} ===`);
  
  const diasDeServico = [];
  for (let d = new Date(dataInicio); d <= dataFim; d.setDate(d.getDate() + 1)) {
    if (getProntidaoDoDia(d) === equipe) {
      diasDeServico.push(new Date(d));
    }
  }
  
  console.log(`Dias de serviço de ${formatDateBR(dataInicio)} a ${formatDateBR(dataFim)}:`);
  diasDeServico.forEach((d, i) => console.log(`  ${i+1}. ${formatDateBR(d)} (${dateToYMD(d)})`));
  console.log(`Total: ${diasDeServico.length} dias`);
  
  // Calcular FMO sem afastamentos
  let fmoGeradas = 0;
  let cicloAtual = 0;
  let dataInicioConquista = null;
  const periodosConcessao = [];
  
  for (const data of diasDeServico) {
    if (cicloAtual === 0) dataInicioConquista = data;
    cicloAtual++;
    if (cicloAtual >= 9) {
      fmoGeradas++;
      periodosConcessao.push({
        numero: fmoGeradas,
        label: `FMO #${fmoGeradas}: ${formatDateBR(dataInicioConquista)} a ${formatDateBR(data)}`,
      });
      cicloAtual = 0;
      dataInicioConquista = null;
    }
  }
  
  console.log(`\nResultado:`);
  console.log(`  FMOs geradas: ${fmoGeradas}`);
  console.log(`  Ciclo atual: ${cicloAtual}`);
  periodosConcessao.forEach(p => console.log(`  ${p.label}`));
  if (cicloAtual > 0 && dataInicioConquista) {
    console.log(`  Ciclo em andamento: ${formatDateBR(dataInicioConquista)} (${cicloAtual}/9 serviços)`);
  }
}

// Agora simular com TODAS as equipes para ver qual produz "22JAN a 15FEV"
console.log("\n\n=== Buscando qual equipe produz '22JAN a 15FEV' ===");
for (const equipe of CYCLE_EQUIPES) {
  const diasDeServico = [];
  for (let d = new Date(dataInicio); d <= dataFim; d.setDate(d.getDate() + 1)) {
    if (getProntidaoDoDia(d) === equipe) {
      diasDeServico.push(new Date(d));
    }
  }
  
  let fmoGeradas = 0;
  let cicloAtual = 0;
  let dataInicioConquista = null;
  const periodosConcessao = [];
  
  for (const data of diasDeServico) {
    if (cicloAtual === 0) dataInicioConquista = data;
    cicloAtual++;
    if (cicloAtual >= 9) {
      fmoGeradas++;
      const inicio = formatDateBR(dataInicioConquista);
      const fim = formatDateBR(data);
      periodosConcessao.push({ inicio, fim });
      cicloAtual = 0;
      dataInicioConquista = null;
    }
  }
  
  console.log(`${equipe}: ${diasDeServico.length} dias, FMOs: ${fmoGeradas}, períodos: ${periodosConcessao.map(p => `${p.inicio} a ${p.fim}`).join(', ') || 'nenhum'}, ciclo atual: ${cicloAtual}`);
}
