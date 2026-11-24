<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTradeStore } from '@/stores/trade'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const tradeStore = useTradeStore()
const filterAction = ref<string>('ALL')

const filteredLogs = computed(() => {
  if (filterAction.value === 'ALL') return tradeStore.auditLogs
  return tradeStore.auditLogs.filter((l) => l.action === filterAction.value)
})
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <div class="badge-audit">RF-08 • Auditoria de Alta Criticidade</div>
          <h2 class="modal-title">Trilha de Auditoria Imutável (Audit Trail)</h2>
          <p class="modal-subtitle">
            Logs criptograficamente encadeados (hash chain) com garantia de não repúdio e integridade.
          </p>
        </div>
        <button class="btn-close" @click="emit('close')">✕</button>
      </div>

      <div class="modal-controls">
        <label>Filtrar por Ação:</label>
        <select v-model="filterAction" class="select-filter">
          <option value="ALL">Todas as Ações</option>
          <option value="ORDER_CREATED">Criação de Ordem</option>
          <option value="RISK_VALIDATION_PASSED">Risco Aprovado</option>
          <option value="RISK_VALIDATION_REJECTED">Risco Rejeitado</option>
          <option value="ORDER_TRANSMITTED_EXCHANGE">Transmissão à Bolsa</option>
          <option value="ORDER_EXECUTED">Execução da Ordem</option>
          <option value="ORDER_CANCELLED">Cancelamento</option>
          <option value="MARKET_STATUS_CHANGED">Mudança de Mercado</option>
        </select>
        <span class="log-count">{{ filteredLogs.length }} registro(s)</span>
      </div>

      <div class="logs-container">
        <div v-for="log in filteredLogs" :key="log.id" class="log-item">
          <div class="log-top">
            <span class="log-timestamp">{{ new Date(log.timestamp).toLocaleString('pt-BR') }}</span>
            <span class="log-action">{{ log.action }}</span>
            <span class="log-user">Usuário: {{ log.user }}</span>
          </div>

          <div class="log-details">
            {{ log.details }}
          </div>

          <div class="log-crypto-chain">
            <div class="crypto-line">
              <span class="hash-label">Hash Anterior:</span>
              <code class="hash-code">{{ log.previousHash }}</code>
            </div>
            <div class="crypto-line">
              <span class="hash-label">Hash Atual (SHA-256):</span>
              <code class="hash-code text-green">{{ log.hash }}</code>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-primary" @click="emit('close')">Fechar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-card {
  width: 100%;
  max-width: 850px;
  max-height: 85vh;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 1rem;
}

.badge-audit {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  background-color: hsla(160, 100%, 37%, 0.15);
  color: hsla(160, 100%, 37%, 1);
  border-radius: 4px;
  margin-bottom: 0.35rem;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-heading);
}

.modal-subtitle {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.75;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--color-text);
  cursor: pointer;
}

.modal-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.8rem;
}

.select-filter {
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.8rem;
}

.log-count {
  margin-left: auto;
  color: var(--color-text);
  opacity: 0.7;
}

.logs-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.log-item {
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.log-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.log-timestamp {
  color: var(--color-text);
  opacity: 0.7;
}

.log-action {
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  background-color: var(--color-background-mute);
  border-radius: 4px;
  color: var(--color-heading);
}

.log-user {
  color: var(--color-text);
  opacity: 0.8;
}

.log-details {
  font-size: 0.85rem;
  color: var(--color-heading);
  line-height: 1.4;
}

.log-crypto-chain {
  background-color: var(--color-background-soft);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-size: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.crypto-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  overflow: hidden;
}

.hash-label {
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.7;
  white-space: nowrap;
}

.hash-code {
  font-family: monospace;
  font-size: 0.68rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.text-green {
  color: #10b981;
}

.modal-footer {
  border-top: 1px solid var(--color-border);
  padding-top: 1rem;
  text-align: right;
}

.btn-primary {
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  border: none;
  background-color: hsla(160, 100%, 37%, 1);
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
}
</style>
