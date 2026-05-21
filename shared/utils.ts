/**
 * Formata a graduação/posto para exibição abreviada (sem "PM").
 * Ex: "1º Sargento" → "1º Sgt", "Cabo" → "Cb", "Soldado" → "Sd"
 */
export function formatGraduacao(posto: string | null | undefined): string {
  if (!posto) return "";
  const map: Record<string, string> = {
    "1º Sargento": "1º Sgt",
    "2º Sargento": "2º Sgt",
    "3º Sargento": "3º Sgt",
    "Cabo":        "Cb",
    "Soldado":     "Sd",
    // Compatibilidade com valores antigos que já vinham com PM
    "1º Sgt PM":   "1º Sgt",
    "2º Sgt PM":   "2º Sgt",
    "3º Sgt PM":   "3º Sgt",
    "Cb PM":       "Cb",
    "Sd PM":       "Sd",
  };
  return map[posto] ?? posto;
}
