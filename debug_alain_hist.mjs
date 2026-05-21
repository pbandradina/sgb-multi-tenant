import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [hist] = await conn.execute(
  'SELECT id, bombeiroId, quartelId, equipe, DATE(dataInicio) as ini, DATE(dataFim) as fim FROM bombeiro_prontidao_historico WHERE bombeiroId = 30005 ORDER BY dataInicio',
);
console.log('HISTORICO PRONTIDAO do Alain (id=30005):');
hist.forEach(h => console.log(JSON.stringify(h)));

// Verificar também os afastamentos com as datas reais
const [afas] = await conn.execute(
  'SELECT id, tipo, dataInicio, dataFim FROM afastamentos WHERE bombeiroId = 30005 ORDER BY dataInicio',
);
console.log('\nAFASTAMENTOS:');
afas.forEach(a => console.log(JSON.stringify({
  id: a.id,
  tipo: a.tipo,
  ini: a.dataInicio,
  fim: a.dataFim
})));

await conn.end();
