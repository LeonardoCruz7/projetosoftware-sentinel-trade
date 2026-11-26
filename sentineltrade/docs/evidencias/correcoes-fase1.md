# Correções e acréscimos em relação à Fase 1

Base de comparação: o repositório `projetosoftware-sentinel-trade-main` entregue na Fase 1, o enunciado e a devolutiva
(`FEEDBACK_FASE_1.md`): *"consolidar requisitos funcionais e não funcionais, critérios de aceitação, regras de negócio,
rastreabilidade e o diagrama de casos de uso no repositório."*

## 1. Atendimento direto à devolutiva

| Pedido | Situação na Fase 1 | Agora |
|---|---|---|
| Requisitos funcionais e não funcionais consolidados | Lista curta no README, sem IDs do enunciado, sem prioridade | [`requisitos.md`](../requisitos/requisitos.md): 20 RF + 12 RNF, IDs do enunciado preservados, mapeamento dos antigos |
| Critérios de aceitação | Inexistentes | Em cada requisito, verificáveis e ligados a testes; RNFs com números **medidos** |
| Regras de negócio | Inexistentes | [`regras-de-negocio.md`](../requisitos/regras-de-negocio.md): RN01–RN26, com código, local e teste |
| Rastreabilidade | Inexistente | [`matriz-rastreabilidade.md`](../requisitos/matriz-rastreabilidade.md): RF/RNF → caso de uso → diagrama → classe → tabela → teste |
| Diagrama de casos de uso no repositório | Imagem hospedada fora do repositório, gerada por IA, não editável | Diagrama **versionado, editável** e corrigido em `docs/uml/casos-de-uso/` |

## 2. Problemas encontrados no que existia

| # | Problema | Correção |
|---|---|---|
| 1 | Casos de uso com apenas 3 dos 7 atores obrigatórios | 7 atores |
| 2 | Faltavam casos de uso obrigatórios (MFA, saldo, gerenciar ativos/limites, verificar saldo/posição) | Incluídos |
| 3 | «include» semanticamente trocados (Transmitir → Acompanhar ciclo de vida; Notificação ligada ao Investidor) | Relações refeitas conforme o enunciado |
| 4 | Nenhum «extend» | «extend» de confirmação de alto valor |
| 5 | "Enviar ordem" sem distinguir compra e venda | Separados (UC05/UC06) |
| 6 | Linguagem do README (Python) divergente do exigido (Java) | Java 21 |
| 7 | Banco de dados "a definir" | PostgreSQL + `schema.sql`, `seed.sql`, `hardening-postgres.sql` |
| 8 | Sem `.gitignore`, `.env.example`, `src/`, `tests/`, `database/`, `docs/requisitos`, `diagrams/` | Estrutura do enunciado criada |
| 9 | `.DS_Store` versionado (lixo de macOS, pode vazar nomes de pastas) | Removidos e ignorados no `.gitignore` |
| 10 | RNFs sem critério mensurável | Critério e evidência por RNF |
| 11 | UML: só 1 dos 7 tipos | Os 7 tipos (casos de uso, atividades, classes de análise e projeto, estados, componentes, sequência) |
| 12 | Nenhum código, banco ou teste | Núcleo Java + JDBC + SQL + 119 testes |

## 3. O que foi acrescentado

- **Código Java 21** (arquitetura hexagonal, sem dependência de framework no núcleo): domínio, serviços de aplicação, 18 portas (interfaces), adaptadores (memória, JDBC), integrações simuladas, interface de console e roteiro de demonstração.
- **Banco relacional:** 12 tabelas com `CHECK`, `UNIQUE`, FKs e índices; carga de referência; endurecimento do PostgreSQL.
- **Segurança:** PBKDF2, TOTP (RFC 6238 validado com os vetores oficiais), RBAC, allowlist, auditoria encadeada por hash, limitação de taxa.
- **Resiliência:** fila durável, *timeout*, *circuit breaker*, recuo exponencial, idempotência nas duas pontas, *outbox*.
- **Evidências:** saída real dos testes, da demonstração, do SQL e do desempenho; análise de pensamento sistêmico; respostas às perguntas DevSecOps.

## 4. Itens que dependem da equipe (não é possível fazer por vocês)

1. **Histórico de commits e autoria:** o enunciado avalia a participação *identificável* de cada integrante. Faça commits reais, com a identidade de cada um (veja [`plano-de-commits.md`](plano-de-commits.md)).
2. **Executar contra PostgreSQL** e anexar a evidência (roteiro no `README.md`, seção "Verificação com PostgreSQL").
3. **Executar o Maven** (`mvn test`) na máquina de vocês e anexar a saída; o ambiente onde o projeto foi preparado não tinha Maven.
4. **Estudar o que entregam:** cada integrante deve conseguir explicar a arquitetura, as regras e ao menos três cenários de falha (ver `analise-pensamento-sistemico.md`).
