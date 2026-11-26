# Revisão da Fase 1 e correções

Revisamos o que entregamos na Fase 1 comparando com o enunciado e com a devolutiva (`FEEDBACK_FASE_1.md`):
*"consolidar requisitos funcionais e não funcionais, critérios de aceitação, regras de negócio, rastreabilidade e o
diagrama de casos de uso no repositório."* Depois, fizemos uma **segunda revisão crítica** da própria entrega e corrigimos
o que encontramos. Este documento registra as duas.

## 1. Atendimento direto à devolutiva

| Pedido | Situação na Fase 1 | Agora |
|---|---|---|
| Requisitos funcionais e não funcionais consolidados | Lista curta no README, sem os IDs do enunciado e sem prioridade | [`requisitos.md`](../requisitos/requisitos.md): 23 RF + 12 RNF, IDs do enunciado preservados, mapeamento dos antigos |
| Critérios de aceitação | Inexistentes | Em cada requisito, verificáveis e ligados a testes; RNFs com números **medidos** |
| Regras de negócio | Inexistentes | [`regras-de-negocio.md`](../requisitos/regras-de-negocio.md): RN01–RN32, com código, local e teste |
| Rastreabilidade | Inexistente | [`matriz-rastreabilidade.md`](../requisitos/matriz-rastreabilidade.md): requisito → caso de uso → diagrama → classe → tabela → teste |
| Diagrama de casos de uso no repositório | Imagem hospedada fora do repositório, não editável | Diagrama **versionado e editável** em `docs/uml/casos-de-uso/`, com verificador de cruzamentos |

## 2. Problemas que encontramos no que existia

| # | Problema | Correção |
|---|---|---|
| 1 | Casos de uso com apenas 3 dos 7 atores obrigatórios | 7 atores |
| 2 | Faltavam casos de uso obrigatórios (MFA, saldo, gerenciar ativos/limites, verificar saldo/posição) | Incluídos |
| 3 | «include» semanticamente trocados (Transmitir → Acompanhar ciclo de vida; Notificação ligada ao Investidor) | Relações refeitas conforme o enunciado |
| 4 | Nenhum «extend» | «extend» de confirmação de alto valor |
| 5 | "Enviar ordem" sem distinguir compra e venda | Separados (UC05/UC06) |
| 6 | README em Python; o enunciado exige Java | Java 21 |
| 7 | Banco de dados "a definir" | PostgreSQL + `schema.sql`, `seed.sql`, `hardening-postgres.sql` |
| 8 | Sem `.gitignore`, `.env.example`, `src/`, `tests/`, `database/`, `docs/requisitos`, `diagrams/` | Estrutura do enunciado criada |
| 9 | `.DS_Store` versionado (lixo de macOS, pode vazar nomes de pastas) | Removidos e ignorados |
| 10 | RNFs sem critério mensurável | Critério e evidência por RNF |
| 11 | UML: apenas 1 dos 7 tipos | Os 7 tipos |
| 12 | Nenhum código, banco ou teste | Núcleo Java + JDBC + SQL + testes automatizados |

## 3. Segunda revisão crítica (autocrítica da nossa entrega)

Depois de montar a solução, a revisamos como o avaliador faria e encontramos 7 fragilidades. O que fizemos com cada uma:

| # | Fragilidade | O que fizemos | Situação |
|---|---|---|---|
| 1 | Testes escritos, mas executados só com um executor próprio compatível com JUnit 5 (o ambiente de montagem não tinha Maven) | Mantivemos os testes na API padrão do JUnit 5 (`mvn test`) e registramos a saída que temos. | **Pendente:** rodar `mvn test` na nossa máquina e anexar a saída |
| 2 | Camada PostgreSQL nunca executada contra um banco real | Escrevemos `PostgresIntegracaoTest` (fluxo completo + concorrência real), que roda com um comando e se ignora sem banco; validamos os 45 comandos SQL contra o esquema. | **Pendente:** executar e anexar a saída |
| 3 | Só havia interface de console | Criamos **API REST + interface web** (servidor HTTP do JDK, sem dependências), testadas por 14 testes de API, 6 de JSON e por um teste em navegador real (10 passos, sem erro de console/CSP). | Feito |
| 4 | Segredo MFA em texto puro no banco | **AES-256-GCM** com chave em variável de ambiente; com PostgreSQL o sistema recusa iniciar sem a chave; valor adulterado nunca autentica. | Feito |
| 5 | Sem ordem a mercado e **sem alteração de ordem** — o enunciado pede "criação, consulta, **atualização** e cancelamento" | Implementamos **alteração (cancelar e substituir)** e **ordem a mercado** (preço de proteção). | Feito |
| 6 | Alguns documentos estavam redigidos como instruções dirigidas a terceiros, e não como registro do nosso trabalho | Reescrevemos na primeira pessoa da equipe e transformamos a lista de pendências em um checklist de entrega (§4). | Feito |
| 7 | Diagrama de casos de uso com linhas cruzando elipses | Gerador com **verificador geométrico**: 0 de 45 linhas atravessam elipse alheia. A atribuição de "gerenciar limites" ao Administrador **e** ao Analista segue a tabela de atores do enunciado; ajustamos o texto do RF15 para ficar coerente com o diagrama e o código. | Feito |

Também, na revisão, um dos novos testes revelou uma falha real nossa: `String.trim()` removia caracteres de controle nas pontas
(`"PETR4\u0000"` era aceito como `PETR4`). Passamos a usar `strip()` e a **rejeitar** controles em vez de normalizá-los (teste de regressão em `ValidacoesTest`).

## 4. Checklist de entrega (pendências da equipe)

- [ ] Rodar `mvn test` e anexar a saída em `docs/evidencias/`.
- [ ] Subir o PostgreSQL (`docker compose up -d`), rodar `mvn test -Dtest=PostgresIntegracaoTest` e anexar a saída.
- [ ] Gerar `MFA_ENCRYPTION_KEY` e testar a execução com `SENTINEL_STORAGE=jdbc`.
- [ ] Ativar o GitHub Actions e anexar uma execução da esteira.
- [ ] Conferir o histórico de commits e a participação de cada integrante ([`plano-de-commits.md`](plano-de-commits.md)).
- [ ] Ensaiar a defesa: cada integrante explica a arquitetura, as regras de negócio e ao menos três cenários de falha.

## 5. O que foi acrescentado

- **Código Java 21** (arquitetura hexagonal, sem framework no núcleo): domínio, serviços de aplicação, 18 portas, adaptadores (memória, JDBC), integrações simuladas, console, API REST e interface web.
- **Banco relacional:** 12 tabelas com `CHECK`, `UNIQUE`, chaves estrangeiras e índices; carga de referência; endurecimento do PostgreSQL.
- **Segurança:** PBKDF2, TOTP (vetores da RFC 6238), segredo MFA cifrado, RBAC, allowlist, auditoria encadeada por hash, limitação de taxa, CSP.
- **Resiliência:** fila durável, *timeout*, *circuit breaker*, recuo exponencial, idempotência nas duas pontas, *outbox*.
- **Evidências:** saída real dos testes, da demonstração, do SQL, do desempenho e da interface web (com capturas de tela).
