/**
 * Testes unitários para a lógica de cálculo de FMO
 * Regra: 1 FMO a cada 9 serviços consecutivos
 * Sequência é interrompida por afastamentos: F, LP, DS, LT, D, LTS, C, CFS, CAS, EAP, TAF
 */
import { describe, expect, it } from "vitest";

// ─── Lógica pura extraída do db.ts para teste ─────────────────────────────────

const INTERRUPT_SIGLAS = new Set(['F', 'LP', 'DS', 'LT', 'D', 'LTS', 'C', 'CFS', 'CAS', 'EAP', 'TAF']);
const CYCLE_EQUIPES = ["Prontidão Verde", "Prontidão Amarela", "Prontidão Azul"] as const;
const CYCLE_REFERENCE_MS = new Date(2025, 0, 1).getTime();

function getProntidaoDoDia(date: Date): string {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((target - CYCLE_REFERENCE_MS) / (1000 * 60 * 60 * 24));
  const idx = ((diffDays % 3) + 3) % 3;
  return CYCLE_EQUIPES[idx];
}

function dateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface AfastamentoSimples {
  tipo: string;
  dataInicio: Date;
  dataFim: Date;
}

interface ResultadoFMO {
  fmoGeradas: number;
  cicloAtual: number;
  periodosConcessao: Array<{ numero: number; dataInicio: string; dataFim: string }>;
}

/**
 * Simula o cálculo de FMO para uma equipe, com afastamentos opcionais.
 * Retorna quantas FMOs foram geradas e o ciclo atual.
 */
function calcularFMOPura(
  equipe: string,
  dataInicio: Date,
  dataFim: Date,
  afastamentos: AfastamentoSimples[] = []
): ResultadoFMO {
  // Construir mapa de data → sigla de afastamento
  const afastamentoNoDia = new Map<string, string>();
  for (const af of afastamentos) {
    for (let d = new Date(af.dataInicio); d <= af.dataFim; d.setDate(d.getDate() + 1)) {
      const chave = dateToYMD(d);
      if (!afastamentoNoDia.has(chave) || INTERRUPT_SIGLAS.has(af.tipo)) {
        afastamentoNoDia.set(chave, af.tipo);
      }
    }
  }

  // Coletar dias de serviço
  const diasDeServico: Date[] = [];
  for (let d = new Date(dataInicio); d <= dataFim; d.setDate(d.getDate() + 1)) {
    if (getProntidaoDoDia(d) === equipe) {
      diasDeServico.push(new Date(d));
    }
  }

  // Calcular FMO com lógica de interrupção
  let fmoGeradas = 0;
  let cicloAtual = 0;
  let dataInicioConquista: Date | null = null;
  const periodosConcessao: Array<{ numero: number; dataInicio: string; dataFim: string }> = [];

  for (const data of diasDeServico) {
    const chave = dateToYMD(data);
    const sigla = afastamentoNoDia.get(chave);

    if (sigla && INTERRUPT_SIGLAS.has(sigla)) {
      cicloAtual = 0;
      dataInicioConquista = null;
    } else if (sigla === 'FMO') {
      // FMO usada não interrompe nem conta
    } else {
      if (cicloAtual === 0) dataInicioConquista = data;
      cicloAtual++;
      if (cicloAtual >= 9) {
        fmoGeradas++;
        periodosConcessao.push({
          numero: fmoGeradas,
          dataInicio: dateToYMD(dataInicioConquista!),
          dataFim: dateToYMD(data),
        });
        cicloAtual = 0;
        dataInicioConquista = null;
      }
    }
  }

  return { fmoGeradas, cicloAtual, periodosConcessao };
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("Ciclo fixo de prontidões", () => {
  it("01/Jan/2025 deve ser Prontidão Verde", () => {
    expect(getProntidaoDoDia(new Date(2025, 0, 1))).toBe("Prontidão Verde");
  });

  it("02/Jan/2025 deve ser Prontidão Amarela", () => {
    expect(getProntidaoDoDia(new Date(2025, 0, 2))).toBe("Prontidão Amarela");
  });

  it("03/Jan/2025 deve ser Prontidão Azul", () => {
    expect(getProntidaoDoDia(new Date(2025, 0, 3))).toBe("Prontidão Azul");
  });

  it("04/Jan/2025 deve ser Prontidão Verde (ciclo reinicia)", () => {
    expect(getProntidaoDoDia(new Date(2025, 0, 4))).toBe("Prontidão Verde");
  });
});

describe("Cálculo de FMO sem afastamentos", () => {
  it("9 serviços consecutivos = 1 FMO", () => {
    // Verde serve nos dias 1, 4, 7, 10, 13, 16, 19, 22, 25 de Jan/2025
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 31)
    );
    // Jan/2025: Verde nos dias 1,4,7,10,13,16,19,22,25,28,31 = 11 dias → 1 FMO completa + 2 no ciclo
    expect(resultado.fmoGeradas).toBe(1);
    expect(resultado.cicloAtual).toBe(2);
  });

  it("18 serviços consecutivos = 2 FMOs", () => {
    // Verde: Jan+Fev/2025 terá 18+ dias
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 1, 28)
    );
    expect(resultado.fmoGeradas).toBe(2);
  });

  it("menos de 9 serviços = 0 FMOs", () => {
    // Verde: apenas 3 dias de serviço
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 7) // 7 dias: Verde nos dias 1, 4, 7 = 3 dias
    );
    expect(resultado.fmoGeradas).toBe(0);
    expect(resultado.cicloAtual).toBe(3);
  });
});

describe("Cálculo de FMO com afastamentos interruptores", () => {
  it("Férias (F) no 5º serviço deve zerar a sequência", () => {
    // Verde: Jan/2025 dias 1,4,7,10,13 (5 serviços), depois F no dia 13, depois 16,19,22,25,28,31
    // Sem F: 11 dias → 1 FMO + 2 no ciclo
    // Com F no dia 13 (5º serviço): sequência zerada, recomeça do 16
    // Após F: dias 16,19,22,25,28,31 = 6 dias → 0 FMOs adicionais
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 31),
      [{ tipo: "F", dataInicio: new Date(2025, 0, 13), dataFim: new Date(2025, 0, 13) }]
    );
    expect(resultado.fmoGeradas).toBe(0);
    expect(resultado.cicloAtual).toBe(6); // 16,19,22,25,28,31 = 6 dias após interrupção
  });

  it("LP no 9º serviço deve impedir a FMO (sequência zerada antes de completar)", () => {
    // Verde: dias 1,4,7,10,13,16,19,22,25 = 9 dias. LP no dia 25 (9º) interrompe.
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 31),
      [{ tipo: "LP", dataInicio: new Date(2025, 0, 25), dataFim: new Date(2025, 0, 25) }]
    );
    // LP no 9º dia: interrompe antes de completar, ciclo zera
    // Depois: dias 28, 31 = 2 dias
    expect(resultado.fmoGeradas).toBe(0);
    expect(resultado.cicloAtual).toBe(2);
  });

  it("FMO usada (tipo FMO) não interrompe a sequência", () => {
    // Verde: Jan/2025 com FMO no dia 13 (5º serviço, índice 4)
    // FMO não interrompe → sequência continua normalmente
    // Dias Verde Jan/2025: 1,4,7,10,13,16,19,22,25,28,31 = 11 dias
    // FMO no dia 13 não conta como serviço nem interrompe
    // Sequência: 1,4,7,10 (4 dias) + FMO(13 não conta) + 16,19,22,25,28 (5 dias) = 9 → 1 FMO, depois 31 = 1 no ciclo
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 31),
      [{ tipo: "FMO", dataInicio: new Date(2025, 0, 13), dataFim: new Date(2025, 0, 13) }]
    );
    // FMO não interrompe: 10 dias válidos (dia 13 não conta) → 1 FMO (primeiros 9) + 1 no ciclo
    expect(resultado.fmoGeradas).toBe(1);
    expect(resultado.cicloAtual).toBe(1);
  });

  it("PA (Plantão Administrativo) não interrompe a sequência", () => {
    // PA não está na lista de interruptores
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 31),
      [{ tipo: "PA", dataInicio: new Date(2025, 0, 13), dataFim: new Date(2025, 0, 13) }]
    );
    // PA não interrompe → 11 dias → 1 FMO + 2 no ciclo
    expect(resultado.fmoGeradas).toBe(1);
    expect(resultado.cicloAtual).toBe(2);
  });

  it("DS (Dispensa de Serviço) interrompe a sequência", () => {
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 31),
      [{ tipo: "DS", dataInicio: new Date(2025, 0, 13), dataFim: new Date(2025, 0, 13) }]
    );
    expect(resultado.fmoGeradas).toBe(0);
    expect(resultado.cicloAtual).toBe(6);
  });
});

describe("Períodos de concessão", () => {
  it("deve registrar o período correto para a FMO gerada", () => {
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 31)
    );
    expect(resultado.periodosConcessao).toHaveLength(1);
    expect(resultado.periodosConcessao[0].numero).toBe(1);
    // Primeiro serviço Verde: 01/Jan/2025
    expect(resultado.periodosConcessao[0].dataInicio).toBe("2025-01-01");
    // Nono serviço Verde: 25/Jan/2025
    expect(resultado.periodosConcessao[0].dataFim).toBe("2025-01-25");
  });
});
