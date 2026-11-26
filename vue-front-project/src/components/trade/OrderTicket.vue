<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTradeStore } from '@/stores/trade'
import type { OrderSide, OrderType } from '@/types/trade'

const tradeStore = useTradeStore()

const side = ref<OrderSide>('BUY')
const orderType = ref<OrderType>('MARKET')
const quantity = ref<number>(100)
const limitPrice = ref<number>(tradeStore.selectedAsset.price)
const isSubmitting = ref(false)

// Atualiza o preço da boleta quando o ativo selecionado mudar
watch(
  () => tradeStore.selectedAsset.price,
  (newPrice) => {
    if (orderType.value === 'MARKET') {
      limitPrice.value = newPrice
    }
  },
  { immediate: true },
)

const activePrice = computed(() => {
  return orderType.value === 'MARKET' ? tradeStore.selectedAsset.price : limitPrice.value
})

const estimatedTotal = computed(() => {
  return Number((quantity.value * activePrice.value).toFixed(2))
})

const userPosition = computed(() => {
  return tradeStore.positions.find((p) => p.symbol === tradeStore.selectedAsset.symbol)
})

// Validações dinâmicas de risco em tempo de digitação (Pré-Trade)
const preTradeRiskFeedback = computed(() => {
  const issues: string[] = []

  if (tradeStore.marketStatus !== 'OPEN') {
    issues.push(`Mercado em ${tradeStore.marketStatus}. Ordens serão rejeitadas.`)
  }

  if (quantity.value <= 0) {
    issues.push('Quantidade deve ser maior que zero.')
  }

  if (activePrice.value <= 0) {
    issues.push('Preço deve ser maior que zero.')
  }

  if (side.value === 'BUY') {
    if (estimatedTotal.value > tradeStore.account.cashBalance) {
      issues.push(
        `Saldo insuficiente (Falta R$ ${(estimatedTotal.value - tradeStore.account.cashBalance).toFixed(2)})`,
      )
    }
    if (estimatedTotal.value > tradeStore.remainingRiskLimit) {
      issues.push(
        `Excede teto de risco em R$ ${(estimatedTotal.value - tradeStore.remainingRiskLimit).toFixed(2)}`,
      )
    }
  } else {
    // VENDA
    const availableQty = userPosition.value?.quantity || 0
    if (quantity.value > availableQty) {
      issues.push(`Custódia insuficiente (Você possui ${availableQty} ações)`)
    }
  }

  return issues
})

const canSubmit = computed(() => {
  return preTradeRiskFeedback.value.length === 0 && !isSubmitting.value
})

const addQuantity = (delta: number) => {
  quantity.value = Math.max(1, (quantity.value || 0) + delta)
}

const handleTradeSubmit = async () => {
  if (!canSubmit.value) return

  isSubmitting.value = true
  try {
    // Gera token de idempotência exclusivo para evitar duplicidade
    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    await tradeStore.submitOrder({
      symbol: tradeStore.selectedAsset.symbol,
      side: side.value,
      type: orderType.value,
      quantity: quantity.value,
      price: activePrice.value,
      idempotencyKey,
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="order-ticket-card">
    <div class="ticket-header">
      <div class="header-titles">
        <h3 class="ticket-title">Boleta de Negociação</h3>
        <span class="sub-title">Motor de Risco & Validação Pré-Trade (RF-05)</span>
      </div>
      <div class="idempotency-badge" title="Prevenção contra duplicidade de ordem (RNF-02)">
        🛡️ Idempotência Ativa
      </div>
    </div>

    <!-- Abas de Lado da Operação (Compra / Venda) -->
    <div class="side-selector">
      <button
        :class="['side-btn', 'btn-buy', { active: side === 'BUY' }]"
        @click="side = 'BUY'"
      >
        COMPRA (C)
      </button>
      <button
        :class="['side-btn', 'btn-sell', { active: side === 'SELL' }]"
        @click="side = 'SELL'"
      >
        VENDA (V)
      </button>
    </div>

    <form @submit.prevent="handleTradeSubmit" class="ticket-form">
      <!-- Tipo de Ordem -->
      <div class="form-row">
        <label>Tipo de Ordem</label>
        <div class="type-pill-group">
          <button
            type="button"
            :class="['type-pill', { active: orderType === 'MARKET' }]"
            @click="orderType = 'MARKET'"
          >
            A Mercado
          </button>
          <button
            type="button"
            :class="['type-pill', { active: orderType === 'LIMIT' }]"
            @click="orderType = 'LIMIT'"
          >
            Limitada
          </button>
        </div>
      </div>

      <!-- Ativo & Cotação -->
      <div class="form-row">
        <label>Ativo Selecionado</label>
        <div class="asset-display-box">
          <span class="display-symbol">{{ tradeStore.selectedAsset.symbol }}</span>
          <span class="display-quote">Cotação: R$ {{ tradeStore.selectedAsset.price.toFixed(2) }}</span>
        </div>
      </div>

      <!-- Quantidade -->
      <div class="form-row">
        <div class="label-row">
          <label for="quantity">Quantidade</label>
          <span v-if="side === 'SELL'" class="custody-hint">
            Em custódia: {{ userPosition?.quantity || 0 }}
          </span>
        </div>
        <div class="input-with-steppers">
          <input
            id="quantity"
            v-model.number="quantity"
            type="number"
            min="1"
            step="10"
            required
            class="ticket-input"
          />
          <div class="qty-quick-buttons">
            <button type="button" @click="addQuantity(100)">+100</button>
            <button type="button" @click="addQuantity(500)">+500</button>
            <button type="button" @click="addQuantity(1000)">+1k</button>
          </div>
        </div>
      </div>

      <!-- Preço -->
      <div class="form-row">
        <label for="price">Preço da Ordem (R$)</label>
        <input
          id="price"
          v-model.number="limitPrice"
          type="number"
          step="0.01"
          min="0.01"
          :disabled="orderType === 'MARKET'"
          class="ticket-input"
        />
        <small v-if="orderType === 'MARKET'" class="hint-text">
          Execução garantida ao melhor preço de mercado.
        </small>
      </div>

      <!-- Resumo Financeiro da Ordem -->
      <div class="order-summary-box">
        <div class="summary-line">
          <span>Volume Financeiro Estimado:</span>
          <strong>R$ {{ estimatedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</strong>
        </div>
        <div class="summary-line">
          <span>Saldo Livre Atual:</span>
          <span>R$ {{ tradeStore.account.cashBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
        </div>
        <div class="summary-line">
          <span>Limite de Risco Diário Restante:</span>
          <span>R$ {{ tradeStore.remainingRiskLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
        </div>
      </div>

      <!-- Alertas do Motor de Risco Pré-Trade (RF-05) -->
      <div v-if="preTradeRiskFeedback.length > 0" class="risk-alerts-box">
        <div class="risk-alert-title">
          ⚠️ Bloqueio do Motor de Risco (RF-05):
        </div>
        <ul>
          <li v-for="(issue, idx) in preTradeRiskFeedback" :key="idx">
            {{ issue }}
          </li>
        </ul>
      </div>

      <!-- Botão de Envio de Ordem -->
      <button
        type="submit"
        :disabled="!canSubmit"
        :class="['submit-order-btn', side === 'BUY' ? 'btn-submit-buy' : 'btn-submit-sell']"
      >
        <span v-if="isSubmitting" class="spinner-small"></span>
        <span v-if="isSubmitting">Validando Risco & Roteando...</span>
        <span v-else>
          {{ side === 'BUY' ? 'Enviar Ordem de COMPRA' : 'Enviar Ordem de VENDA' }}
          ({{ tradeStore.selectedAsset.symbol }})
        </span>
      </button>
    </form>
  </div>
</template>

<style scoped>
.order-ticket-card {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.75rem;
}

.ticket-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-heading);
}

.sub-title {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.7;
}

.idempotency-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border-radius: 4px;
}

.side-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.side-btn {
  padding: 0.65rem;
  font-weight: 700;
  font-size: 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-buy.active {
  background-color: #10b981;
  color: #ffffff;
  border-color: #10b981;
}

.btn-sell.active {
  background-color: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
}

.ticket-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-heading);
}

.custody-hint {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.8;
}

.type-pill-group {
  display: flex;
  gap: 0.4rem;
}

.type-pill {
  flex: 1;
  padding: 0.4rem;
  font-size: 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
}

.type-pill.active {
  background-color: var(--color-heading);
  color: var(--color-background);
  border-color: var(--color-heading);
}

.asset-display-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.8rem;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.display-symbol {
  font-weight: 800;
  font-size: 1rem;
  color: var(--color-heading);
}

.display-quote {
  font-size: 0.85rem;
  color: var(--color-text);
}

.ticket-input {
  width: 100%;
  padding: 0.65rem 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  color: var(--color-text);
  font-size: 0.95rem;
  outline: none;
}

.ticket-input:focus {
  border-color: hsla(160, 100%, 37%, 1);
}

.input-with-steppers {
  display: flex;
  gap: 0.5rem;
}

.qty-quick-buttons {
  display: flex;
  gap: 0.25rem;
}

.qty-quick-buttons button {
  padding: 0 0.5rem;
  font-size: 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  cursor: pointer;
}

.qty-quick-buttons button:hover {
  background: var(--color-border);
}

.hint-text {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.7;
}

.order-summary-box {
  background-color: var(--color-background);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.75rem;
}

.summary-line {
  display: flex;
  justify-content: space-between;
  color: var(--color-text);
}

.risk-alerts-box {
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.75rem;
  color: #ef4444;
}

.risk-alert-title {
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.risk-alerts-box ul {
  margin: 0;
  padding-left: 1.2rem;
}

.submit-order-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.85rem;
  border-radius: 8px;
  border: none;
  font-size: 0.95rem;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit-buy {
  background-color: #10b981;
}

.btn-submit-buy:hover:not(:disabled) {
  background-color: #059669;
}

.btn-submit-sell {
  background-color: #ef4444;
}

.btn-submit-sell:hover:not(:disabled) {
  background-color: #dc2626;
}

.submit-order-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
