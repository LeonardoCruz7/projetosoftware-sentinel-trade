<template>
  <div class="about-page">
    <header class="about-header">
      <span class="badge-academic">Exercício Integrador Acadêmico • 5º Semestre</span>
      <h1>SentinelTrade — Orion Capital</h1>
      <p class="lead">
        Sistema de Trade Financeiro de Alta Criticidade para negociação simulada de Ações, ETFs e Fundos Imobiliários.
      </p>
    </header>

    <div class="cards-grid">
      <div class="about-card">
        <h3>🎯 Objetivo do Sistema</h3>
        <p>
          Integrar as operações da corretora fictícia Orion Capital, provendo rastreabilidade total de ordens,
          controle de risco pré-trade em tempo real, auditoria imutável e resiliência a falhas.
        </p>
      </div>

      <div class="about-card">
        <h3>🛡️ Arquitetura de Risco & Segurança</h3>
        <p>
          Validação rigorosa de saldo, limite diário de risco, posição em custódia e situação do mercado antes da
          transmissão. Autenticação multifator (MFA) e proteção contra duplicidade com tokens de idempotência.
        </p>
      </div>

      <div class="about-card">
        <h3>📜 Auditoria Imutável (RF-08)</h3>
        <p>
          Trilha de auditoria criptograficamente encadeada (SHA-256 hash-chain), registrando cada evento desde o login
          até o ciclo de vida completo de cada ordem.
        </p>
      </div>
    </div>

    <section class="requirements-section">
      <h2>Requisitos Atendidos no Frontend</h2>
      <div class="req-grid">
        <div class="req-item"><strong>RF-01:</strong> Dados de investidores, contas, carteiras e limites</div>
        <div class="req-item"><strong>RF-02:</strong> Consulta de saldo e posição em custódia</div>
        <div class="req-item"><strong>RF-03:</strong> Cotações em tempo quase real com feed de mercado</div>
        <div class="req-item"><strong>RF-04:</strong> Envio, cancelamento e consulta de ordens</div>
        <div class="req-item"><strong>RF-05:</strong> Motor de validação pré-trade de risco e saldo</div>
        <div class="req-item"><strong>RF-06:</strong> Integração com Bolsa/Corretora simulada</div>
        <div class="req-item"><strong>RF-07:</strong> Acompanhamento de ciclo de vida das ordens</div>
        <div class="req-item"><strong>RF-08:</strong> Logs de auditoria imutáveis com encadeamento de hash</div>
        <div class="req-item"><strong>RF-09:</strong> Central de notificações ao investidor (toasts)</div>
        <div class="req-item"><strong>RNF-01:</strong> Autenticação de usuários com MFA</div>
        <div class="req-item"><strong>RNF-02:</strong> Idempotência e controle de indisponibilidade (Circuit Breaker)</div>
      </div>
    </section>

    <footer class="team-footer">
      <strong>Equipe SentinelTrade:</strong> Leonardo Aquino Cruz (10445016) • Victor Esteves Gallo Birello (10737139)
    </footer>
  </div>
</template>

<style scoped>
.about-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem 0;
}

.about-header {
  text-align: center;
}

.badge-academic {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background-color: hsla(160, 100%, 37%, 0.15);
  color: hsla(160, 100%, 37%, 1);
  margin-bottom: 0.75rem;
}

h1 {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 0.5rem;
}

.lead {
  font-size: 1.05rem;
  color: var(--color-text);
  opacity: 0.8;
  max-width: 650px;
  margin: 0 auto;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
}

.about-card {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
}

.about-card h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 0.5rem;
}

.about-card p {
  font-size: 0.85rem;
  color: var(--color-text);
  line-height: 1.5;
}

.requirements-section {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
}

.requirements-section h2 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 1rem;
}

.req-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.75rem;
}

.req-item {
  font-size: 0.8rem;
  color: var(--color-text);
  padding: 0.5rem;
  background-color: var(--color-background);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.team-footer {
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.75;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}
</style>
