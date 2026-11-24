<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTradeStore } from '@/stores/trade'
import type { AssetType } from '@/types/trade'

const tradeStore = useTradeStore()

const activeTab = ref<'ALL' | AssetType>('ALL')
const searchQuery = ref('')

const filteredAssets = computed(() => {
  return tradeStore.assets.filter((asset) => {
    const matchesTab = activeTab.value === 'ALL' || asset.type === activeTab.value
    const matchesSearch =
      asset.symbol.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchesTab && matchesSearch
  })
})

const selectAsset = (symbol: string) => {
  tradeStore.selectedSymbol = symbol
}

// Gera path de linha SVG para o sparkline do ativo selecionado
const sparklinePoints = computed(() => {
  const history = tradeStore.selectedAsset.history
  if (!history || history.length < 2) return ''
  const min = Math.min(...history)
  const max = Math.max(...history)
  const range = max - min || 1
  const width = 240
  const height = 50

  const points = history.map((val, idx) => {
    const x = (idx / (history.length - 1)) * width
    const y = height - ((val - min) / range) * (height - 10) - 5
    return `${x},${y}`
  })

  return points.join(' ')
})
</script>

<template>
  <div class="asset-selector-card">
    <!-- Cabeçalho do Ativo Ativo Selecionado -->
    <div class="selected-asset-header">
      <div class="asset-info-left">
        <div class="symbol-badge">
          <span class="symbol-text">{{ tradeStore.selectedAsset.symbol }}</span>
          <span class="type-tag">{{ tradeStore.selectedAsset.type }}</span>
        </div>
        <h3 class="company-name">{{ tradeStore.selectedAsset.name }}</h3>
      </div>

      <div class="asset-info-right">
        <div class="current-price">R$ {{ tradeStore.selectedAsset.price.toFixed(2) }}</div>
        <div
          :class="[
            'change-badge',
            tradeStore.selectedAsset.changePercent >= 0 ? 'badge-up' : 'badge-down',
          ]"
        >
          {{ tradeStore.selectedAsset.changePercent >= 0 ? '▲ +' : '▼ ' }}
          {{ tradeStore.selectedAsset.changePercent.toFixed(2) }}% (R$ {{ tradeStore.selectedAsset.changeAmount.toFixed(2) }})
        </div>
      </div>
    </div>

    <!-- Mini Gráfico Sparkline & Métricas Rápidas -->
    <div class="asset-metrics-grid">
      <div class="sparkline-container">
        <span class="sparkline-title">Tendência Intradiária</span>
        <svg viewBox="0 0 240 50" class="sparkline-svg">
          <polyline
            fill="none"
            :stroke="tradeStore.selectedAsset.changePercent >= 0 ? '#10b981' : '#ef4444'"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            :points="sparklinePoints"
          />
        </svg>
      </div>

      <div class="stats-col">
        <div class="stat-item">
          <span class="stat-label">Máx. Dia</span>
          <span class="stat-val">R$ {{ tradeStore.selectedAsset.high.toFixed(2) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Mín. Dia</span>
          <span class="stat-val">R$ {{ tradeStore.selectedAsset.low.toFixed(2) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Volume</span>
          <span class="stat-val">{{ tradeStore.selectedAsset.volume.toLocaleString('pt-BR') }}</span>
        </div>
      </div>
    </div>

    <!-- Book de Ofertas Rápido (Bolsa Simulada) -->
    <div class="book-container">
      <span class="book-title">Livro de Ofertas (Top 4 Bids/Asks)</span>
      <div class="book-grid">
        <div class="book-side bids">
          <div class="book-header">Compra (Bids)</div>
          <div v-for="(bid, i) in tradeStore.orderBook.bids" :key="'bid-' + i" class="book-row">
            <span class="book-qty">{{ bid.quantity }}</span>
            <span class="book-price bid-color">R$ {{ bid.price.toFixed(2) }}</span>
          </div>
        </div>
        <div class="book-side asks">
          <div class="book-header">Venda (Asks)</div>
          <div v-for="(ask, i) in tradeStore.orderBook.asks" :key="'ask-' + i" class="book-row">
            <span class="book-price ask-color">R$ {{ ask.price.toFixed(2) }}</span>
            <span class="book-qty">{{ ask.quantity }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Seletor & Lista de Ativos Disponíveis -->
    <div class="list-section">
      <div class="tabs-and-search">
        <div class="tabs">
          <button
            :class="['tab-btn', { active: activeTab === 'ALL' }]"
            @click="activeTab = 'ALL'"
          >
            Todos
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'STOCK' }]"
            @click="activeTab = 'STOCK'"
          >
            Ações
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'ETF' }]"
            @click="activeTab = 'ETF'"
          >
            ETFs
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'FII' }]"
            @click="activeTab = 'FII'"
          >
            FIIs
          </button>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar ticker ou nome..."
          class="search-input"
        />
      </div>

      <div class="assets-scroll-list">
        <div
          v-for="item in filteredAssets"
          :key="item.symbol"
          :class="[
            'asset-row-item',
            { 'is-active': item.symbol === tradeStore.selectedSymbol },
          ]"
          @click="selectAsset(item.symbol)"
        >
          <div class="row-left">
            <span class="row-symbol">{{ item.symbol }}</span>
            <span class="row-name">{{ item.name }}</span>
          </div>
          <div class="row-right">
            <span class="row-price">R$ {{ item.price.toFixed(2) }}</span>
            <span
              :class="[
                'row-change',
                item.changePercent >= 0 ? 'text-up' : 'text-down',
              ]"
            >
              {{ item.changePercent >= 0 ? '+' : '' }}{{ item.changePercent.toFixed(2) }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.asset-selector-card {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.selected-asset-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.symbol-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.symbol-text {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--color-heading);
}

.type-tag {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  background-color: var(--color-background-mute);
  border-radius: 4px;
  color: var(--color-text);
}

.company-name {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.8;
  margin-top: 0.15rem;
}

.asset-info-right {
  text-align: right;
}

.current-price {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-heading);
}

.change-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
  margin-top: 0.2rem;
}

.badge-up {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.badge-down {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.asset-metrics-grid {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 1rem;
  align-items: center;
  background-color: var(--color-background);
  border-radius: 8px;
  padding: 0.75rem;
}

.sparkline-container {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.sparkline-title {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.7;
}

.sparkline-svg {
  width: 100%;
  height: 45px;
}

.stats-col {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border-left: 1px solid var(--color-border);
  padding-left: 0.75rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.stat-label {
  color: var(--color-text);
  opacity: 0.7;
}

.stat-val {
  font-weight: 600;
  color: var(--color-heading);
}

.book-container {
  background-color: var(--color-background);
  border-radius: 8px;
  padding: 0.75rem;
}

.book-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.8;
  display: block;
  margin-bottom: 0.5rem;
}

.book-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.book-header {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text);
  opacity: 0.6;
  margin-bottom: 0.3rem;
}

.book-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  padding: 0.15rem 0;
  border-bottom: 1px dashed var(--color-border);
}

.book-qty {
  color: var(--color-text);
  opacity: 0.8;
}

.bid-color {
  color: #10b981;
  font-weight: 600;
}

.ask-color {
  color: #ef4444;
  font-weight: 600;
}

.tabs-and-search {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.tabs {
  display: flex;
  gap: 0.3rem;
}

.tab-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  color: var(--color-text);
  cursor: pointer;
}

.tab-btn.active {
  background-color: hsla(160, 100%, 37%, 1);
  color: #ffffff;
  border-color: hsla(160, 100%, 37%, 1);
}

.search-input {
  width: 100%;
  padding: 0.45rem 0.75rem;
  font-size: 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  color: var(--color-text);
  outline: none;
}

.assets-scroll-list {
  max-height: 220px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.asset-row-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.asset-row-item:hover {
  background-color: var(--color-background);
  border-color: var(--color-border);
}

.asset-row-item.is-active {
  background-color: var(--color-background);
  border-color: hsla(160, 100%, 37%, 1);
}

.row-left {
  display: flex;
  flex-direction: column;
}

.row-symbol {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--color-heading);
}

.row-name {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.7;
}

.row-right {
  text-align: right;
  display: flex;
  flex-direction: column;
}

.row-price {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--color-heading);
}

.row-change {
  font-size: 0.7rem;
  font-weight: 600;
}

.text-up {
  color: #10b981;
}

.text-down {
  color: #ef4444;
}
</style>
