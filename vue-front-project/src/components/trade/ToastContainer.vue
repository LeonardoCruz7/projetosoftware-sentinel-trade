<script setup lang="ts">
import { useTradeStore } from '@/stores/trade'

const tradeStore = useTradeStore()

const dismiss = (id: string) => {
  const item = tradeStore.notifications.find((n) => n.id === id)
  if (item) item.read = true
}
</script>

<template>
  <div class="toast-wrapper">
    <transition-group name="toast">
      <div
        v-for="item in tradeStore.notifications.slice(0, 4)"
        :key="item.id"
        v-show="!item.read"
        :class="['toast-card', `toast-${item.type}`]"
      >
        <div class="toast-icon">
          <span v-if="item.type === 'success'">✓</span>
          <span v-else-if="item.type === 'error'">✕</span>
          <span v-else-if="item.type === 'warning'">⚠️</span>
          <span v-else>ℹ️</span>
        </div>
        <div class="toast-body">
          <strong class="toast-title">{{ item.title }}</strong>
          <p class="toast-message">{{ item.message }}</p>
          <span class="toast-time">{{ item.timestamp }}</span>
        </div>
        <button class="toast-close" @click="dismiss(item.id)">✕</button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-wrapper {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 10000;
  max-width: 360px;
  pointer-events: none;
}

.toast-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  transition: all 0.3s ease;
}

.toast-icon {
  font-size: 1.1rem;
  font-weight: 700;
}

.toast-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.toast-title {
  font-size: 0.85rem;
  color: var(--color-heading);
}

.toast-message {
  font-size: 0.75rem;
  color: var(--color-text);
  line-height: 1.3;
}

.toast-time {
  font-size: 0.65rem;
  color: var(--color-text);
  opacity: 0.6;
}

.toast-close {
  background: none;
  border: none;
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.6;
  cursor: pointer;
  padding: 0.2rem;
}

.toast-close:hover {
  opacity: 1;
}

.toast-success {
  border-left: 4px solid #10b981;
}
.toast-success .toast-icon {
  color: #10b981;
}

.toast-error {
  border-left: 4px solid #ef4444;
}
.toast-error .toast-icon {
  color: #ef4444;
}

.toast-warning {
  border-left: 4px solid #f59e0b;
}
.toast-warning .toast-icon {
  color: #f59e0b;
}

.toast-info {
  border-left: 4px solid #3b82f6;
}
.toast-info .toast-icon {
  color: #3b82f6;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.toast-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
