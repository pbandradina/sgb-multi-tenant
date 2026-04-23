# SGB Multi-Tenant - TODO

## Banco de Dados
- [x] Tabela `quarteis` (id, nome, sigla, cidade, estado, ativo)
- [x] Tabela `quartel_users` (quartelId, userId, role: admin|operador)
- [x] Tabela `bombeiros` (id, quartelId, nome, posto, equipe, dataInicio, ativo)
- [x] Tabela `escalas` (id, quartelId, equipe, dataInicio, dataFim, tipo)
- [x] Tabela `prontidoes` (id, quartelId, bombeiroId, data, equipe)
- [x] Tabela `afastamentos` (id, quartelId, bombeiroId, tipo, dataInicio, dataFim, descricao)
- [x] Migrations aplicadas no banco de dados

## Backend (tRPC Routers)
- [x] Router `quartel` - CRUD de quarteis, associar usuário a quartel
- [x] Router `bombeiro` - CRUD de bombeiros por quartel
- [x] Router `escala` - CRUD de escalas por quartel
- [x] Router `prontidao` - registrar/listar prontidões
- [x] Router `afastamento` - CRUD de afastamentos
- [x] Router `fo` - calcular saldo de FO por bombeiro
- [x] Router `relatorio` - gerar relatório de FO por período/equipe
- [x] Router `admin` - painel admin: listar quarteis, promover usuários

## Frontend
- [x] Design system: cores vermelho/preto/dourado, tipografia elegante
- [x] Layout AppLayout com sidebar personalizada
- [x] Página de Login / seleção de quartel
- [x] Dashboard: resumo efetivo, FO, alertas de afastamentos
- [x] Página Bombeiros: listagem, cadastro, exclusão
- [x] Página Escalas: calendário dinâmico por equipe
- [x] Página Afastamentos: listagem, cadastro, exclusão
- [x] Página FO: saldos por bombeiro, cálculo automático
- [x] Página Relatórios: filtro por período e equipe
- [x] Painel Admin: gestão de quarteis e usuários

## Testes
- [x] Testes unitários para routers de autenticação
- [x] Testes de controle de acesso para quartel e bombeiro
- [x] Testes de controle de acesso para afastamento
