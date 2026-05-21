import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar o Cb Alain
const [boms] = await conn.execute("SELECT * FROM bombeiros WHERE nome LIKE '%Alain%'");
const b = boms[0];
console.log('BOMBEIRO:', b.id, b.nome, b.equipe, 'dataInicio:', b.dataInicio);

const id = b.id;

// Afastamentos
const [afas] = await conn.execute(
  'SELECT id, bombeiroId, tipo, DATE(dataInicio) as ini, DATE(dataFim) as fim FROM afastamentos WHERE bombeiroId = ? ORDER BY dataInicio',
  [id]
);
console.log('\nAFASTAMENTOS:');
afas.forEach(a => console.log(` [${a.id}] tipo=${a.tipo} ini=${a.ini} fim=${a.fim}`));

// Trocas (entra ou sai)
const [trocas] = await conn.execute(
  'SELECT id, bombeiroEntraId, bombeireSaiId, DATE(dataTroca) as troca, DATE(dataPagamento) as pagamento FROM trocas_servico WHERE bombeiroEntraId = ? OR bombeireSaiId = ? ORDER BY dataTroca',
  [id, id]
);
console.log('\nTROCAS:');
trocas.forEach(t => console.log(` [${t.id}] entra=${t.bombeiroEntraId} sai=${t.bombeireSaiId} troca=${t.troca} pagamento=${t.pagamento}`));

await conn.end();
