package br.orion.sentineltrade.aplicacao.servico;

import br.orion.sentineltrade.aplicacao.porta.*;
import br.orion.sentineltrade.aplicacao.porta.Repositorios.*;
import br.orion.sentineltrade.aplicacao.servico.Validacoes.OrdemValidada;
import br.orion.sentineltrade.dominio.*;
import br.orion.sentineltrade.dominio.Excecoes.*;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Casos de uso do investidor sobre ordens: enviar compra/venda, cancelar, consultar status e histórico.
 *
 * Garantias: validação no servidor; idempotência por chave (reenvio não duplica); reserva atômica de
 * saldo/posição; auditoria na mesma transação; o investidor só enxerga as próprias ordens.
 */
public final class OrdemService {
    public record ResultadoEnvio(Ordem ordem, boolean duplicada) {}

    private final AutenticacaoService auth;
    private final GerenciadorTransacao tx;
    private final OrdemRepositorio ordens;
    private final ContaRepositorio contas;
    private final PosicaoRepositorio posicoes;
    private final LimiteRiscoRepositorio limites;
    private final ExecucaoRepositorio execucoes;
    private final FilaOrdens fila;
    private final ValidadorOrdem validador;
    private final AuditoriaService auditoria;
    private final NotificacaoService notificacoes;
    private final CorretoraGateway corretora;
    private final ProcessadorOrdens processador;
    private final LimitadorDeTaxa limitador;
    private final ParametrosSistema params;
    private final Clock clock;
    private final ZoneId zona;

    public OrdemService(AutenticacaoService auth, GerenciadorTransacao tx, OrdemRepositorio ordens, ContaRepositorio contas,
                        PosicaoRepositorio posicoes, LimiteRiscoRepositorio limites, ExecucaoRepositorio execucoes,
                        FilaOrdens fila, ValidadorOrdem validador, AuditoriaService auditoria, NotificacaoService notificacoes,
                        CorretoraGateway corretora, ProcessadorOrdens processador, LimitadorDeTaxa limitador,
                        ParametrosSistema params, Clock clock, ZoneId zona) {
        this.auth = auth; this.tx = tx; this.ordens = ordens; this.contas = contas; this.posicoes = posicoes;
        this.limites = limites; this.execucoes = execucoes; this.fila = fila; this.validador = validador;
        this.auditoria = auditoria; this.notificacoes = notificacoes; this.corretora = corretora;
        this.processador = processador; this.limitador = limitador; this.params = params; this.clock = clock; this.zona = zona;
    }

    // ------------------------------------------------------------------ enviar
    public ResultadoEnvio enviarOrdem(String token, SolicitacaoOrdem solicitacao) {
        Sessao sessao = auth.exigir(token, Papel.INVESTIDOR);
        UUID inv = sessao.usuarioId();
        limitador.registrar("ordem:" + inv, params.inteiro(ParametrosSistema.ORDEM_MAX_POR_MINUTO), Duration.ofMinutes(1));

        OrdemValidada p = Validacoes.ordem(solicitacao);                     // 1) allowlist, no servidor
        String impressao = p.impressaoDigital();

        Optional<Ordem> existente = ordens.buscarPorChave(inv, p.chave());   // 2) idempotência (leitura rápida)
        if (existente.isPresent()) return duplicada(inv, existente.get(), impressao);

        LimiteRisco limite = limites.buscar(inv).orElseThrow(() -> new RegraNegocioException(CodigoRegra.LIMITE_NAO_CONFIGURADO));
        Dinheiro valor = p.preco().vezes(p.quantidade());
        if (!p.confirmada() && valor.compareTo(limite.valorConfirmacao()) > 0 && valor.compareTo(limite.valorMaximoPorOrdem()) <= 0)
            throw new ConfirmacaoNecessariaException("Ordem de " + valor.formatado() + " exige confirmação adicional (limite sem confirmação: "
                    + limite.valorConfirmacao().formatado() + ")");               // «extend»

        Instant agora = clock.instant();
        RegraNegocioException falhaMercado = null;                            // 3) validações externas FORA da transação
        try { validador.validarMercado(p.ticker(), p.preco(), agora); }
        catch (RegraNegocioException e) { falhaMercado = e; }
        final RegraNegocioException falha = falhaMercado;

        return Retentativa.comConflito(3, () -> tx.executar(() -> registrar(inv, p, impressao, falha)));
    }

    private ResultadoEnvio registrar(UUID inv, OrdemValidada p, String impressao, RegraNegocioException falhaMercado) {
        Optional<Ordem> dup = ordens.buscarPorChave(inv, p.chave());
        if (dup.isPresent()) return duplicada(inv, dup.get(), impressao);

        Instant agora = clock.instant();
        Conta conta = contas.buscarPorInvestidor(inv).orElseThrow(() -> new IllegalStateException("Conta inexistente"));
        Posicao pos = posicoes.buscar(inv, p.ticker()).orElseGet(() -> Posicao.vazia(inv, p.ticker()));
        LimiteRisco limite = limites.buscar(inv).orElseThrow(() -> new RegraNegocioException(CodigoRegra.LIMITE_NAO_CONFIGURADO));

        Ordem o = Ordem.nova(p.lado(), inv, p.ticker(), p.quantidade(), p.preco(), p.chave(), impressao, agora);
        try { ordens.inserir(o); }
        catch (ChaveDuplicadaException e) { return duplicada(inv, ordens.buscarPorChave(inv, p.chave()).orElseThrow(), impressao); }
        auditoria.registrar(TipoEvento.ORDEM_CRIADA, inv, "ORDEM", o.id().toString(), descricao(o));

        try {
            if (falhaMercado != null) throw falhaMercado;
            LocalDate hoje = LocalDate.ofInstant(agora, zona);
            Dinheiro negociado = ordens.valorNegociadoNoPeriodo(inv,
                    hoje.atStartOfDay(zona).toInstant(), hoje.plusDays(1).atStartOfDay(zona).toInstant());
            validador.validarRisco(o, limite, negociado);
            o.reservarEValidar(conta, pos, agora);                              // saldo/posição: tudo ou nada
            if (o.lado() == Lado.COMPRA) contas.atualizar(conta); else posicoes.salvar(pos);
            ordens.atualizar(o);
            fila.publicar(new MensagemFila(UUID.randomUUID(), o.id(), 0, agora));
            auditoria.registrar(TipoEvento.ORDEM_VALIDADA, inv, "ORDEM", o.id().toString(), "reserva efetuada; enfileirada para a corretora");
        } catch (RegraNegocioException e) {
            o.rejeitar(e.codigo(), agora, conta, pos);                          // CRIADA → REJEITADA (sem reserva a devolver)
            ordens.atualizar(o);
            auditoria.registrar(TipoEvento.ORDEM_REJEITADA, inv, "ORDEM", o.id().toString(), e.getMessage());
            notificacoes.criar(inv, TipoNotificacao.REJEICAO, "Ordem " + o.lado() + " " + o.ticker() + " rejeitada: " + e.getMessage());
        }
        return new ResultadoEnvio(o, false);
    }

    private ResultadoEnvio duplicada(UUID inv, Ordem existente, String impressao) {
        if (!existente.impressaoDigital().equals(impressao))
            throw new ConflitoException("Chave de idempotência já utilizada em outra ordem com conteúdo diferente");
        tx.executarSemRetorno(() -> auditoria.registrar(TipoEvento.ORDEM_DUPLICADA_IGNORADA, inv, "ORDEM",
                existente.id().toString(), "reenvio com a mesma chave; nenhuma nova ordem criada"));
        return new ResultadoEnvio(existente, true);
    }

    // ------------------------------------------------------------------ cancelar
    public Ordem cancelarOrdem(String token, String idOrdem) {
        Sessao sessao = auth.exigir(token, Papel.INVESTIDOR);
        UUID id = Validacoes.uuid(idOrdem);
        Ordem o = doInvestidor(sessao.usuarioId(), id);
        if (o.status().terminal() && o.status() != StatusOrdem.CANCELADA)
            throw new RegraNegocioException(CodigoRegra.ORDEM_NAO_CANCELAVEL, "estado " + o.status());

        if (o.status() == StatusOrdem.ENVIADA || o.status() == StatusOrdem.PARCIALMENTE_EXECUTADA) {
            boolean aceito;
            try { aceito = corretora.cancelar(o.id()); }
            catch (IntegracaoException e) {
                throw new IntegracaoIndisponivelException("Corretora indisponível: a ordem NÃO foi cancelada. Tente novamente em instantes.", e);
            }
            processador.coletarExecucoes();                                     // aplica execuções em trânsito antes de finalizar
            if (!aceito) throw new RegraNegocioException(CodigoRegra.ORDEM_NAO_CANCELAVEL, "a corretora informou que a ordem já foi executada");
        }
        return Retentativa.comConflito(3, () -> tx.executar(() -> finalizarCancelamento(sessao.usuarioId(), id)));
    }

    private Ordem finalizarCancelamento(UUID inv, UUID id) {
        Ordem o = doInvestidor(inv, id);
        if (o.status() == StatusOrdem.CANCELADA) return o;                      // cancelamento idempotente
        Conta conta = contas.buscarPorInvestidor(inv).orElseThrow(() -> new IllegalStateException("Conta inexistente"));
        Posicao pos = posicoes.buscar(inv, o.ticker()).orElseGet(() -> Posicao.vazia(inv, o.ticker()));
        o.cancelar(clock.instant(), conta, pos);                                // lança ORDEM_NAO_CANCELAVEL se terminal
        if (o.lado() == Lado.COMPRA) contas.atualizar(conta); else posicoes.salvar(pos);
        ordens.atualizar(o);
        auditoria.registrar(TipoEvento.ORDEM_CANCELADA, inv, "ORDEM", o.id().toString(),
                "cancelada pelo investidor; executado " + o.quantidadeExecutada() + "/" + o.quantidade());
        notificacoes.criar(inv, TipoNotificacao.CANCELAMENTO, "Ordem " + o.lado() + " " + o.ticker() + " cancelada");
        return o;
    }

    // ------------------------------------------------------------------ consultas
    public Ordem consultarOrdem(String token, String idOrdem) {
        Sessao s = auth.exigir(token, Papel.INVESTIDOR);
        return doInvestidor(s.usuarioId(), Validacoes.uuid(idOrdem));
    }

    /** Histórico de operações do próprio investidor (mais recentes primeiro). */
    public List<Ordem> historico(String token) {
        return ordens.listarPorInvestidor(auth.exigir(token, Papel.INVESTIDOR).usuarioId());
    }

    public List<Execucao> execucoesDaOrdem(String token, String idOrdem) {
        Sessao s = auth.exigir(token, Papel.INVESTIDOR);
        Ordem o = doInvestidor(s.usuarioId(), Validacoes.uuid(idOrdem));
        return execucoes.listarPorOrdem(o.id());
    }

    /** Ordem de outro investidor é tratada como inexistente (não revela que o id existe). */
    private Ordem doInvestidor(UUID investidorId, UUID ordemId) {
        return ordens.buscarPorId(ordemId).filter(o -> o.investidorId().equals(investidorId))
                .orElseThrow(() -> new NaoEncontradoException("Ordem não encontrada"));
    }

    private static String descricao(Ordem o) { return o.lado() + " " + o.ticker() + " " + o.quantidade() + " @ " + o.precoLimite(); }
}
