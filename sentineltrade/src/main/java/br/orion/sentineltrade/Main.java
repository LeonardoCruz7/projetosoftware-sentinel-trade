package br.orion.sentineltrade;

import br.orion.sentineltrade.DadosDemonstracao.Credencial;
import br.orion.sentineltrade.interfacecli.CliApp;
import br.orion.sentineltrade.interfacecli.DemoScript;
import br.orion.sentineltrade.interfaceweb.WebServer;
import java.io.IOException;
import java.time.Clock;
import java.util.List;
import java.util.Random;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Ponto de entrada.  java -cp ... br.orion.sentineltrade.Main            → console interativo
 *                    java -cp ... br.orion.sentineltrade.Main --demo     → roteiro automatizado de demonstração
 *                    java -cp ... br.orion.sentineltrade.Main --web      → interface web em http://127.0.0.1:8080
 * Sistema 100% SIMULADO: nenhum dinheiro, ativo, bolsa ou corretora reais.
 */
public final class Main {
    private Main() {}

    public static void main(String[] args) throws Exception {
        System.setProperty("java.util.logging.SimpleFormatter.format", "%4$s: %5$s%n");
        java.util.logging.Logger.getLogger("").setLevel(java.util.logging.Level.WARNING);
        Config cfg = Config.carregar();

        boolean demo = false;
        boolean web = false;
        Integer portaOverride = null;
        for (String arg : args) {
            if ("--demo".equals(arg)) demo = true;
            else if ("--web".equals(arg)) web = true;
            else if (arg.startsWith("--port=")) portaOverride = Integer.parseInt(arg.substring("--port=".length()));
        }

        if (demo) { new DemoScript(System.out).executar(); return; }

        Aplicacao app = cfg.jdbc() ? Aplicacao.comJdbc(Clock.systemUTC(), cfg, System.out)
                                   : Aplicacao.emMemoria(Clock.systemUTC(), cfg, System.out);
        List<Credencial> credenciais = List.of();
        if (!cfg.jdbc() || cfg.demo()) {
            if (app.persistencia.usuarios().contar() == 0) credenciais = DadosDemonstracao.carregar(app, cfg.bruto());
            else DadosDemonstracao.definirCotacoesIniciais(app);
        } else {
            DadosDemonstracao.definirCotacoesIniciais(app);
        }
        app.iniciarWorker(1000);
        ScheduledExecutorService mercado = Executors.newSingleThreadScheduledExecutor(r -> { Thread t = new Thread(r, "cotacoes"); t.setDaemon(true); return t; });
        Random rnd = new Random();
        mercado.scheduleWithFixedDelay(() -> app.cotacoesSimuladas.variar(rnd), 5, 5, TimeUnit.SECONDS);

        if (web) {
            int porta = portaOverride != null ? portaOverride : cfg.webPort();
            executarWeb(app, credenciais, cfg.webHost(), porta, mercado);
            return;
        }

        try {
            new CliApp(app, credenciais, System.in, System.out).executar();
        } finally {
            app.encerrar();
            mercado.shutdownNow();
        }
    }

    private static void executarWeb(Aplicacao app, List<Credencial> credenciais, String host, int porta,
                                    ScheduledExecutorService mercado) throws IOException, InterruptedException {
        WebServer web = new WebServer(app, credenciais, host, porta);
        CountDownLatch encerrado = new CountDownLatch(1);
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            web.close();
            app.encerrar();
            mercado.shutdownNow();
            encerrado.countDown();
        }, "sentinel-shutdown"));
        web.iniciar();
        System.out.println("==========================================================");
        System.out.println(" SentinelTrade Web — Orion Capital  (SISTEMA 100% SIMULADO)");
        System.out.printf(" Acesse no navegador: http://%s:%d%n", host, web.portaReal());
        System.out.println("==========================================================");
        if (!credenciais.isEmpty()) {
            System.out.println("Contas de demonstração disponíveis na tela de login:");
            for (Credencial c : credenciais)
                System.out.printf("  %-14s %-22s senha: %s%n", c.papel(), c.email(), c.senha());
        }
        encerrado.await();
    }
}
