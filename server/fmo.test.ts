/**
 * Testes unitários para a lógica de cálculo de FMO
 * Regra: 1 FMO a cada 9 serviços consecutivos
 * Sequência é interrompida por afastamentos: F, LP, DS, LT, D, LTS, C, CFS, CAS, EAP, TAF
 * Referência do ciclo: 01/Jan/2026 = Verde (idx=0), ciclo contínuo
 */
import { describe, expect, it } from "vitest";

// ─── Lógica pura extraída do db.ts para teste ─────────────────────────────────

const INTERRUPT_SIGLAS = new Set(['F', 'LP', 'DS', 'LT', 'D', 'LTS', 'C', 'CFS', 'CAS', 'EAP', 'TAF']);
const CYCLE_EQUIPES = ["Prontidão Verde", "Prontidão Amarela", "Prontidão Azul"] as const;
// 01/Jan/2026 = Verde (idx=0), ciclo contínuo sem reiniciar no ano
const CYCLE_REFERENCE_MS = new Date(2026, 0, 1).getTime();

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

function calcularFMOPura(
  equipe: string,
  dataInicio: Date,
  dataFim: Date,
  afastamentos: AfastamentoSimples[] = []
): ResultadoFMO {
  const afastamentoNoDia = new Map<string, string>();
  for (const af of afastamentos) {
    for (let d = new Date(af.dataInicio); d <= af.dataFim; d.setDate(d.getDate() + 1)) {
      const chave = dateToYMD(d);
      if (!afastamentoNoDia.has(chave) || INTERRUPT_SIGLAS.has(af.tipo)) {
        afastamentoNoDia.set(chave, af.tipo);
      }
    }
  }

  const diasDeServico: Date[] = [];
  for (let d = new Date(dataInicio); d <= dataFim; d.setDate(d.getDate() + 1)) {
    if (getProntidaoDoDia(d) === equipe) {
      diasDeServico.push(new Date(d));
    }
  }

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

describe("Ciclo fixo de prontidões (ref: 01/Jan/2026=Verde)", () => {
  // Com ref=01/Jan/2026=Verde:
  // Jan/2025: diff=-365 → idx=1=Amarela, diff=-364 → idx=2=Azul, diff=-363 → idx=0=Verde
  // Portanto: 01/Jan/2025=Amarela, 02/Jan=Azul, 03/Jan=Verde
  it("01/Jan/2026 deve ser Prontidão Verde (referência)", () => {
    expect(getProntidaoDoDia(new Date(2026, 0, 1))).toBe("Prontidão Verde");
  });

  it("02/Jan/2026 deve ser Prontidão Amarela", () => {
    expect(getProntidaoDoDia(new Date(2026, 0, 2))).toBe("Prontidão Amarela");
  });

  it("03/Jan/2026 deve ser Prontidão Azul", () => {
    expect(getProntidaoDoDia(new Date(2026, 0, 3))).toBe("Prontidão Azul");
  });

  it("04/Jan/2026 deve ser Prontidão Verde (ciclo continua)", () => {
    expect(getProntidaoDoDia(new Date(2026, 0, 4))).toBe("Prontidão Verde");
  });

  it("03/Jan/2025 deve ser Prontidão Verde (retroativo)", () => {
    // diff=-363, (-363 % 3 + 3) % 3 = 0 => Verde
    expect(getProntidaoDoDia(new Date(2025, 0, 3))).toBe("Prontidão Verde");
  });
});

describe("Cálculo de FMO sem afastamentos", () => {
  it("9 serviços consecutivos = 1 FMO", () => {
    // Verde em Jan/2025: dias 3,6,9,12,15,18,21,24,27,30 = 10 dias → 1 FMO + 1 no ciclo
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 31)
    );
    expect(resultado.fmoGeradas).toBe(1);
    expect(resultado.cicloAtual).toBe(1);
  });

  it("18 serviços consecutivos = 2 FMOs", () => {
    // Verde Jan+Fev/2025: 10+9=19 dias → 2 FMOs + 1 no ciclo
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 1, 28)
    );
    expect(resultado.fmoGeradas).toBe(2);
  });

  it("menos de 9 serviços = 0 FMOs", () => {
    // Verde em Jan/2025 até dia 9: dias 3,6,9 = 3 dias
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 9)
    );
    expect(resultado.fmoGeradas).toBe(0);
    expect(resultado.cicloAtual).toBe(3);
  });
});

describe("Cálculo de FMO com afastamentos interruptores", () => {
  it("Férias (F) no 5º serviço deve zerar a sequência", () => {
    // Verde Jan/2025: 3,6,9,12,15,18,21,24,27,30
    // F no dia 15 (5º serviço): sequência zerada, recomeça do 18
    // Após F: 18,21,24,27,30 = 5 dias → 0 FMOs
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 31),
      [{ tipo: "F", dataInicio: new Date(2025, 0, 15), dataFim: new Date(2025, 0, 15) }]
    );
    expect(resultado.fmoGeradas).toBe(0);
    expect(resultado.cicloAtual).toBe(5);
  });

  it("LP no 9º serviço deve impedir a FMO (sequência zerada antes de completar)", () => {
    // Verde Jan/2025: 3,6,9,12,15,18,21,24,27 = 9 dias. LP no dia 27 (9º) interrompe.
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 31),
      [{ tipo: "LP", dataInicio: new Date(2025, 0, 27), dataFim: new Date(2025, 0, 27) }]
    );
    // LP no 9º dia: interrompe antes de completar, ciclo zera
    // Depois: dia 30 = 1 dia
    expect(resultado.fmoGeradas).toBe(0);
    expect(resultado.cicloAtual).toBe(1);
  });

  it("FMO usada (tipo FMO) não interrompe a sequência", () => {
    // Verde Jan/2025: 3,6,9,12,15,18,21,24,27,30 = 10 dias
    // FMO no dia 15 (5º serviço): não conta, não interrompe
    // Sequência: 3,6,9,12 (4) + FMO(15 não conta) + 18,21,24,27,30 (5) = 9 → 1 FMO, depois nada
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 31),
      [{ tipo: "FMO", dataInicio: new Date(2025, 0, 15), dataFim: new Date(2025, 0, 15) }]
    );
    expect(resultado.fmoGeradas).toBe(1);
    expect(resultado.cicloAtual).toBe(0);
  });

  it("PA (Pausa Autorizada) não interrompe a sequência", () => {
    // PA não está na lista de interruptores
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 31),
      [{ tipo: "PA", dataInicio: new Date(2025, 0, 15), dataFim: new Date(2025, 0, 15) }]
    );
    // PA não interrompe → 10 dias → 1 FMO + 1 no ciclo
    expect(resultado.fmoGeradas).toBe(1);
    expect(resultado.cicloAtual).toBe(1);
  });

  it("DS (Dispensa de Serviço) interrompe a sequência", () => {
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 31),
      [{ tipo: "DS", dataInicio: new Date(2025, 0, 15), dataFim: new Date(2025, 0, 15) }]
    );
    expect(resultado.fmoGeradas).toBe(0);
    expect(resultado.cicloAtual).toBe(5);
  });
});

describe("Períodos de concessão", () => {
  it("deve registrar o período correto para a FMO gerada", () => {
    // Verde Jan/2025: 3,6,9,12,15,18,21,24,27 = 9 dias → 1 FMO
    const resultado = calcularFMOPura(
      "Prontidão Verde",
      new Date(2025, 0, 1),
      new Date(2025, 0, 31)
    );
    expect(resultado.periodosConcessao).toHaveLength(1);
    expect(resultado.periodosConcessao[0].numero).toBe(1);
    // Primeiro serviço Verde em Jan/2025: 03/Jan
    expect(resultado.periodosConcessao[0].dataInicio).toBe("2025-01-03");
    // Nono serviço Verde em Jan/2025: 27/Jan
    expect(resultado.periodosConcessao[0].dataFim).toBe("2025-01-27");
  });
});
