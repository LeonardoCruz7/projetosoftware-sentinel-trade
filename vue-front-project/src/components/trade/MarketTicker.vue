<script setup lang="ts">
import { useTradeStore } from '@/stores/trade'

const tradeStore = useTradeStore()

const selectAsset = (symbol: string) => {
  tradeStore.selectedSymbol = symbol
}
</script>

<template>
  <div class="ticker-bar">
    <div class="ticker-label">
      <span class="live-dot"></span>
      <span>COTAÇÕES AO VIVO (RF-03)</span>
    </div>
    <div class="ticker-track">
      <div
        v-for="asset in tradeStore.assets"
        :key="asset.symbol"
        :class="[
          'ticker-item',
          { 'is-selected': asset.symbol === tradeStore.selectedSymbol },
          asset.changePercent >= 0 ? 'up' : 'down',
        ]"
        @click="selectAsset(asset.symbol)"
        role="button"
        tabindex="0"
      >
        <span class="ticker-symbol">{{ asset.symbol }}</span>
        <span class="ticker-price">R$ {{ asset.price.toFixed(2) }}</span>
        <span class="ticker-change">
          {{ asset.changePercent >= 0 ? '+' : '' }}{{ asset.changePercent.toFixed(2) }}%
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ticker-bar {
  display: flex;
  align-items: center;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.4rem 0.8rem;
  overflow: hidden;
  margin-bottom: 1.25rem;
  gap: 1rem;
}

.ticker-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-heading);
  letter-spacing: 0.05em;
  white-space: nowrap;
  padding-right: 0.75rem;
  border-right: 1px solid var(--color-border);
}

.live-dot {
  width: 8px;
  height: 8px;
  background-color: #10b981;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.9);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(0.9);
    opacity: 0.8;
  }
}

.ticker-track {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: thin;
  padding-bottom: 2px;
}

.ticker-track::-webkit-scrollbar {
  height: 4px;
}

.ticker-track::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

.ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  background-color: var(--color-background);
  border: 1px solid transparent;
  transition: all 0.2s;
}

.ticker-item:hover {
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
}

.ticker-item.is-selected {
  border-color: hsla(160, 100%, 37%, 1);
  box-shadow: 0 0 0 1px hsla(160, 100%, 37%, 0.4);
}

.ticker-symbol {
  font-weight: 700;
  color: var(--color-heading);
}

.ticker-price {
  color: var(--color-text);
}

.ticker-change {
  font-weight: 600;
  font-size: 0.75rem;
}

.ticker-item.up .ticker-change {
  color: #10b981;
}

.ticker-item.down .ticker-change {
  color: #ef4444;
}
</style>
