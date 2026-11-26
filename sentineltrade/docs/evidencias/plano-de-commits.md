# Plano de commits sugerido

O enunciado pede *"histórico de commits coerente com a evolução do projeto"* e *"participação identificável de cada
integrante"*. Um histórico só vale se for **verdadeiro**: cada commit deve ser feito, com a conta de Git de quem de fato
fez o trabalho. Abaixo, uma sequência lógica (mensagens no padrão do enunciado) e uma divisão sugerida entre os dois integrantes.

> Configure cada máquina com a própria identidade: `git config user.name "Seu Nome"` e `git config user.email "seu@email"`.
> **Não** reescreva o histórico para simular autoria. Se um integrante revisou e aprovou o trabalho do outro, use *Pull Requests*
> com revisão — isso também é participação identificável.

## Sequência (cada linha = 1 commit ou 1 PR pequeno)

| # | Mensagem | Conteúdo | Sugestão |
|---|---|---|---|
| 1 | `chore: adiciona .gitignore e .env.example` | `.gitignore`, `.env.example` | Integrante A |
| 2 | `docs: reorganiza README (Java, PostgreSQL, equipe, aviso de simulação)` | `README.md` | A |
| 3 | `docs: consolida requisitos funcionais e não funcionais com critérios de aceitação` | `docs/requisitos/requisitos.md` | A |
| 4 | `docs: adiciona regras de negócio RN01-RN26` | `regras-de-negocio.md` | B |
| 5 | `uml: corrige diagrama de casos de uso (7 atores, include/extend)` | `docs/uml/casos-de-uso/`, `diagrams/` | B |
| 6 | `docs: descreve casos de uso críticos (compra, venda, cancelamento)` | `casos-de-uso/README.md` | A |
| 7 | `uml: inclui diagramas de atividades, estados e sequência` | `docs/uml/{atividades,estados,sequencia}` | B |
| 8 | `uml: inclui classes de análise, classes de projeto e componentes` | `docs/uml/{classes-*,componentes}` | A |
| 9 | `docs: adiciona matriz de rastreabilidade` | `matriz-rastreabilidade.md` | A |
| 10 | `db: adiciona estrutura inicial de usuários, contas, ordens e auditoria` | `database/schema.sql` | B |
| 11 | `db: adiciona carga de referência e endurecimento do PostgreSQL` | `seed.sql`, `hardening-postgres.sql`, `docker-compose.yml` | B |
| 12 | `feat: cria entidades de domínio e máquina de estados da ordem` | `src/.../dominio/` | A |
| 13 | `test: cobre transições de estado e reserva/liquidação de ordens` | `tests/.../dominio/` | A |
| 14 | `feat: adiciona validação de entrada por allowlist` | `Validacoes`, `Sanitizador` + testes | B |
| 15 | `feat: implementa autenticação com PBKDF2 e MFA (TOTP)` | `AutenticacaoService`, `infraestrutura/seguranca` + testes | B |
| 16 | `feat: implementa trilha de auditoria com hash encadeado` | `AuditoriaService` + testes | A |
| 17 | `feat: implementa envio, cancelamento e consulta de ordens` | `OrdemService`, `ValidadorOrdem` + testes | A |
| 18 | `feat: adiciona motor assíncrono, fila e liquidação idempotente` | `ProcessadorOrdens` + testes | A |
| 19 | `feat: adiciona corretora simulada com timeout e circuit breaker` | `infraestrutura/integracao` + testes | B |
| 20 | `feat: adiciona persistência JDBC com concorrência otimista` | `infraestrutura/jdbc` | B |
| 21 | `feat: adiciona interface de console e roteiro de demonstração` | `interfacecli/`, `Main` | A |
| 22 | `ci: adiciona esteira (testes, gitleaks, dependency-check)` | `.github/workflows/ci.yml`, `pom.xml` | B |
| 23 | `docs: anexa evidências (testes, demonstração, SQL, desempenho)` | `docs/evidencias/` | ambos |

## Como conferir a participação antes de entregar

```bash
git shortlog -sne --all          # commits por integrante
git log --oneline --graph        # sequência e coerência
git log --stat --author="Nome"   # o que cada um alterou
```
Evidência para o relatório: capturas dessas três saídas na pasta `docs/evidencias/`.
