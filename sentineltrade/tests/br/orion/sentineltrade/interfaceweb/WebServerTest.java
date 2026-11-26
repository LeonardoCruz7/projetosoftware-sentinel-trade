package br.orion.sentineltrade.interfaceweb;

import static org.junit.jupiter.api.Assertions.*;

import br.orion.sentineltrade.Cenario;
import br.orion.sentineltrade.DadosDemonstracao;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Testes de ponta a ponta da camada Web HTTP/JSON + Login MFA + RBAC + Ordens. */
class WebServerTest {
    private Cenario c;
    private WebServer web;
    private HttpClient http;
    private String baseUrl;

    @BeforeEach
    void subir() throws Exception {
        c = new Cenario();
        web = new WebServer(c.app, c.credenciais, "127.0.0.1", 0);
        web.iniciar();
        http = HttpClient.newHttpClient();
        baseUrl = "http://127.0.0.1:" + web.portaReal();
    }

    @AfterEach
    void derrubar() {
        if (web != null) web.close();
    }

    private HttpResponse<String> req(String metodo, String path, String token, Object body) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(baseUrl + path));
        if (token != null) b.header("Authorization", "Bearer " + token);
        if (body != null) {
            b.header("Content-Type", "application/json");
            b.method(metodo, HttpRequest.BodyPublishers.ofString(Json.stringify(body)));
        } else {
            b.method(metodo, HttpRequest.BodyPublishers.noBody());
        }
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private String loginWeb(String email) throws Exception {
        var r1 = req("POST", "/api/auth/login", null, Map.of("email", email, "senha", c.cred(email).senha()));
        assertEquals(200, r1.statusCode());
        var j1 = Json.parseObject(r1.body());
        String pendente = Json.str(j1, "tokenPendente");
        assertNotNull(pendente);

        String codigo = DadosDemonstracao.codigoMfaAtual(c.app, email);
        var r2 = req("POST", "/api/auth/mfa", null, Map.of("tokenPendente", pendente, "codigo", codigo));
        assertEquals(200, r2.statusCode());
        return Json.str(Json.parseObject(r2.body()), "token");
    }

    @Test void serveArquivosEstaticosEStatusPublico() throws Exception {
        var idx = req("GET", "/", null, null);
        assertEquals(200, idx.statusCode());
        assertTrue(idx.body().contains("SentinelTrade"));

        var css = req("GET", "/styles.css", null, null);
        assertEquals(200, css.statusCode());
        assertTrue(css.body().contains("--bg:"));

        var js = req("GET", "/app.js", null, null);
        assertEquals(200, js.statusCode());
        assertTrue(js.body().contains("/api/auth/login"));

        var st = req("GET", "/api/status", null, null);
        assertEquals(200, st.statusCode());
        var j = Json.parseObject(st.body());
        assertEquals(Boolean.TRUE, j.get("simulado"));
        assertEquals(Boolean.TRUE, j.get("mercadoAberto"));
    }

    @Test void fluxoLoginMfaBloqueiaTokenPendenteERevogaNoLogout() throws Exception {
        var r1 = req("POST", "/api/auth/login", null,
                Map.of("email", "ana@orion.example", "senha", c.cred("ana@orion.example").senha()));
        assertEquals(200, r1.statusCode());
        String pendente = Json.str(Json.parseObject(r1.body()), "tokenPendente");

        // Token pendente não acessa carteira
        assertEquals(401, req("GET", "/api/carteira", pendente, null).statusCode());

        // Código MFA errado é rejeitado
        var mfaRuim = req("POST", "/api/auth/mfa", null,
                Map.of("tokenPendente", pendente, "codigo", c.codigoMfaErrado("ana@orion.example")));
        assertEquals(401, mfaRuim.statusCode());

        // Código MFA válido conclui sessão
        String token = loginWeb("ana@orion.example");
        var me = req("GET", "/api/auth/me", token, null);
        assertEquals(200, me.statusCode());
        assertEquals("INVESTIDOR", Json.str(Json.parseObject(me.body()), "papel"));

        // Logout invalida token
        assertEquals(200, req("POST", "/api/auth/logout", token, Map.of()).statusCode());
        assertEquals(401, req("GET", "/api/carteira", token, null).statusCode());
    }

    @Test void investidorEnviaOrdemComAltoValorIdempotenciaECancelamento() throws Exception {
        String ana = loginWeb("ana@orion.example");
        String bruno = loginWeb("bruno@orion.example");

        var cart = req("GET", "/api/carteira", ana, null);
        assertEquals(200, cart.statusCode());
        assertTrue(cart.body().contains("VALE3"));

        // Ordem acima de 20.000 exige confirmação (409 CONFIRMACAO_NECESSARIA)
        String chave = UUID.randomUUID().toString();
        var semConf = req("POST", "/api/ordens", ana, Map.of(
                "lado", "COMPRA", "ticker", "PETR4", "quantidade", "600",
                "preco", "38.50", "chaveIdempotencia", chave, "confirmada", false));
        assertEquals(409, semConf.statusCode());
        assertEquals(Boolean.TRUE, Json.parseObject(semConf.body()).get("confirmacaoNecessaria"));

        // Confirmando com a mesma chave
        var comConf = req("POST", "/api/ordens", ana, Map.of(
                "lado", "COMPRA", "ticker", "PETR4", "quantidade", "600",
                "preco", "38.50", "chaveIdempotencia", chave, "confirmada", true));
        assertEquals(201, comConf.statusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> ordem = (Map<String, Object>) Json.parseObject(comConf.body()).get("ordem");
        String ordemId = Json.str(ordem, "id");

        // Reenvio com mesma chave é idempotente (200, duplicada=true)
        var reenvio = req("POST", "/api/ordens", ana, Map.of(
                "lado", "COMPRA", "ticker", "PETR4", "quantidade", "600",
                "preco", "38.50", "chaveIdempotencia", chave, "confirmada", true));
        assertEquals(200, reenvio.statusCode());
        assertEquals(Boolean.TRUE, Json.parseObject(reenvio.body()).get("duplicada"));

        // Privacidade: Bruno não acessa nem cancela ordem da Ana
        assertEquals(404, req("GET", "/api/ordens/" + ordemId, bruno, null).statusCode());
        assertEquals(404, req("POST", "/api/ordens/" + ordemId + "/cancelar", bruno, Map.of()).statusCode());

        // Ana cancela sua ordem
        var canc = req("POST", "/api/ordens/" + ordemId + "/cancelar", ana, Map.of());
        assertEquals(200, canc.statusCode());
        assertTrue(canc.body().contains("CANCELADA"));
    }

    @Test void rbacECadeiaAuditoriaSha256() throws Exception {
        String ana = loginWeb("ana@orion.example");
        String adm = loginWeb("admin@orion.example");
        String ris = loginWeb("risco@orion.example");

        // Investidor não acessa rotas de Admin nem de Risco
        assertEquals(403, req("GET", "/api/admin/auditoria", ana, null).statusCode());
        assertEquals(403, req("GET", "/api/risco/investidores", ana, null).statusCode());

        // Analista de Risco consulta investidores e rejeitadas, mas não auditoria de Admin
        assertEquals(200, req("GET", "/api/risco/investidores", ris, null).statusCode());
        assertEquals(403, req("GET", "/api/admin/auditoria", ris, null).statusCode());

        // Admin verifica integridade da trilha de auditoria
        var ver = req("GET", "/api/admin/auditoria/integridade", adm, null);
        assertEquals(200, ver.statusCode());
        assertEquals(Boolean.TRUE, Json.parseObject(ver.body()).get("integra"));
    }

    @Test void jsonParseESerializacao() {
        String raw = Json.stringify(Map.of("ok", true, "lista", List.of(1, "a\"b\\c"), "vazio", "x\ny"));
        var parsed = Json.parseObject(raw);
        assertEquals(Boolean.TRUE, parsed.get("ok"));
        assertEquals("x\ny", parsed.get("vazio"));
    }
}
