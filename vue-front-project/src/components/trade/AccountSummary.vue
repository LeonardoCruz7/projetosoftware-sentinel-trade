<script setup lang="ts">
import { computed } from 'vue'
import { useTradeStore } from '@/stores/trade'
import type { MarketStatus } from '@/types/trade'

const tradeStore = useTradeStore()

const riskUsagePercent = computed(() => {
  if (tradeStore.account.dailyRiskLimit === 0) return 0
  const pct = (tradeStore.account.usedRiskLimit / tradeStore.account.dailyRiskLimit) * 100
  return Math.min(100, Number(pct.toFixed(1)))
})

const riskProgressColor = computed(() => {
  if (riskUsagePercent.value >= 90) return '#ef4444' // Crítico
  if (riskUsagePercent.value >= 70) return '#f59e0b' // Atenção
  return '#10b981' // Seguro
})

const handleStatusChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  tradeStore.toggleMarketStatus(target.value as MarketStatus)
}
</script>

<template>
  <div class="summary-grid">
    <!-- Card 1: Patrimônio Consolidado -->
    <div class="summary-card">
      <div class="card-icon equity-icon">💼</div>
      <div class="card-details">
        <span class="card-title">Patrimônio Líquido Total</span>
        <span class="card-value">
          R$ {{ tradeStore.totalEquity.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
        </span>
        <span class="card-sub">
          Em Ativos: R$ {{ tradeStore.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
        </span>
      </div>
    </div>

    <!-- Card 2: Saldo em Conta -->
    <div class="summary-card">
      <div class="card-icon cash-icon">💵</div>
      <div class="card-details">
        <span class="card-title">Saldo Disponível (RF-02)</span>
        <span class="card-value text-green">
          R$ {{ tradeStore.account.cashBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
        </span>
        <span class="card-sub">
          Bloqueado em Ordens: R$ {{ tradeStore.account.blockedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
        </span>
      </div>
    </div>

    <!-- Card 3: Limite de Risco Diário (RF-01 / RF-05) -->
    <div class="summary-card">
      <div class="card-icon risk-icon">🛡️</div>
      <div class="card-details">
        <div class="risk-header">
          <span class="card-title">Limite de Risco Diário</span>
          <span class="risk-badge" :style="{ backgroundColor: riskProgressColor + '20', color: riskProgressColor }">
            {{ riskUsagePercent }}% Consumido
          </span>
        </div>
        <span class="card-value">
          R$ {{ tradeStore.remainingRiskLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
        </span>
        <div class="risk-bar-container">
          <div
            class="risk-bar-fill"
            :style="{ width: riskUsagePercent + '%', backgroundColor: riskProgressColor }"
          ></div>
        </div>
        <span class="card-sub">
          Teto Diário: R$ {{ tradeStore.account.dailyRiskLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
        </span>
      </div>
    </div>

    <!-- Card 4: Situação do Mercado & Resiliência (RNF-02) -->
    <div class="summary-card">
      <div class="card-icon market-icon">⚡</div>
      <div class="card-details">
        <span class="card-title">Situação do Mercado (RNF-02)</span>
        <div class="market-status-row">
          <span
            :class="[
              'status-pill',
              {
                'status-open': tradeStore.marketStatus === 'OPEN',
                'status-circuit': tradeStore.marketStatus === 'CIRCUIT_BREAKER',
                'status-auction': tradeStore.marketStatus === 'AUCTION',
                'status-closed': tradeStore.marketStatus === 'CLOSED',
              },
            ]"
          >
            {{ tradeStore.marketStatus === 'OPEN' ? '🟢 ABERTO' : tradeStore.marketStatus }}
          </span>
          <!-- Seletor administrativo para simular contingências -->
          <select
            :value="tradeStore.marketStatus"
            @change="handleStatusChange"
            class="status-select"
            title="Simular contingência de mercado"
          >
            <option value="OPEN">Aberto</option>
            <option value="CIRCUIT_BREAKER">Circuit Breaker</option>
            <option value="AUCTION">Leilão</option>
            <option value="CLOSED">Fechado</option>
          </select>
        </div>
        <span class="card-sub">Simulação de indisponibilidade controlada</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.card-icon {
  font-size: 1.75rem;
  padding: 0.6rem;
  background-color: var(--color-background);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.card-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text);
  opacity: 0.8;
}

.card-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-heading);
}

.text-green {
  color: #10b981;
}

.card-sub {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.7;
}

.risk-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.risk-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 9999px;
}

.risk-bar-container {
  width: 100%;
  height: 6px;
  background-color: var(--color-background-mute);
  border-radius: 4px;
  overflow: hidden;
  margin: 0.2rem 0;
}

.risk-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.market-status-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.2rem 0;
}

.status-pill {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  letter-spacing: 0.03em;
}

.status-open {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.status-circuit {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.status-auction {
  background-color: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.status-closed {
  background-color: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}

.status-select {
  font-size: 0.75rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
}
</style>
