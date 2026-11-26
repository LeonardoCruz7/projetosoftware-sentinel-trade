# UML — Diagrama de componentes

Arquitetura **hexagonal** (portas e adaptadores): o núcleo de regras de negócio depende apenas de **interfaces (portas)**;
banco, corretora, provedor de cotações, notificação e criptografia são **adaptadores** trocáveis. Isso permite testar
toda a regra de negócio sem banco nem rede, e trocar memória por PostgreSQL sem alterar uma linha de regra.

![](../../../diagrams/componentes-componentes.png)

Fonte: [`componentes.mmd`](componentes.mmd)

## Decisões e riscos tratados

| Fronteira | Risco | Tratamento |
|---|---|---|
| Aplicação ↔ Corretora | Lentidão, queda, resposta duplicada | Porta `CorretoraGateway` + decorator de resiliência; fila durável; idempotência nas duas pontas |
| Aplicação ↔ Provedor de cotações | Dado errado, atrasado ou indisponível | Revalidação, cache com validade, bloqueio de ordens com cotação velha |
| Aplicação ↔ Banco | Concorrência, falha no meio da operação | Transação única por caso de uso; `versao` otimista; `ON CONFLICT DO NOTHING` na idempotência |
| Aplicação ↔ Notificação | Falha de envio não pode desfazer ordem | *Outbox*: grava na transação, envia depois |
| Interface ↔ Aplicação | Entrada maliciosa, acesso indevido | Validação por allowlist e RBAC **no servidor** (a interface é fina) |
