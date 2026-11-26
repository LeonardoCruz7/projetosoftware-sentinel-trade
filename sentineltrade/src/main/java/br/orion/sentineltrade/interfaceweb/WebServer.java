package br.orion.sentineltrade.interfaceweb;

import br.orion.sentineltrade.Aplicacao;
import br.orion.sentineltrade.DadosDemonstracao;
import br.orion.sentineltrade.DadosDemonstracao.Credencial;
import br.orion.sentineltrade.aplicacao.servico.*;
import br.orion.sentineltrade.aplicacao.servico.CarteiraService.ItemCarteira;
import br.orion.sentineltrade.aplicacao.servico.CarteiraService.ResumoCarteira;
import br.orion.sentineltrade.aplicacao.servico.CotacaoService.CotacaoConsultada;
import br.orion.sentineltrade.aplicacao.servico.OrdemService.ResultadoEnvio;
import br.orion.sentineltrade.dominio.*;
import br.orion.sentineltrade.dominio.Excecoes.*;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.Executors;

/**
 * Interface Web + API REST (camada FINA sobre a arquitetura hexagonal de {@link Aplicacao}).
 * Usa apenas {@code com.sun.net.httpserver.HttpServer} do JDK, preservando zero dependências de framework.
 * Nenhuma regra de negócio mora aqui; autenticação, MFA, RBAC, validações e auditoria permanecem nos serviços.
 */
public final class WebServer implements AutoCloseable {
    private static final int MAX_BODY_BYTES = 64 * 1024;
    private static final String CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'";

    private final Aplicacao app;
    private final List<Credencial> credenciaisDemo;
    private final HttpServer server;

    public WebServer(Aplicacao app, List<Credencial> credenciaisDemo, String host, int porta) throws IOException {
        this.app = app;
        this.credenciaisDemo = credenciaisDemo == null ? List.of() : List.copyOf(credenciaisDemo);
        InetAddress addr = InetAddress.getByName(host == null || host.isBlank() ? "127.0.0.1" : host);
        this.server = HttpServer.create(new InetSocketAddress(addr, porta), 64);
        this.server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        registrarRotas();
    }

    public void iniciar() { server.start(); }

    public int portaReal() { return server.getAddress().getPort(); }

    @Override
    public void close() { server.stop(0); }

    private void registrarRotas() {
        // Arquivos estáticos
        server.createContext("/", ex -> tratar(ex, this::rotearRaizOuApi));
        server.createContext("/api/", ex -> tratar(ex, this::rotearApi));
    }

    private void rotearRaizOuApi(HttpExchange ex) throws IOException {
        String path = ex.getRequestURI().getPath();
        if (path.startsWith("/api/")) {
            rotearApi(ex);
            return;
        }
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
            enviarErro(ex, 405, "Método não permitido", "METODO_NAO_PERMITIDO");
            return;
        }
        String recurso = switch (path) {
            case "/", "/index.html" -> "index.html";
            case "/styles.css" -> "styles.css";
            case "/app.js" -> "app.js";
            default -> null;
        };
        if (recurso == null) {
            enviarErro(ex, 404, "Recurso não encontrado", "NAO_ENCONTRADO");
            return;
        }
        byte[] bytes = carregarRecursoWeb(recurso);
        if (bytes == null) {
            enviarErro(ex, 404, "Arquivo estático não encontrado", "NAO_ENCONTRADO");
            return;
        }
        String contentType = switch (recurso) {
            case "index.html" -> "text/html; charset=utf-8";
            case "styles.css" -> "text/css; charset=utf-8";
            case "app.js" -> "application/javascript; charset=utf-8";
            default -> "application/octet-stream";
        };
        aplicarHeadersSeguranca(ex, false);
        ex.getResponseHeaders().set("Content-Type", contentType);
        ex.sendResponseHeaders(200, bytes.length);
        ex.getResponseBody().write(bytes);
    }

    private void rotearApi(HttpExchange ex) throws IOException {
        String method = ex.getRequestMethod().toUpperCase(Locale.ROOT);
        String path = ex.getRequestURI().getPath();
        Map<String, String> query = parseQuery(ex.getRequestURI().getRawQuery());

        // ---- Endpoints públicos (somente status seguro / demo / passo 1 do login)
        if ("GET".equals(method) && "/api/status".equals(path)) {
            Instant agora = app.relogio.instant();
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("simulado", true);
            r.put("mercadoAberto", app.calendario.aberto(agora));
            r.put("mercadoForcarAberto", app.parametros.booleano(ParametrosSistema.MERCADO_FORCAR_ABERTO));
            r.put("horarioMercado", app.parametros.texto(ParametrosSistema.MERCADO_ABERTURA) + " - "
                    + app.parametros.texto(ParametrosSistema.MERCADO_FECHAMENTO));
            r.put("zona", app.calendario.zona().getId());
            r.put("agora", agora);
            r.put("circuitBreaker", app.corretoraResiliente != null ? app.corretoraResiliente.estado().name() : "DESCONHECIDO");
            r.put("cotacoesDisponiveis", app.cotacoesSimuladas == null || !app.cotacoesSimuladas.indisponivel());
            r.put("corretoraDisponivel", app.corretoraSimulada == null || !app.corretoraSimulada.indisponivel());
            r.put("demoAtivo", !credenciaisDemo.isEmpty());
            enviarJson(ex, 200, r);
            return;
        }

        if ("GET".equals(method) && "/api/demo/contas".equals(path)) {
            if (credenciaisDemo.isEmpty()) {
                enviarJson(ex, 200, Map.of("ativo", false, "contas", List.of()));
                return;
            }
            List<Map<String, Object>> contas = new ArrayList<>();
            for (Credencial c : credenciaisDemo) {
                String nome = app.persistencia.usuarios().buscarPorId(c.usuarioId()).map(Usuario::nome).orElse(c.email());
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("nome", nome);
                item.put("email", c.email());
                item.put("senha", c.senha());
                item.put("papel", c.papel().name());
                contas.add(item);
            }
            enviarJson(ex, 200, Map.of("ativo", true, "contas", contas));
            return;
        }

        // ---- Autenticação + MFA
        if ("POST".equals(method) && "/api/auth/login".equals(path)) {
            Map<String, Object> body = lerJson(ex);
            String email = Json.str(body, "email");
            String senha = Json.str(body, "senha");
            String tokenPendente = app.auth.iniciarLogin(email, senha);
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("tokenPendente", tokenPendente);
            resp.put("expiraSegundos", AutenticacaoService.TTL_PENDENTE.toSeconds());
            if (!credenciaisDemo.isEmpty()) {
                Sessao s = app.auth.validarTokenPendente(tokenPendente);
                app.persistencia.usuarios().buscarPorId(s.usuarioId()).ifPresent(u -> {
                    resp.put("mfaDemo", infoMfaDemo(u));
                });
            }
            enviarJson(ex, 200, resp);
            return;
        }

        if ("GET".equals(method) && "/api/auth/mfa-demo".equals(path)) {
            String pendente = extrairBearer(ex);
            Sessao s = app.auth.validarTokenPendente(pendente);
            if (credenciaisDemo.isEmpty()) {
                enviarErro(ex, 404, "Autenticador simulado disponível apenas em modo demonstração", "INDISPONIVEL");
                return;
            }
            Usuario u = app.persistencia.usuarios().buscarPorId(s.usuarioId())
                    .orElseThrow(() -> new AutenticacaoException("Sessão inválida ou expirada"));
            enviarJson(ex, 200, infoMfaDemo(u));
            return;
        }

        if ("POST".equals(method) && "/api/auth/mfa".equals(path)) {
            Map<String, Object> body = lerJson(ex);
            String tokenPendente = Json.str(body, "tokenPendente");
            if (tokenPendente == null || tokenPendente.isBlank()) tokenPendente = extrairBearer(ex);
            String codigo = Json.str(body, "codigo");
            String token = app.auth.confirmarMfa(tokenPendente, codigo);
            Sessao s = app.auth.validarToken(token);
            Usuario u = app.persistencia.usuarios().buscarPorId(s.usuarioId())
                    .orElseThrow(() -> new AutenticacaoException("Sessão inválida ou expirada"));
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("token", token);
            resp.put("expiraEm", s.expiraEm());
            resp.put("usuario", usuarioMap(u));
            enviarJson(ex, 200, resp);
            return;
        }

        if ("GET".equals(method) && "/api/auth/me".equals(path)) {
            String token = extrairBearer(ex);
            Sessao s = app.auth.validarToken(token);
            Usuario u = app.persistencia.usuarios().buscarPorId(s.usuarioId())
                    .orElseThrow(() -> new AutenticacaoException("Sessão inválida ou expirada"));
            Map<String, Object> resp = new LinkedHashMap<>(usuarioMap(u));
            resp.put("expiraEm", s.expiraEm());
            enviarJson(ex, 200, resp);
            return;
        }

        if ("POST".equals(method) && "/api/auth/logout".equals(path)) {
            String token = extrairBearer(ex);
            if (token != null) app.auth.encerrar(token);
            enviarJson(ex, 200, Map.of("ok", true));
            return;
        }

        // ---- Todos os endpoints abaixo exigem token Bearer válido
        String token = extrairBearer(ex);

        // Cotações & Ativos (qualquer perfil autenticado)
        if ("GET".equals(method) && "/api/cotacoes".equals(path)) {
            List<CotacaoConsultada> lista = app.cotacoes.listar(token);
            Map<Ticker, Ativo> porTicker = new HashMap<>();
            for (Ativo a : app.admin.listarAtivos(token)) porTicker.put(a.ticker(), a);
            List<Map<String, Object>> out = new ArrayList<>();
            for (CotacaoConsultada q : lista) out.add(cotacaoMap(q, porTicker.get(q.cotacao().ticker())));
            enviarJson(ex, 200, Map.of("cotacoes", out));
            return;
        }

        if ("GET".equals(method) && "/api/ativos".equals(path)) {
            List<Map<String, Object>> out = app.admin.listarAtivos(token).stream().map(this::ativoMap).toList();
            enviarJson(ex, 200, Map.of("ativos", out));
            return;
        }

        // ---- Investidor
        if ("GET".equals(method) && "/api/carteira".equals(path)) {
            ResumoCarteira r = app.carteira.consultarCarteira(token);
            Sessao s = app.auth.exigir(token, Papel.INVESTIDOR);
            LimiteRisco limite = app.persistencia.limites().buscar(s.usuarioId()).orElse(null);

            Map<String, Object> saldo = new LinkedHashMap<>();
            saldo.put("disponivel", r.saldo().disponivel());
            saldo.put("bloqueado", r.saldo().bloqueado());
            saldo.put("total", r.saldo().disponivel().mais(r.saldo().bloqueado()));

            List<Map<String, Object>> itens = new ArrayList<>();
            Dinheiro valorAtivos = Dinheiro.ZERO;
            for (ItemCarteira i : r.itens()) {
                valorAtivos = valorAtivos.mais(i.valorEstimado());
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("ticker", i.ticker());
                item.put("quantidade", i.quantidade());
                item.put("quantidadeBloqueada", i.quantidadeBloqueada());
                item.put("quantidadeDisponivel", i.quantidade() - i.quantidadeBloqueada());
                item.put("precoMedio", i.precoMedio());
                item.put("cotacaoAtual", i.cotacaoAtual());
                item.put("cotacaoDesatualizada", i.cotacaoDesatualizada());
                item.put("valorEstimado", i.valorEstimado());
                Dinheiro custoPosicao = i.precoMedio().vezes(i.quantidade());
                item.put("resultadoEstimado", i.valorEstimado().menos(custoPosicao));
                itens.add(item);
            }

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("saldo", saldo);
            resp.put("itens", itens);
            resp.put("valorAtivos", valorAtivos);
            resp.put("patrimonioEstimado", r.patrimonioEstimado());
            if (limite != null) resp.put("limiteRisco", limiteMap(limite));
            enviarJson(ex, 200, resp);
            return;
        }

        if ("GET".equals(method) && "/api/ordens".equals(path)) {
            List<Map<String, Object>> out = app.ordens.historico(token).stream().map(this::ordemMap).toList();
            enviarJson(ex, 200, Map.of("ordens", out));
            return;
        }

        if ("POST".equals(method) && "/api/ordens".equals(path)) {
            Map<String, Object> body = lerJson(ex);
            String chave = Json.str(body, "chaveIdempotencia");
            if (chave == null || chave.isBlank()) chave = UUID.randomUUID().toString();
            SolicitacaoOrdem sol = new SolicitacaoOrdem(
                    Json.str(body, "lado"),
                    Json.str(body, "ticker"),
                    Json.str(body, "quantidade"),
                    Json.str(body, "preco"),
                    chave,
                    Json.bool(body, "confirmada", false));
            ResultadoEnvio res = app.ordens.enviarOrdem(token, sol);
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("duplicada", res.duplicada());
            resp.put("ordem", ordemMap(res.ordem()));
            enviarJson(ex, res.duplicada() ? 200 : 201, resp);
            return;
        }

        if ("GET".equals(method) && path.startsWith("/api/ordens/")) {
            String id = path.substring("/api/ordens/".length());
            if (id.contains("/")) {
                enviarErro(ex, 404, "Recurso não encontrado", "NAO_ENCONTRADO");
                return;
            }
            Ordem o = app.ordens.consultarOrdem(token, id);
            List<Map<String, Object>> execs = app.ordens.execucoesDaOrdem(token, id).stream().map(this::execucaoMap).toList();
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("ordem", ordemMap(o));
            resp.put("execucoes", execs);
            enviarJson(ex, 200, resp);
            return;
        }

        if ("POST".equals(method) && path.startsWith("/api/ordens/") && path.endsWith("/cancelar")) {
            String id = path.substring("/api/ordens/".length(), path.length() - "/cancelar".length());
            Ordem o = app.ordens.cancelarOrdem(token, id);
            enviarJson(ex, 200, Map.of("ordem", ordemMap(o)));
            return;
        }

        if ("GET".equals(method) && "/api/notificacoes".equals(path)) {
            List<Map<String, Object>> out = app.notificacoes.minhasNotificacoes(token).stream().map(this::notificacaoMap).toList();
            enviarJson(ex, 200, Map.of("notificacoes", out));
            return;
        }

        // ---- Risco (ANALISTA_RISCO ou ADMINISTRADOR)
        if ("GET".equals(method) && "/api/risco/investidores".equals(path)) {
            List<Map<String, Object>> out = new ArrayList<>();
            for (Usuario u : app.risco.listarInvestidores(token)) {
                Map<String, Object> m = new LinkedHashMap<>(usuarioMap(u));
                app.persistencia.contas().buscarPorInvestidor(u.id()).ifPresent(c -> {
                    m.put("saldoDisponivel", c.saldoDisponivel());
                    m.put("saldoBloqueado", c.saldoBloqueado());
                });
                app.persistencia.limites().buscar(u.id()).ifPresent(l -> m.put("limiteRisco", limiteMap(l)));
                out.add(m);
            }
            enviarJson(ex, 200, Map.of("investidores", out));
            return;
        }

        if ("GET".equals(method) && path.startsWith("/api/risco/limites/")) {
            String id = path.substring("/api/risco/limites/".length());
            LimiteRisco l = app.risco.consultarLimites(token, id);
            enviarJson(ex, 200, limiteMap(l));
            return;
        }

        if ("PUT".equals(method) && path.startsWith("/api/risco/limites/")) {
            String id = path.substring("/api/risco/limites/".length());
            Map<String, Object> body = lerJson(ex);
            app.risco.definirLimites(token, id,
                    Json.str(body, "valorMaximoPorOrdem"),
                    Json.str(body, "limiteDiario"),
                    Json.str(body, "valorConfirmacao"));
            LimiteRisco atualizado = app.risco.consultarLimites(token, id);
            enviarJson(ex, 200, limiteMap(atualizado));
            return;
        }

        if ("GET".equals(method) && "/api/risco/rejeitadas".equals(path)) {
            List<Map<String, Object>> out = app.risco.ordensRejeitadas(token).stream().map(this::ordemMap).toList();
            enviarJson(ex, 200, Map.of("ordens", out));
            return;
        }

        // ---- Administração (ADMINISTRADOR)
        if ("POST".equals(method) && "/api/admin/investidores".equals(path)) {
            Map<String, Object> body = lerJson(ex);
            UUID id = app.admin.cadastrarInvestidor(token,
                    Json.str(body, "nome"),
                    Json.str(body, "email"),
                    Json.str(body, "senha"));
            enviarJson(ex, 201, Map.of("id", id));
            return;
        }

        if ("POST".equals(method) && "/api/admin/depositos".equals(path)) {
            Map<String, Object> body = lerJson(ex);
            app.admin.depositarSimulado(token, Json.str(body, "investidorId"), Json.str(body, "valor"));
            enviarJson(ex, 200, Map.of("ok", true));
            return;
        }

        if ("POST".equals(method) && "/api/admin/ativos".equals(path)) {
            Map<String, Object> body = lerJson(ex);
            app.admin.cadastrarAtivo(token, Json.str(body, "ticker"), Json.str(body, "nome"), Json.str(body, "tipo"));
            enviarJson(ex, 201, Map.of("ok", true));
            return;
        }

        if ("PUT".equals(method) && path.startsWith("/api/admin/ativos/") && path.endsWith("/status")) {
            String ticker = path.substring("/api/admin/ativos/".length(), path.length() - "/status".length());
            Map<String, Object> body = lerJson(ex);
            app.admin.alterarStatusAtivo(token, ticker, Json.str(body, "status"));
            enviarJson(ex, 200, Map.of("ok", true));
            return;
        }

        if ("GET".equals(method) && "/api/admin/parametros".equals(path)) {
            enviarJson(ex, 200, Map.of("parametros", app.admin.listarParametros(token)));
            return;
        }

        if ("PUT".equals(method) && "/api/admin/parametros".equals(path)) {
            Map<String, Object> body = lerJson(ex);
            app.admin.definirParametro(token, Json.str(body, "chave"), Json.str(body, "valor"));
            enviarJson(ex, 200, Map.of("parametros", app.admin.listarParametros(token)));
            return;
        }

        if ("GET".equals(method) && "/api/admin/auditoria".equals(path)) {
            long aposSeq = parseLong(query.get("aposSeq"), 0L);
            int limite = (int) parseLong(query.get("limite"), 100L);
            List<Map<String, Object>> out = app.admin.consultarAuditoria(token, aposSeq, limite)
                    .stream().map(this::auditoriaMap).toList();
            enviarJson(ex, 200, Map.of("eventos", out));
            return;
        }

        if ("GET".equals(method) && "/api/admin/auditoria/integridade".equals(path)) {
            AuditoriaService.Verificacao v = app.admin.verificarIntegridadeAuditoria(token);
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("integra", v.integra());
            resp.put("seqProblema", v.seqProblema());
            resp.put("motivo", v.motivo());
            enviarJson(ex, 200, resp);
            return;
        }

        if ("POST".equals(method) && "/api/admin/simulacao".equals(path)) {
            app.auth.exigir(token, Papel.ADMINISTRADOR);
            Map<String, Object> body = lerJson(ex);
            String acao = Json.str(body, "acao");
            if (acao == null) throw new ValidacaoException("Ação obrigatória");
            switch (acao) {
                case "corretora_indisponivel" -> {
                    if (app.corretoraSimulada == null) throw new ValidacaoException("Simulação indisponível");
                    app.corretoraSimulada.setIndisponivel(Json.bool(body, "valor", false));
                }
                case "cotacoes_indisponiveis" -> {
                    if (app.cotacoesSimuladas == null) throw new ValidacaoException("Simulação indisponível");
                    app.cotacoesSimuladas.setIndisponivel(Json.bool(body, "valor", false));
                }
                case "lote_maximo" -> {
                    if (app.corretoraSimulada == null) throw new ValidacaoException("Simulação indisponível");
                    int lote = Json.inteiro(body, "valor", Integer.MAX_VALUE);
                    app.corretoraSimulada.setLoteMaximo(lote <= 0 ? Integer.MAX_VALUE : lote);
                }
                case "processar_fila" -> app.processador.ciclo();
                case "variar_cotacoes" -> {
                    if (app.cotacoesSimuladas == null) throw new ValidacaoException("Simulação indisponível");
                    app.cotacoesSimuladas.variar(new Random());
                }
                default -> throw new ValidacaoException("Ação de simulação desconhecida");
            }
            enviarJson(ex, 200, Map.of(
                    "ok", true,
                    "circuitBreaker", app.corretoraResiliente != null ? app.corretoraResiliente.estado().name() : "DESCONHECIDO",
                    "corretoraDisponivel", app.corretoraSimulada == null || !app.corretoraSimulada.indisponivel(),
                    "cotacoesDisponiveis", app.cotacoesSimuladas == null || !app.cotacoesSimuladas.indisponivel(),
                    "loteMaximo", app.corretoraSimulada != null ? app.corretoraSimulada.loteMaximo() : Integer.MAX_VALUE
            ));
            return;
        }

        enviarErro(ex, 404, "Endpoint não encontrado", "NAO_ENCONTRADO");
    }

    // ------------------------------------------------------------------ tratamento & helpers

    @FunctionalInterface
    private interface Handler { void handle(HttpExchange ex) throws IOException; }

    private void tratar(HttpExchange ex, Handler h) throws IOException {
        try {
            h.handle(ex);
        } catch (ValidacaoException e) {
            enviarErro(ex, 400, e.getMessage(), "VALIDACAO");
        } catch (AutenticacaoException e) {
            enviarErro(ex, 401, e.getMessage(), "AUTENTICACAO");
        } catch (AcessoNegadoException e) {
            enviarErro(ex, 403, e.getMessage(), "ACESSO_NEGADO");
        } catch (NaoEncontradoException e) {
            enviarErro(ex, 404, e.getMessage(), "NAO_ENCONTRADO");
        } catch (ConfirmacaoNecessariaException e) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("erro", e.getMessage());
            body.put("codigo", "CONFIRMACAO_NECESSARIA");
            body.put("confirmacaoNecessaria", true);
            enviarJson(ex, 409, body);
        } catch (ConflitoException | ChaveDuplicadaException | ConcorrenciaException e) {
            enviarErro(ex, 409, e.getMessage(), "CONFLITO");
        } catch (RegraNegocioException e) {
            enviarErro(ex, 422, e.getMessage(), e.codigo().name());
        } catch (LimiteTaxaException e) {
            enviarErro(ex, 429, e.getMessage(), "LIMITE_TAXA");
        } catch (IntegracaoException e) {
            enviarErro(ex, 503, e.getMessage(), "INTEGRACAO_INDISPONIVEL");
        } catch (RuntimeException e) {
            String ref = UUID.randomUUID().toString().substring(0, 8);
            Log.erro("Erro interno web ref=" + ref, e);
            enviarErro(ex, 500, "Erro interno. Informe a referência " + ref + " ao suporte.", "ERRO_INTERNO");
        } finally {
            ex.close();
        }
    }

    private void aplicarHeadersSeguranca(HttpExchange ex, boolean api) {
        var h = ex.getResponseHeaders();
        h.set("X-Content-Type-Options", "nosniff");
        h.set("X-Frame-Options", "DENY");
        h.set("Referrer-Policy", "no-referrer");
        h.set("Content-Security-Policy", CSP);
        if (api) h.set("Cache-Control", "no-store");
    }

    private void enviarJson(HttpExchange ex, int status, Object payload) throws IOException {
        byte[] bytes = Json.stringify(payload).getBytes(StandardCharsets.UTF_8);
        aplicarHeadersSeguranca(ex, true);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(status, bytes.length);
        ex.getResponseBody().write(bytes);
    }

    private void enviarErro(HttpExchange ex, int status, String mensagem, String codigo) throws IOException {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("erro", Sanitizador.paraLog(mensagem, 300));
        m.put("codigo", codigo);
        enviarJson(ex, status, m);
    }

    private Map<String, Object> lerJson(HttpExchange ex) throws IOException {
        byte[] raw = ex.getRequestBody().readNBytes(MAX_BODY_BYTES + 1);
        if (raw.length > MAX_BODY_BYTES) throw new ValidacaoException("Corpo da requisição excede o limite permitido");
        return Json.parseObject(new String(raw, StandardCharsets.UTF_8));
    }

    private static String extrairBearer(HttpExchange ex) {
        String auth = ex.getRequestHeaders().getFirst("Authorization");
        if (auth == null || !auth.regionMatches(true, 0, "Bearer ", 0, 7)) return null;
        return auth.substring(7).trim();
    }

    private static Map<String, String> parseQuery(String raw) {
        if (raw == null || raw.isBlank()) return Map.of();
        Map<String, String> m = new HashMap<>();
        for (String par : raw.split("&")) {
            int i = par.indexOf('=');
            if (i <= 0) continue;
            String k = URLDecoder.decode(par.substring(0, i), StandardCharsets.UTF_8);
            String v = URLDecoder.decode(par.substring(i + 1), StandardCharsets.UTF_8);
            m.put(k, v);
        }
        return m;
    }

    private static long parseLong(String s, long padrao) {
        if (s == null || s.isBlank()) return padrao;
        try { return Long.parseLong(s.trim()); } catch (NumberFormatException e) { return padrao; }
    }

    private static byte[] carregarRecursoWeb(String nome) throws IOException {
        try (InputStream is = WebServer.class.getResourceAsStream("/web/" + nome)) {
            if (is != null) return is.readAllBytes();
        }
        Path local = Path.of("src", "main", "resources", "web", nome);
        if (Files.isRegularFile(local)) return Files.readAllBytes(local);
        return null;
    }

    // ------------------------------------------------------------------ mapeadores seguros (sem vazar hash/segredo)

    private Map<String, Object> infoMfaDemo(Usuario u) {
        Instant agora = app.relogio.instant();
        int restante = (int) (30 - (agora.getEpochSecond() % 30));
        return Map.of(
                "codigoAtual", app.mfa.codigoAtual(u.segredoMfa(), agora),
                "janelaRestanteSeg", restante
        );
    }

    private Map<String, Object> usuarioMap(Usuario u) {
        Instant agora = app.relogio.instant();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.id());
        m.put("nome", u.nome());
        m.put("email", u.email());
        m.put("papel", u.papel());
        m.put("ativo", u.ativo());
        m.put("bloqueado", u.bloqueado(agora));
        return m;
    }

    private Map<String, Object> cotacaoMap(CotacaoConsultada q, Ativo ativo) {
        Cotacao c = q.cotacao();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ticker", c.ticker());
        m.put("nome", ativo != null ? ativo.nome() : c.ticker().codigo());
        m.put("tipo", ativo != null ? ativo.tipo() : null);
        m.put("status", ativo != null ? ativo.status() : null);
        m.put("preco", c.preco());
        m.put("fechamentoAnterior", c.fechamentoAnterior());
        m.put("variacaoPercentual", c.variacaoPercentual());
        m.put("instante", c.instante());
        m.put("desatualizada", q.desatualizada());
        return m;
    }

    private Map<String, Object> ativoMap(Ativo a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ticker", a.ticker());
        m.put("nome", a.nome());
        m.put("tipo", a.tipo());
        m.put("status", a.status());
        return m;
    }

    private Map<String, Object> limiteMap(LimiteRisco l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("investidorId", l.investidorId());
        m.put("valorMaximoPorOrdem", l.valorMaximoPorOrdem());
        m.put("limiteDiario", l.limiteDiario());
        m.put("valorConfirmacao", l.valorConfirmacao());
        return m;
    }

    private Map<String, Object> ordemMap(Ordem o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", o.id());
        m.put("lado", o.lado());
        m.put("ticker", o.ticker());
        m.put("quantidade", o.quantidade());
        m.put("precoLimite", o.precoLimite());
        m.put("valorTotal", o.valorTotal());
        m.put("status", o.status());
        m.put("statusTerminal", o.status().terminal());
        m.put("quantidadeExecutada", o.quantidadeExecutada());
        m.put("quantidadeRestante", o.quantidadeRestante());
        m.put("valorExecutado", o.valorExecutado());
        m.put("motivoRejeicaoCodigo", o.motivoRejeicao() != null ? o.motivoRejeicao().name() : null);
        m.put("motivoRejeicao", o.motivoRejeicao() != null ? o.motivoRejeicao().descricao() : null);
        m.put("chaveIdempotencia", o.chaveIdempotencia());
        m.put("criadaEm", o.criadaEm());
        m.put("atualizadaEm", o.atualizadaEm());
        return m;
    }

    private Map<String, Object> execucaoMap(Execucao e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("idExecucao", e.idExecucao());
        m.put("ordemId", e.ordemId());
        m.put("quantidade", e.quantidade());
        m.put("preco", e.preco());
        m.put("executadaEm", e.executadaEm());
        return m;
    }

    private Map<String, Object> notificacaoMap(Notificacao n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", n.id());
        m.put("tipo", n.tipo());
        m.put("mensagem", n.mensagem());
        m.put("criadaEm", n.criadaEm());
        m.put("enviadaEm", n.enviadaEm());
        return m;
    }

    private Map<String, Object> auditoriaMap(EventoAuditoria e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("seq", e.seq());
        m.put("instante", e.instante());
        m.put("tipo", e.tipo());
        m.put("usuarioId", e.usuarioId());
        m.put("entidade", e.entidade());
        m.put("entidadeId", e.entidadeId());
        m.put("detalhes", e.detalhes());
        m.put("hashAnterior", e.hashAnterior());
        m.put("hash", e.hash());
        return m;
    }
}
