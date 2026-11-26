# Regras de negócio

**RN01–RN08 vêm do enunciado**; RN09–RN26 são decisões da equipe que detalham as validações exigidas (saldo, posição,
limite de risco, situação do mercado) e a resiliência. Cada regra tem **código estável** (`CodigoRegra`, quando gera
rejeição), o ponto do código onde é aplicada e o teste que a verifica.

| ID | Regra | Código / onde é aplicada | Req. | Teste |
|---|---|---|---|---|
| **RN01** | Uma ordem de **compra** exige saldo disponível ≥ quantidade × preço informado. | `SALDO_INSUFICIENTE` · `OrdemCompra.reservar` → `Conta.bloquear` | RF05 | `OrdemTest.compraSemSaldoNaoAlteraNada`, `OrdemServiceTest.compraSemSaldoEhRejeitadaERegistrada` |
| **RN02** | Uma ordem de **venda** exige posição **disponível** do ativo (total − já reservada). | `POSICAO_INSUFICIENTE` · `OrdemVenda.reservar` → `Posicao.bloquear` | RF06 | `OrdemTest.vendaBloqueiaAQuantidade…`, `OrdemServiceTest.vendaExigePosicaoDisponivel…` |
| **RN03** | A mesma ordem não pode ser processada ou executada duas vezes. Reenvio com a mesma chave devolve a ordem existente; chave reutilizada com outro conteúdo é conflito; a execução da corretora é aplicada uma única vez (`idExecucao`). | `UNIQUE(investidor_id, chave_idempotencia)` · `OrdemService.registrar` · `ExecucaoRepositorio.registrarSeNova` | RNF06 | `OrdemServiceTest.reenvioComAMesmaChave…`, `…envioSimultaneo…`, `ProcessadorOrdensTest.relatorioDuplicado…` |
| **RN04** | Uma ordem EXECUTADA, REJEITADA ou CANCELADA **não pode retornar** a estado anterior. | `TRANSICAO_INVALIDA` · `StatusOrdem` (tabela de transições) | RF09 | `StatusOrdemTest.estadosTerminaisNuncaVoltam`, `OrdemTest.ordemRejeitadaOuCancelada…` |
| **RN05** | Toda mudança de estado da ordem gera evento de auditoria. | `AuditoriaService.registrar` na mesma transação | RF10 | `AuditoriaServiceTest.mudancasDeEstadoDaOrdemGeramAuditoria` |
| **RN06** | O acesso administrativo é restrito a usuários com perfil autorizado. | `AutenticacaoService.exigir(token, papéis…)` · `AcessoNegadoException` | RNF01 | `AdministracaoRiscoTest.funcoesAdministrativasExigemPerfilAdministrador` |
| **RN07** | A indisponibilidade da corretora **não apaga a ordem nem altera indevidamente a carteira**: a ordem permanece na fila; esgotadas as tentativas, é rejeitada e a reserva devolvida integralmente. | `FALHA_INTEGRACAO` · `ProcessadorOrdens.tratarFalhaEnvio` | RNF04 | `ProcessadorOrdensTest.corretoraIndisponivelNaoApagaAOrdem…` |
| **RN08** | O investidor somente consulta e altera as **próprias** informações. | `OrdemService.doInvestidor`; investidor sempre derivado da sessão | RNF08 | `PrivacidadeEAcessoTest` |
| **RN09** | O valor de uma ordem não pode exceder o **limite por ordem** do investidor. | `LIMITE_POR_ORDEM_EXCEDIDO` · `ValidadorOrdem.validarRisco` | RF08 | `OrdemServiceTest.limitePorOrdemEhAplicado` |
| **RN10** | A soma das ordens do dia (VALIDADA, ENVIADA, PARCIAL, EXECUTADA) mais a nova não pode exceder o **limite diário**. Ordens canceladas/rejeitadas liberam o limite. | `LIMITE_DIARIO_EXCEDIDO` · `OrdemRepositorio.valorNegociadoNoPeriodo` | RF08 | `OrdemServiceTest.limiteDiarioConsideraAsOrdensDoDia` |
| **RN11** | Ordem acima do **valor de confirmação** (e dentro do máximo por ordem) só é criada com confirmação explícita. | `ConfirmacaoNecessariaException` · `OrdemService.enviarOrdem` | RF18 | `OrdemServiceTest.ordemDeAltoValorExigeConfirmacaoAdicional` |
| **RN12** | Só se negocia com o **mercado aberto** (dias úteis, janela configurável; padrão 10:00–17:55, horário de Brasília). | `MERCADO_FECHADO` · `CalendarioMercado` | RF08 | `OrdemServiceTest.mercadoFechadoRejeitaAOrdem` |
| **RN13** | Só se negocia ativos cadastrados e com status ATIVO. | `ATIVO_INDISPONIVEL` · `ValidadorOrdem.validarMercado` | RF08, RF12 | `OrdemServiceTest.ativoSuspensoOuDesconhecido…` |
| **RN14** | Não se negocia com cotação **desatualizada** (idade > parâmetro, padrão 60 s) nem sem cotação. | `COTACAO_DESATUALIZADA`, `COTACAO_INDISPONIVEL` | RF08, RNF04 | `OrdemServiceTest.cotacaoDesatualizada…`, `…provedorDeCotacoesForaDoAr…` |
| **RN15** | O preço limite deve estar na **faixa** da cotação (padrão ±10%): protege contra erro de digitação. | `PRECO_FORA_DA_FAIXA` | RF08 | `OrdemServiceTest.precoForaDaFaixa…`, `AdministracaoRiscoTest.faixaDePreco…` |
| **RN16** | Ao validar a ordem, **reserva-se** saldo (compra) ou quantidade (venda); a reserva é devolvida em rejeição ou cancelamento (somente o **restante**, se parcialmente executada). | `Ordem.reservarEValidar`, `Ordem.cancelar/rejeitar` | RF05–RF07 | `OrdemTest.cancelarOrdemParcial…`, `OrdemServiceTest.cancelarOrdemParcialmente…` |
| **RN17** | Execução a preço melhor que o limite **devolve a diferença**. Execução inconsistente com o limite ou com a quantidade restante é **recusada** (dado externo não confiável). | `Ordem.aplicarExecucao` → `RespostaInvalidaException` | RF17 | `OrdemTest.execucoesParciais…`, `ProcessadorOrdensTest.execucaoInconsistente…` |
| **RN18** | Execução que chega para ordem já em estado terminal **não altera saldo**: vira anomalia auditada para conciliação manual. | `ANOMALIA_EXECUCAO` · `ProcessadorOrdens` | RF17 | `ProcessadorOrdensTest.execucaoParaOrdemJaCancelada…` |
| **RN19** | O envio à corretora tem **até 5 tentativas**, com recuo exponencial (2 s, 4 s, 8 s… máx. 60 s), sob *timeout* e *circuit breaker*. | `ProcessadorOrdens.MAX_TENTATIVAS_ENVIO`, `CorretoraResiliente` | RF16 | `ProcessadorOrdensTest.backoffExponencialLimitado`, `CorretoraResilienteTest` |
| **RN20** | Após **5 falhas** de login a conta é bloqueada por **15 min**; qualquer falha recebe mensagem única. | `Usuario.registrarFalhaLogin` · `AutenticacaoService` | RF01 | `AutenticacaoServiceTest.bloqueioTemporario…`, `…MensagemIdentica` |
| **RN21** | O MFA admite **3 tentativas**; a sessão pendente vale 5 min e é de uso único; a sessão ativa vale 15 min e muda de token após o MFA. | `AutenticacaoService` | RF02 | `AutenticacaoServiceTest.tresCodigosMfaErrados…`, `…tokenPendenteSoServePraUmaConfirmacao` |
| **RN22** | Senhas: 12–128 caracteres, com maiúscula, minúscula, número e símbolo; fora de lista de senhas comuns e sem o identificador do e-mail. | `Validacoes.senha` | RNF01 | `ValidacoesTest.politicaDeSenha` |
| **RN23** | Dados vindos do provedor de cotações são revalidados (ativo, preço, fechamento, data, variação ≤ 50%); dado inválido **nunca** substitui a última cotação válida. | `CotacaoService.validarExterna` | RNF01 | `CotacaoServiceTest.dadosCorrompidos…` |
| **RN24** | Cancelamento é **idempotente** e, para ordem já enviada, só se conclui após a corretora aceitar; se ela estiver fora do ar, a ordem **não** é cancelada. | `OrdemService.cancelarOrdem` | RF07 | `OrdemServiceTest.cancelamentoEhIdempotente`, `…corretoraForaDoAr…` |
| **RN25** | O envio de ordens é limitado em frequência (padrão 30/min por investidor). | `LimitadorDeTaxa` · parâmetro `ordem.max_por_minuto` | RNF01 | `OrdemServiceTest.limiteDeFrequenciaDeEnvioDeOrdens` |
| **RN26** | Alterações de ativos, parâmetros e limites só são aceitas com chaves/valores **válidos** (allowlist) e ficam auditadas. | `ParametrosSistema.definir`, `RiscoService` | RF12, RF15 | `AdministracaoRiscoTest.parametrosSoAceitam…`, `…limitesIncoerentes…` |

## Ordem de aplicação das validações (RF08)

1. **Entrada** (formato, tamanho, tipo, intervalo) — antes de qualquer processamento.
2. **Idempotência** — reenvio devolve a ordem existente, sem reprocessar.
3. **Confirmação** de alto valor.
4. **Mercado** (RN13, RN12, RN14, RN15) — depende de sistemas externos, por isso roda **fora da transação** de banco.
5. **Transação:** cria a ordem → **risco** (RN09, RN10) → **reserva** (RN01/RN02) → fila + auditoria.

Qualquer falha nos passos 4–5 gera ordem **REJEITADA com motivo** (persistida, auditada, notificada), nunca um erro silencioso.
