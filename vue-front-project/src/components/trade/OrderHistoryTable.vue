<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTradeStore } from '@/stores/trade'
import type { OrderStatus } from '@/types/trade'

const tradeStore = useTradeStore()
const filterStatus = ref<'ALL' | 'OPEN' | 'EXECUTED' | 'REJECTED_CANCELLED'>('ALL')

const filteredOrders = computed(() => {
  return tradeStore.orders.filter((ord) => {
    if (filterStatus.value === 'ALL') return true
    if (filterStatus.value === 'OPEN') {
      return ord.status === 'TRANSMITTED' || ord.status === 'PENDING_VALIDATION' || ord.status === 'VALIDATING_RISK'
    }
    if (filterStatus.value === 'EXECUTED') {
      return ord.status === 'EXECUTED'
    }
    if (filterStatus.value === 'REJECTED_CANCELLED') {
      return ord.status === 'REJECTED' || ord.status === 'CANCELLED' || ord.status === 'FAILED'
    }
    return true
  })
})

const getStatusBadge = (status: OrderStatus) => {
  switch (status) {
    case 'PENDING_VALIDATION':
      return { text: '1. Criada', class: 'badge-pending' }
    case 'VALIDATING_RISK':
      return { text: '2. Avaliando Risco', class: 'badge-validating' }
    case 'TRANSMITTED':
      return { text: '3. Transmitida à Bolsa', class: 'badge-transmitted' }
    case 'EXECUTED':
      return { text: '✓ 4. Executada', class: 'badge-executed' }
    case 'REJECTED':
      return { text: '✕ Rejeitada (Risco)', class: 'badge-rejected' }
    case 'CANCELLED':
      return { text: '⊘ Cancelada', class: 'badge-cancelled' }
    case 'FAILED':
      return { text: '⚠ Falha / Circuit', class: 'badge-failed' }
  }
}

const handleCancel = (orderId: string) => {
  tradeStore.cancelOrder(orderId)
}
</script>

<template>
  <div class="orders-card">
    <div class="orders-header">
      <div>
        <h3 class="section-title">Acompanhamento do Ciclo de Vida das Ordens (RF-04 / RF-07)</h3>
        <span class="section-sub">Transmissão em tempo real para a Bolsa/Corretora simulada</span>
      </div>

      <!-- Filtros de Ordens -->
      <div class="order-filters">
        <button
          :class="['filter-btn', { active: filterStatus === 'ALL' }]"
          @click="filterStatus = 'ALL'"
        >
          Todas ({{ tradeStore.orders.length }})
        </button>
        <button
          :class="['filter-btn', { active: filterStatus === 'OPEN' }]"
          @click="filterStatus = 'OPEN'"
        >
          Abertas
        </button>
        <button
          :class="['filter-btn', { active: filterStatus === 'EXECUTED' }]"
          @click="filterStatus = 'EXECUTED'"
        >
          Executadas
        </button>
        <button
          :class="['filter-btn', { active: filterStatus === 'REJECTED_CANCELLED' }]"
          @click="filterStatus = 'REJECTED_CANCELLED'"
        >
          Rejeitadas/Canceladas
        </button>
      </div>
    </div>

    <!-- Stepper de Ciclo de Vida Explicativo (RF-07) -->
    <div class="lifecycle-banner">
      <span class="lifecycle-title">Fluxo de Ciclo de Vida das Ordens:</span>
      <div class="lifecycle-steps">
        <span class="step-pill">1. Criação</span>
        <span class="step-arrow">➔</span>
        <span class="step-pill">2. Motor de Risco</span>
        <span class="step-arrow">➔</span>
        <span class="step-pill">3. Transmissão à Bolsa</span>
        <span class="step-arrow">➔</span>
        <span class="step-pill step-end">4. Execução / Rejeição</span>
      </div>
    </div>

    <div v-if="filteredOrders.length === 0" class="empty-orders">
      <span>Nenhuma ordem encontrada neste filtro. Envie uma ordem pela boleta ao lado.</span>
    </div>

    <div v-else class="table-responsive">
      <table class="orders-table">
        <thead>
          <tr>
            <th>ID / Horário</th>
            <th>Ativo</th>
            <th>Lado</th>
            <th>Tipo</th>
            <th>Qtd.</th>
            <th>Preço</th>
            <th>Total (R$)</th>
            <th>Status / Ciclo de Vida</th>
            <th class="text-right">Ação</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ord in filteredOrders" :key="ord.id">
            <td>
              <div class="order-id-col">
                <span class="order-id">{{ ord.id }}</span>
                <span class="order-time">{{ ord.createdAt }}</span>
              </div>
            </td>
            <td>
              <strong class="symbol-name">{{ ord.symbol }}</strong>
            </td>
            <td>
              <span :class="['side-badge', ord.side === 'BUY' ? 'side-buy' : 'side-sell']">
                {{ ord.side === 'BUY' ? 'COMPRA' : 'VENDA' }}
              </span>
            </td>
            <td>{{ ord.type === 'MARKET' ? 'A Mercado' : 'Limitada' }}</td>
            <td>{{ ord.quantity }}</td>
            <td>R$ {{ ord.price.toFixed(2) }}</td>
            <td>
              <strong>R$ {{ ord.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</strong>
            </td>
            <td>
              <div class="status-col">
                <span :class="['status-badge', getStatusBadge(ord.status).class]">
                  {{ getStatusBadge(ord.status).text }}
                </span>
                <small v-if="ord.statusReason" class="status-reason">
                  {{ ord.statusReason }}
                </small>
              </div>
            </td>
            <td class="text-right">
              <button
                v-if="ord.status === 'TRANSMITTED' || ord.status === 'PENDING_VALIDATION'"
                @click="handleCancel(ord.id)"
                class="btn-cancel-order"
                title="Cancelar ordem na bolsa"
              >
                Cancelar
              </button>
              <span v-else class="text-muted">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.orders-card {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem;
}

.orders-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.75rem;
  margin-bottom: 0.75rem;
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

.order-filters {
  display: flex;
  gap: 0.4rem;
}

.filter-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  color: var(--color-text);
  cursor: pointer;
}

.filter-btn.active {
  background-color: var(--color-heading);
  color: var(--color-background);
  border-color: var(--color-heading);
}

.lifecycle-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: var(--color-background);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.75rem;
  flex-wrap: wrap;
}

.lifecycle-title {
  font-weight: 700;
  color: var(--color-heading);
}

.lifecycle-steps {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.step-pill {
  padding: 0.15rem 0.45rem;
  background-color: var(--color-background-mute);
  border-radius: 4px;
  font-size: 0.7rem;
  color: var(--color-text);
}

.step-arrow {
  color: var(--color-text);
  opacity: 0.5;
}

.table-responsive {
  overflow-x: auto;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.orders-table th {
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  opacity: 0.7;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.orders-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
}

.order-id-col {
  display: flex;
  flex-direction: column;
}

.order-id {
  font-weight: 700;
  color: var(--color-heading);
  font-size: 0.8rem;
}

.order-time {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.7;
}

.symbol-name {
  color: var(--color-heading);
}

.side-badge {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
}

.side-buy {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.side-sell {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.status-col {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.status-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  width: fit-content;
}

.badge-pending {
  background-color: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}

.badge-validating {
  background-color: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.badge-transmitted {
  background-color: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.badge-executed {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.badge-rejected {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.badge-cancelled {
  background-color: rgba(156, 163, 175, 0.2);
  color: #9ca3af;
}

.badge-failed {
  background-color: rgba(239, 68, 68, 0.25);
  color: #b91c1c;
}

.status-reason {
  font-size: 0.7rem;
  color: #ef4444;
  max-width: 200px;
}

.btn-cancel-order {
  background: none;
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel-order:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.text-right {
  text-align: right;
}

.text-muted {
  color: var(--color-text);
  opacity: 0.4;
}

.empty-orders {
  padding: 2.5rem;
  text-align: center;
  color: var(--color-text);
  opacity: 0.6;
  font-size: 0.85rem;
}
</style>
