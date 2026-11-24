<script setup lang="ts">
import { useTradeStore } from '@/stores/trade'

const tradeStore = useTradeStore()

const handleQuickSell = (symbol: string) => {
  tradeStore.selectedSymbol = symbol
}
</script>

<template>
  <div class="portfolio-card">
    <div class="portfolio-header">
      <div>
        <h3 class="section-title">Minha Carteira & Custódia (RF-01 / RF-02)</h3>
        <span class="section-sub">Posições mantidas na Orion Capital</span>
      </div>
      <div class="header-total">
        <span class="total-label">Total em Custódia:</span>
        <strong class="total-val">
          R$ {{ tradeStore.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
        </strong>
      </div>
    </div>

    <div v-if="tradeStore.positions.length === 0" class="empty-state">
      <span>Nenhum ativo em custódia. Use a boleta ao lado para comprar.</span>
    </div>

    <div v-else class="table-responsive">
      <table class="custody-table">
        <thead>
          <tr>
            <th>Ativo</th>
            <th>Qtd.</th>
            <th>Preço Médio</th>
            <th>Cotação Atual</th>
            <th>Valor Atual</th>
            <th>Lucro / Prejuízo (P&L)</th>
            <th class="text-right">Ação</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pos in tradeStore.positions" :key="pos.symbol">
            <td>
              <strong class="symbol-code">{{ pos.symbol }}</strong>
            </td>
            <td>{{ pos.quantity }}</td>
            <td>R$ {{ pos.averagePrice.toFixed(2) }}</td>
            <td>R$ {{ pos.currentPrice.toFixed(2) }}</td>
            <td>
              <strong>R$ {{ pos.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</strong>
            </td>
            <td>
              <span
                :class="[
                  'pnl-tag',
                  pos.pnlAmount >= 0 ? 'pnl-positive' : 'pnl-negative',
                ]"
              >
                {{ pos.pnlAmount >= 0 ? '+' : '' }}R$ {{ pos.pnlAmount.toFixed(2) }}
                ({{ pos.pnlPercent >= 0 ? '+' : '' }}{{ pos.pnlPercent.toFixed(2) }}%)
              </span>
            </td>
            <td class="text-right">
              <button
                class="btn-quick-sell"
                @click="handleQuickSell(pos.symbol)"
                title="Carregar ativo na boleta de negociação"
              >
                Negociar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.portfolio-card {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem;
}

.portfolio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.75rem;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-heading);
}

.section-sub {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.7;
}

.header-total {
  text-align: right;
}

.total-label {
  font-size: 0.75rem;
  color: var(--color-text);
  margin-right: 0.4rem;
}

.total-val {
  font-size: 1.1rem;
  color: var(--color-heading);
}

.table-responsive {
  overflow-x: auto;
}

.custody-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.custody-table th {
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  opacity: 0.7;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.custody-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
}

.symbol-code {
  color: var(--color-heading);
  font-size: 0.9rem;
}

.pnl-tag {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.75rem;
}

.pnl-positive {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.pnl-negative {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.btn-quick-sell {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-quick-sell:hover {
  border-color: hsla(160, 100%, 37%, 1);
  color: hsla(160, 100%, 37%, 1);
}

.text-right {
  text-align: right;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--color-text);
  opacity: 0.6;
  font-size: 0.85rem;
}
</style>
