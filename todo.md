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

## Ajustes
- [x] Renomear equipes: VD → Prontidão Verde, VA → Prontidão Azul, VB → Prontidão Amarela, VC → Administrativo (schema, backend, frontend)
- [x] Renomear FO → FMO (Folga Mensal Obrigatória) em todo o sistema
- [x] Excluir bombeiros da equipe Administrativo do cálculo de FMO
- [x] Adicionar botão de exclusão de escalas na página de Escalas de Serviço

## Refactor: Sistema de Escalas e FMO por Período
- [x] Criar tabela bombeiro_prontidao_historico (bombeiro, prontidão, data_inicio, data_fim)
- [x] Atualizar backend: routers e db.ts para histórico de vínculos e cálculo de FMO por período
- [x] Adicionar botão 'Aplicar Código a Período' na tela de Bombeiros
- [x] Atualizar calendário de escalas: cada dia pertence a uma prontidão
- [x] Atualizar tela de FMO e Dashboard para usar novo cálculo

## Cálculo Automático de FMO
- [x] Reescrever calcularSaldoFMO: cruzar dias de escalas com histórico de vínculos do bombeiro (sem registro manual)
- [x] Atualizar FolhasObrigatorias.tsx para mostrar dias de serviço calculados automaticamente
- [x] Atualizar Dashboard para refletir novo cálculo

## Calendário Visual com Ciclo de Prontidões
- [x] Exibir moldura colorida em cada dia do calendário conforme ciclo fixo (Verde→Amarela→Azul a partir de 01/Jan)

## Melhorias Calendário Visual
- [x] Remover texto de prontidão abaixo da moldura (reservar espaço para siglas de afastamentos)
- [x] Colorir fundo da célula nos dias de serviço dos bombeiros cadastrados (cor fraca da prontidão)
- [x] Respeitar data de início do bombeiro ao colorir células (não colorir dias anteriores ao início)

## Siglas de Afastamentos
- [x] Atualizar enum de tipos no schema para siglas corretas (F, LP, LT, DS, FMO, PA, D, C, LTS, CFS, CAS, EAP, TAF, EX, ME, AG)
- [x] Atualizar router de afastamentos com novos tipos/siglas
- [x] Atualizar tela de Afastamentos com seletor de siglas e cores
- [ ] Exibir siglas de afastamentos nas células do calendário (próxima etapa)
