// Siglas de afastamentos conforme sistema anterior
// EX (Expediente) foi removido — é um tipo de escala semanal, não afastamento
export const SIGLAS_AFASTAMENTO = [
  { sigla: "F",   label: "Férias",                    cor: "bg-orange-600 text-white" },
  { sigla: "LP",  label: "Licença Prêmio",             cor: "bg-pink-600 text-white" },
  { sigla: "LT",  label: "Luto",                       cor: "bg-gray-700 text-white" },
  { sigla: "DS",  label: "Dispensa do Serviço",        cor: "bg-red-600 text-white" },
  { sigla: "FMO", label: "Folga Mensal Obrigatória",   cor: "bg-purple-600 text-white" },
  { sigla: "PA",  label: "Pausa Autorizada",           cor: "bg-slate-600 text-white" },
  { sigla: "D",   label: "Doação de Sangue",           cor: "bg-rose-600 text-white" },
  { sigla: "C",   label: "Convalescença",              cor: "bg-amber-600 text-white" },
  { sigla: "LTS", label: "Licença Tratamento Saúde",   cor: "bg-indigo-600 text-white" },
  { sigla: "CFS", label: "Curso Form. Sargentos",      cor: "bg-violet-600 text-white" },
  { sigla: "CAS", label: "Curso Aperfeiçoamento",      cor: "bg-fuchsia-600 text-white" },
  { sigla: "EAP", label: "Estágio Atualização",        cor: "bg-lime-600 text-white" },
  { sigla: "TAF", label: "Teste Aptidão Física",       cor: "bg-emerald-600 text-white" },
  { sigla: "ME",  label: "Meio Expediente",            cor: "bg-sky-600 text-white" },
  { sigla: "AG",  label: "Aglutinada",                 cor: "bg-teal-600 text-white" },
] as const;

export type TipoAfastamento = typeof SIGLAS_AFASTAMENTO[number]["sigla"];

export function getSiglaConfig(sigla: string) {
  return SIGLAS_AFASTAMENTO.find(s => s.sigla === sigla) ?? { sigla, label: sigla, cor: "bg-slate-700 text-white" };
}
