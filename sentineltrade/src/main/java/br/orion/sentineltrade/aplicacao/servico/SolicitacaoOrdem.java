package br.orion.sentineltrade.aplicacao.servico;

/** Dados BRUTOS vindos da interface (todos texto): validados no servidor antes de qualquer uso. */
public record SolicitacaoOrdem(String lado, String ticker, String quantidade, String preco,
                               String chaveIdempotencia, boolean confirmada) {}
