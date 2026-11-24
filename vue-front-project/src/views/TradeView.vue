<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useTradeStore } from '@/stores/trade'
import MarketTicker from '@/components/trade/MarketTicker.vue'
import AccountSummary from '@/components/trade/AccountSummary.vue'
import AssetSelector from '@/components/trade/AssetSelector.vue'
import OrderTicket from '@/components/trade/OrderTicket.vue'
import PortfolioTable from '@/components/trade/PortfolioTable.vue'
import OrderHistoryTable from '@/components/trade/OrderHistoryTable.vue'
import AuditLogModal from '@/components/trade/AuditLogModal.vue'
import ToastContainer from '@/components/trade/ToastContainer.vue'

const tradeStore = useTradeStore()
const activeBottomTab = ref<'PORTFOLIO' | 'ORDERS'>('PORTFOLIO')
const isAuditModalOpen = ref(false)

onMounted(() => {
  // Inicia feed de cotações contínuo
  tradeStore.startMarketFeed()
})

onUnmounted(() => {
  tradeStore.stopMarketFeed()
})
</script>

<template>
  <div class="trade-dashboard">
    <!-- Componentes Globais / Flutuantes -->
    <ToastContainer />
    <AuditLogModal :is-open="isAuditModalOpen" @close="isAuditModalOpen = false" />

    <!-- Barra de Ticker de Cotações em Tempo Real (RF-03) -->
    <MarketTicker />

    <!-- Barra de Resumo de Conta, Limites de Risco e Situação do Mercado -->
    <AccountSummary />

    <!-- Seção de Ações Rápidas & Auditoria -->
    <div class="quick-actions-bar">
      <div class="account-badge">
        <span class="account-icon">🏦</span>
        <span>Conta: <strong>{{ tradeStore.account.accountNumber }}</strong></span>
        <span class="divider">•</span>
        <span>Perfil: <strong>{{ tradeStore.account.riskProfile }}</strong></span>
      </div>

      <div class="action-buttons">
        <button class="btn-audit-trigger" @click="isAuditModalOpen = true">
          📜 Trilha de Auditoria Imutável (RF-08)
        </button>
      </div>
    </div>

    <!-- Grid Principal de Negociação: Ativos & Boleta -->
    <div class="trade-main-grid">
      <!-- Coluna Esquerda: Ativo, Cotação, Livro de Ofertas e Lista -->
      <section class="grid-left">
        <AssetSelector />
      </section>

      <!-- Coluna Direita: Boleta de Negociação & Validação de Risco -->
      <section class="grid-right">
        <OrderTicket />
      </section>
    </div>

    <!-- Seção Inferior: Abas de Custódia e Acompanhamento de Ordens -->
    <section class="trade-bottom-section">
      <div class="bottom-tabs">
        <button
          :class="['bottom-tab-btn', { active: activeBottomTab === 'PORTFOLIO' }]"
          @click="activeBottomTab = 'PORTFOLIO'"
        >
          Minha Carteira / Custódia ({{ tradeStore.positions.length }})
        </button>
        <button
          :class="['bottom-tab-btn', { active: activeBottomTab === 'ORDERS' }]"
          @click="activeBottomTab = 'ORDERS'"
        >
          Ordens & Ciclo de Vida ({{ tradeStore.orders.length }})
        </button>
      </div>

      <div class="bottom-content">
        <PortfolioTable v-if="activeBottomTab === 'PORTFOLIO'" />
        <OrderHistoryTable v-else />
      </div>
    </section>
  </div>
</template>

<style scoped>
.trade-dashboard {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 2rem;
}

.quick-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.6rem 1rem;
}

.account-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text);
}

.divider {
  opacity: 0.4;
}

.btn-audit-trigger {
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-heading);
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-audit-trigger:hover {
  border-color: hsla(160, 100%, 37%, 1);
  color: hsla(160, 100%, 37%, 1);
}

.trade-main-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 900px) {
  .trade-main-grid {
    grid-template-columns: 1.3fr 1fr;
  }
}

.trade-bottom-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bottom-tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.bottom-tab-btn {
  background: none;
  border: none;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.bottom-tab-btn.active {
  background-color: var(--color-background-soft);
  color: hsla(160, 100%, 37%, 1);
}

.bottom-content {
  margin-top: 0.25rem;
}
</style>
