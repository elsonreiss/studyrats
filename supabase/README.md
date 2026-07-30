# Banco de dados

## Projeto novo

O `schema.sql` está no estado da **migração 03**. Para um projeto do zero, rode nesta ordem:

```
schema.sql
04_capa_checkin_grupo_chat.sql
05_comentarios.sql
06_multiplos_desafios.sql
07_corrida_100_dias.sql
08_melhorias.sql
```

(O `schema.sql` já inclui o conteúdo das migrações 02 e 03.)

## Projeto que já existe

Rode só as migrações que ainda faltam, sempre em ordem numérica. Todas são
idempotentes — rodar de novo não quebra nada.

## O que cada arquivo faz

| Arquivo | Conteúdo |
|---|---|
| `schema.sql` | Perfis, check-ins, desafios privados, ranking, storage |
| `04_...` | Capa do desafio, check-in vinculado a grupo, bate-papo em tempo real |
| `05_...` | Comentários nos check-ins, liberados entre quem divide desafio |
| `06_...` | Um check-in em vários desafios ao mesmo tempo |
| `07_...` | Fuso de Brasília e corrida dos 100 dias |
| `08_...` | Sequência de dias, reações, edição, miniaturas, fotos privadas, membros, limite no chat, paginação |

## Decisões de segurança

- **Tudo passa por RLS.** Nenhuma regra de privacidade depende do front-end.
- **Desafios são privados**: só membros leem o grupo, a lista de membros, o ranking e o chat.
  Entrar acontece pela função `join_group()`, que exige link ou código.
- **Fotos de check-in ficam em bucket privado** (`checkins`). O app gera URLs assinadas
  de 1 hora. Avatares e capas de desafio seguem públicos, por serem menos sensíveis
  e aparecerem em toda parte.
- **Funções sensíveis são `security definer` com `search_path` fixo**, para não serem
  sequestradas por objetos criados no schema do usuário.
- **O bate-papo tem limite** de 8 mensagens a cada 20 segundos por pessoa, via trigger.
