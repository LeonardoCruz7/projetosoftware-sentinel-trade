package br.orion.sentineltrade.aplicacao.servico;

import br.orion.sentineltrade.aplicacao.porta.Repositorios.AtivoRepositorio;
import br.orion.sentineltrade.aplicacao.servico.CotacaoService.CotacaoConsultada;
import br.orion.sentineltrade.dominio.Ativo;
import br.orion.sentineltrade.dominio.CodigoRegra;
import br.orion.sentineltrade.dominio.Dinheiro;
import br.orion.sentineltrade.dominio.Excecoes.RegraNegocioException;
import br.orion.sentineltrade.dominio.LimiteRisco;
import br.orion.sentineltrade.dominio.Ordem;
import br.orion.sentineltrade.dominio.Ticker;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

/**
 * Serviço de risco / validação (RF08). Duas fases:
 *  1) {@link #validarMercado}: ativo, horário, cotação e faixa de preço — depende de sistemas externos e por
 *     isso roda FORA da transação de banco;
 *  2) {@link #validarRisco}: limites financeiros do investidor — roda dentro da transação.
 * Saldo/posição são validados (e reservados atomicamente) pela própria ordem: {@code Ordem.reservarEValidar}.
 */
public final class ValidadorOrdem {
    private final AtivoRepositorio ativos;
    private final CalendarioMercado calendario;
    private final CotacaoService cotacoes;
    private final ParametrosSistema params;

    public ValidadorOrdem(AtivoRepositorio ativos, CalendarioMercado calendario, CotacaoService cotacoes, ParametrosSistema params) {
        this.ativos = ativos; this.calendario = calendario; this.cotacoes = cotacoes; this.params = params;
    }

    public void validarMercado(Ticker ticker, Dinheiro preco, Instant agora) {
        Ativo ativo = ativos.buscar(ticker).orElseThrow(() -> new RegraNegocioException(CodigoRegra.ATIVO_INDISPONIVEL, "ativo não cadastrado"));
        if (!ativo.negociavel()) throw new RegraNegocioException(CodigoRegra.ATIVO_INDISPONIVEL, "ativo suspenso");
        if (!calendario.aberto(agora)) throw new RegraNegocioException(CodigoRegra.MERCADO_FECHADO);
        CotacaoConsultada q = cotacoes.obter(ticker).orElseThrow(() -> new RegraNegocioException(CodigoRegra.COTACAO_INDISPONIVEL));
        if (q.desatualizada()) throw new RegraNegocioException(CodigoRegra.COTACAO_DESATUALIZADA);
        BigDecimal ref = q.cotacao().preco().valor();
        BigDecimal desvio = preco.valor().subtract(ref).abs().divide(ref, 6, RoundingMode.HALF_EVEN).multiply(BigDecimal.valueOf(100));
        if (desvio.compareTo(params.decimal(ParametrosSistema.ORDEM_FAIXA_PRECO_PCT)) > 0)
            throw new RegraNegocioException(CodigoRegra.PRECO_FORA_DA_FAIXA,
                    "máximo " + params.texto(ParametrosSistema.ORDEM_FAIXA_PRECO_PCT) + "% da cotação " + q.cotacao().preco());
    }

    public void validarRisco(Ordem ordem, LimiteRisco limite, Dinheiro negociadoHoje) {
        Dinheiro valor = ordem.valorTotal();
        if (valor.compareTo(limite.valorMaximoPorOrdem()) > 0)
            throw new RegraNegocioException(CodigoRegra.LIMITE_POR_ORDEM_EXCEDIDO, "limite " + limite.valorMaximoPorOrdem());
        if (negociadoHoje.mais(valor).compareTo(limite.limiteDiario()) > 0)
            throw new RegraNegocioException(CodigoRegra.LIMITE_DIARIO_EXCEDIDO, "limite diário " + limite.limiteDiario());
    }
}
