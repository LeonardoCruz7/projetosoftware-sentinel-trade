# Convenção de commits e etapas de entrega

O enunciado avalia *"histórico de commits coerente com a evolução do projeto"* e *"participação identificável de cada
integrante"*. Esta é a convenção que adotamos para que o histórico reflita o trabalho real de cada um de nós.

## Regras da equipe

1. **Cada commit é feito por quem fez o trabalho**, com a própria identidade de Git (`git config user.name` / `user.email` em cada máquina). Não reescrevemos histórico para simular autoria.
2. **Commits pequenos e progressivos**, com mensagem no padrão do enunciado: `docs:`, `uml:`, `db:`, `feat:`, `test:`, `fix:`, `chore:`, `ci:`.
3. **Uma etapa = um Pull Request**, revisado pelo outro integrante. A revisão também conta como participação identificável.
4. **Nunca** versionamos senhas, tokens, chaves nem `.env` (o `.gitignore` e a esteira de *gitleaks* protegem).
5. Cada PR informa **quem implementou** e **quem revisou**.

## Etapas de entrega (ordem lógica da evolução do projeto)

| # | Mensagem de commit | Conteúdo |
|---|---|---|
| 1 | `chore: adiciona .gitignore e .env.example` | `.gitignore`, `.env.example` |
| 2 | `docs: reorganiza README (Java, PostgreSQL, equipe, aviso de simulação)` | `README.md` |
| 3 | `docs: consolida requisitos funcionais e não funcionais com critérios de aceitação` | `docs/requisitos/requisitos.md` |
| 4 | `docs: adiciona regras de negócio` | `regras-de-negocio.md` |
| 5 | `uml: corrige diagrama de casos de uso (7 atores, include/extend)` | `docs/uml/casos-de-uso/`, `diagrams/` |
| 6 | `docs: descreve casos de uso críticos (compra, venda, cancelamento, alteração)` | `casos-de-uso/README.md` |
| 7 | `uml: inclui diagramas de atividades, estados e sequência` | `docs/uml/{atividades,estados,sequencia}` |
| 8 | `uml: inclui classes de análise, classes de projeto e componentes` | `docs/uml/{classes-*,componentes}` |
| 9 | `docs: adiciona matriz de rastreabilidade` | `matriz-rastreabilidade.md` |
| 10 | `db: adiciona estrutura de usuários, contas, ordens e auditoria` | `database/schema.sql` |
| 11 | `db: adiciona carga de referência e endurecimento do PostgreSQL` | `seed.sql`, `hardening-postgres.sql`, `docker-compose.yml` |
| 12 | `feat: cria entidades de domínio e máquina de estados da ordem` | `src/.../dominio/` |
| 13 | `test: cobre transições de estado e reserva/liquidação de ordens` | `tests/.../dominio/` |
| 14 | `feat: adiciona validação de entrada por allowlist` | `Validacoes`, `Sanitizador` + testes |
| 15 | `feat: implementa autenticação com PBKDF2 e MFA (TOTP)` | `AutenticacaoService`, `infraestrutura/seguranca` + testes |
| 16 | `feat: cifra o segredo MFA com AES-256-GCM` | `CifradorSegredo` + testes |
| 17 | `feat: implementa trilha de auditoria com hash encadeado` | `AuditoriaService` + testes |
| 18 | `feat: implementa envio, cancelamento e consulta de ordens` | `OrdemService`, `ValidadorOrdem` + testes |
| 19 | `feat: adiciona ordem a mercado e alteração de ordem` | `OrdemService`, `TipoOrdem` + testes |
| 20 | `feat: adiciona motor assíncrono, fila e liquidação idempotente` | `ProcessadorOrdens` + testes |
| 21 | `feat: adiciona corretora simulada com timeout e circuit breaker` | `infraestrutura/integracao` + testes |
| 22 | `feat: adiciona persistência JDBC com concorrência otimista` | `infraestrutura/jdbc`, `PostgresIntegracaoTest` |
| 23 | `feat: adiciona interface de console e roteiro de demonstração` | `interfacecli/`, `Main` |
| 24 | `feat: adiciona API REST e interface web` | `interfaceweb/`, `src/main/resources/web/` + testes |
| 25 | `ci: adiciona esteira (testes, gitleaks, dependency-check)` | `.github/workflows/ci.yml`, `pom.xml` |
| 26 | `docs: anexa evidências (testes, demonstração, SQL, desempenho, interface)` | `docs/evidencias/` |

## Como conferimos a participação antes de entregar

```bash
git shortlog -sne --all          # commits por integrante
git log --oneline --graph        # sequência e coerência
git log --stat --author="Nome"   # o que cada um alterou
```
Anexamos a saída desses três comandos em `docs/evidencias/` como evidência.
