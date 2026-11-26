# SentinelTrade

Sistema de trade financeiro de **alta criticidade**, desenvolvido como exercício integrador acadêmico para a corretora
fictícia **Orion Capital**.

> ⚠️ **Projeto acadêmico. Opera exclusivamente com dados e operações SIMULADOS.**
> Não utiliza dinheiro real, bolsa real, corretora real nem dados financeiros ou pessoais reais.

## Integrantes

| Nome | RA |
|---|---|
| Leonardo Aquino Cruz | 10445016 |
| Victor Esteves Gallo Birello | 10737139 |

## Objetivo

Plataforma que permite a investidores autenticados (**senha + segundo fator**) acompanhar cotações e carteira e enviar
ordens de compra e venda, **respeitando saldo, posição, limites de risco e situação do mercado**, de forma que toda ordem seja
**rastreável, nunca duplicada** e **auditada**. Falhas de sistemas externos (corretora, provedor de cotações) não podem
corromper ordens, saldos ou posições.

## Tecnologias

| Item | Escolha |
|---|---|
| Linguagem | **Java 21** |
| Banco de dados | **PostgreSQL 14+** (SQL padrão; `database/schema.sql`). Também há modo em memória, para testes e demonstração |
| Acesso a dados | JDBC puro com `PreparedStatement` (consultas parametrizadas) e concorrência otimista |
| Build e testes | Maven + **JUnit 5** |
| Dependências | Apenas 2: driver `org.postgresql:postgresql` (runtime) e `junit-jupiter` (teste). O núcleo usa só o JDK |
| Segurança | PBKDF2-HMAC-SHA256, TOTP (RFC 6238), SHA-256 — todos do JDK |
| Versionamento / CI | Git/GitHub · GitHub Actions (testes, *gitleaks*, OWASP Dependency-Check) |
| Diagramas | Mermaid e Graphviz (fontes versionadas em `docs/uml/`) |

## Como executar

Pré-requisito: **JDK 21**. (Maven é opcional para executar; necessário para os testes via `mvn`.)

### A) Demonstração automatizada — sem banco, sem Maven
```bash
# Linux/macOS
javac -d out $(find src/main/java -name "*.java")
java -cp out br.orion.sentineltrade.Main --demo
```
```powershell
# Windows (PowerShell)
javac -d out (Get-ChildItem -Recurse src/main/java -Filter *.java).FullName
java -cp out br.orion.sentineltrade.Main --demo
```
Roda um roteiro de 14 cenários (autenticação, compra/venda, idempotência, rejeições, confirmação de alto valor,
execução parcial, cancelamento, falha da corretora, cotação corrompida, mercado fechado, privacidade, entradas maliciosas
e auditoria). A saída esperada está em [`docs/evidencias/demo-execucao.txt`](docs/evidencias/demo-execucao.txt).

### B) Interface Web (com Login + MFA)
```bash
# Compilação direta com JDK 21+ (sem Maven)
javac -d out $(find src/main/java -name "*.java")
java -cp out br.orion.sentineltrade.Main --web
# Acesse no navegador: http://127.0.0.1:8080  (ou --port=9090 para outra porta)
```
Ou via Maven:
```bash
mvn -q compile exec:java -Dexec.args="--web"
```
Mostra a tela de login em dois fatores (senha + TOTP de 6 dígitos com "Autenticador Simulado" em modo demonstração) e painéis completos para **Investidor**, **Administrador** e **Analista de Risco**.

### C) Console interativo (dados em memória)
```bash
java -cp out br.orion.sentineltrade.Main
```
Mostra as contas de demonstração (senhas **geradas aleatoriamente** a cada execução) e um "autenticador simulado" que exibe o
código MFA do momento. Perfis: Investidor, Administrador, Analista de Risco.

### D) Com Maven
```bash
mvn test                                              # 119 testes
mvn -q compile exec:java                              # console interativo
mvn -q compile exec:java -Dexec.args="--demo"         # demonstração
mvn -Pseguranca verify                                # + OWASP Dependency-Check (falha com CVSS >= 7)
```

### E) Com PostgreSQL
```bash
cp .env.example .env            # preencha DB_USER e DB_PASSWORD (o .env NÃO é versionado)
docker compose up -d            # sobe o PostgreSQL e executa schema.sql + seed.sql
# defina em .env:  SENTINEL_STORAGE=jdbc   SENTINEL_DEMO=true   (SENTINEL_DEMO cria usuários SIMULADOS na 1ª execução)
set -a; source .env; set +a     # exporta as variáveis (Linux/macOS)
mvn -q compile exec:java
```
Opcional: `psql -d sentineltrade -v app_password="$APP_DB_PASSWORD" -f database/hardening-postgres.sql` cria um papel de menor
privilégio e bloqueia `UPDATE/DELETE/TRUNCATE` na trilha de auditoria.

#### Verificação com PostgreSQL (roteiro de aceitação)
1. `docker compose up -d` conclui sem erro e `\dt` lista 12 tabelas.
2. Executar o item D; autenticar com um usuário de demonstração; enviar uma ordem de compra (mercado aberto) e consultar o histórico.
3. Reiniciar a aplicação e confirmar que a ordem e o saldo **persistiram** (modo `jdbc`).
4. Com `hardening-postgres.sql` aplicado, `UPDATE auditoria SET detalhes='x'` deve falhar ("A trilha de auditoria é imutável").
5. Anexar as saídas em `docs/evidencias/`.

> A camada JDBC teve **seus 45 comandos SQL validados contra o `schema.sql`** (`docs/evidencias/validacao-sql.txt`).
> A execução completa contra um PostgreSQL real é o passo 1–4 acima.

## Variáveis de ambiente

Ver [`.env.example`](.env.example) (somente nomes). **Nenhum segredo está no código nem no repositório.**

## Organização das pastas

```
sentineltrade/
├── README.md · .gitignore · .env.example · pom.xml · docker-compose.yml · FEEDBACK_FASE_1.md
├── .github/workflows/ci.yml        esteira DevSecOps
├── src/main/java/br/orion/sentineltrade/
│   ├── dominio/                    entidades, objetos de valor, máquina de estados, exceções
│   ├── aplicacao/servico/          casos de uso e serviços (regras de negócio)
│   ├── aplicacao/porta/            interfaces (repositórios, corretora, cotações, hash, MFA, transação, fila)
│   ├── infraestrutura/             adaptadores: memoria/ · jdbc/ · integracao/ · seguranca/
│   ├── interfacecli/               console interativo e roteiro de demonstração
│   └── Main · Aplicacao · Config · DadosDemonstracao
├── tests/                          119 testes JUnit 5 das regras críticas
├── database/                       schema.sql · seed.sql · hardening-postgres.sql
├── diagrams/                       exportações PNG de todos os UML (+ legado/ da Fase 1)
└── docs/
    ├── requisitos/                 requisitos.md · regras-de-negocio.md · matriz-rastreabilidade.md
    ├── uml/                        casos-de-uso · atividades · classes-analise · classes-projeto · estados · componentes · sequencia
    └── evidencias/                 testes, demonstração, SQL, desempenho, análises e plano de commits
```
(Os testes ficam em `tests/` — e não em `src/test` — conforme a estrutura pedida no enunciado; o `pom.xml` aponta para essa pasta.)

## Arquitetura

Arquitetura **hexagonal** (portas e adaptadores): o núcleo de regras depende só de interfaces; banco, corretora, cotações,
notificação e criptografia são adaptadores trocáveis. Diagrama: [`docs/uml/componentes`](docs/uml/componentes/README.md).

```
Interface (CLI) ─► Serviços de aplicação ─► Portas (interfaces) ─► Adaptadores ─► PostgreSQL / Corretora / Cotações
                    (regras de negócio)                            (JDBC · memória · simulados)
```

## Segurança (requisitos do enunciado → implementação)

| Requisito | Implementação |
|---|---|
| Senhas protegidas por hash | PBKDF2-HMAC-SHA256, 600.000 iterações, salt de 16 bytes por senha |
| MFA | TOTP (RFC 6238), validado com os vetores oficiais; sessão pendente → ativa com troca de token |
| Controle de acesso por perfil | `AutenticacaoService.exigir(token, papéis…)` em todo caso de uso, no servidor |
| Atributos privados | Entidades encapsuladas; mutação só por métodos de negócio |
| Validação de entradas | *Allowlist* por campo (`Validacoes`), antes de qualquer processamento |
| Tratamento seguro de exceções | Mensagens seguras ao usuário; detalhes só no log; login com mensagem única |
| Prevenção de injeção | `PreparedStatement` em 100% do SQL; saída de log/terminal sanitizada |
| Reenvio / duplicidade de ordem | Chave de idempotência + `UNIQUE` no banco + idempotência na corretora |
| Ausência de segredos no repositório | Variáveis de ambiente; `.env` ignorado; senhas de demonstração aleatórias |
| Auditoria imutável | Hash SHA-256 encadeado + bloqueio de `UPDATE/DELETE` no PostgreSQL |

Respostas às perguntas reflexivas do enunciado: [`docs/evidencias/perguntas-devsecops.md`](docs/evidencias/perguntas-devsecops.md).

## Resiliência

*Timeout* por chamada · *circuit breaker* · fila durável (*outbox*) · retentativa com recuo exponencial (5 tentativas) ·
idempotência nas duas pontas · consumo idempotente de execuções · modo de indisponibilidade segura (ordem nunca se perde;
cotação velha bloqueia negociação) · transações que confirmam ordem + reserva + fila + auditoria juntas.

## Pensamento sistêmico

Análise da equipe, com tabela "se falhar X → efeito → contenção → teste": [`docs/evidencias/analise-pensamento-sistemico.md`](docs/evidencias/analise-pensamento-sistemico.md).

## Documentação

| Documento | Local |
|---|---|
| Requisitos (RF/RNF com critérios de aceitação) | [`docs/requisitos/requisitos.md`](docs/requisitos/requisitos.md) |
| Regras de negócio | [`docs/requisitos/regras-de-negocio.md`](docs/requisitos/regras-de-negocio.md) |
| Matriz de rastreabilidade | [`docs/requisitos/matriz-rastreabilidade.md`](docs/requisitos/matriz-rastreabilidade.md) |
| UML (7 tipos) | [`docs/uml/`](docs/uml/) |
| Evidências | [`docs/evidencias/`](docs/evidencias/) |
| Correções em relação à Fase 1 | [`docs/evidencias/correcoes-fase1.md`](docs/evidencias/correcoes-fase1.md) |

## Escopo e limites assumidos

- Interface em **console**; não há camada web/REST nesta versão (as portas permitem acrescentá-la sem alterar as regras).
- Somente ordens a **preço limite**; feriados não são modelados; mercado simulado.
- Segredo MFA armazenado sem cifra adicional (em produção: cifrar com KMS/HSM).
- O adaptador em memória não desfaz alterações em caso de erro; a atomicidade real é a do JDBC/PostgreSQL.
- Não há monitoramento/alertas (apenas auditoria e estados observáveis).
