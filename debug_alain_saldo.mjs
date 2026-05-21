// Chama calcularSaldoFMO diretamente para o Alain
import { calcularSaldoFMO } from './server/db.ts';

const result = await calcularSaldoFMO(30005, 2);
console.log(JSON.stringify(result, null, 2));
