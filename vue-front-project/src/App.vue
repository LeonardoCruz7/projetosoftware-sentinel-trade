<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useTradeStore } from './stores/trade'

const authStore = useAuthStore()
const tradeStore = useTradeStore()
const router = useRouter()

const handleLogout = () => {
  tradeStore.stopMarketFeed()
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-layout">
    <header class="top-navbar">
      <!-- Marca / Logo -->
      <div class="brand-container">
        <router-link to="/" class="brand-link">
          <div class="brand-icon">ST</div>
          <div class="brand-text">
            <span class="brand-title">SentinelTrade</span>
            <span class="brand-subtitle">Orion Capital</span>
          </div>
        </router-link>
      </div>

      <!-- Links de Navegação -->
      <nav class="nav-links">
        <RouterLink to="/" class="nav-item">Trade / Home Broker</RouterLink>
        <RouterLink to="/about" class="nav-item">Sobre o Projeto</RouterLink>
      </nav>

      <!-- Ações do Usuário / Autenticação -->
      <div class="user-actions">
        <!-- Não Autenticado -->
        <RouterLink v-if="!authStore.isAuthenticated" to="/login" class="btn-login-nav">
          Acessar Conta (MFA)
        </RouterLink>

        <!-- Autenticado -->
        <div v-else class="logged-profile">
          <!-- Saldo Rápido -->
          <div class="nav-balance">
            <span class="balance-label">Disponível:</span>
            <strong class="balance-val">
              R$ {{ tradeStore.account.cashBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
            </strong>
          </div>

          <!-- Status do Usuário -->
          <div class="user-chip">
            <span class="user-avatar">👤</span>
            <span class="user-name">{{ authStore.user?.name }}</span>
          </div>

          <!-- Botão Sair -->
          <button @click="handleLogout" class="btn-logout" title="Encerrar sessão de forma segura">
            Sair
          </button>
        </div>
      </div>
    </header>

    <!-- Conteúdo Dinâmico das Telas -->
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
}

.top-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.brand-container {
  display: flex;
  align-items: center;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
}

.brand-icon {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  color: #ffffff;
  font-weight: 800;
  font-size: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--color-heading);
  letter-spacing: -0.02em;
}

.brand-subtitle {
  font-size: 0.7rem;
  font-weight: 600;
  color: hsla(160, 100%, 37%, 1);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-item {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  transition: all 0.2s;
}

.nav-item:hover {
  background-color: var(--color-background);
  color: var(--color-heading);
}

.nav-item.router-link-exact-active {
  background-color: var(--color-background);
  color: hsla(160, 100%, 37%, 1);
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-login-nav {
  padding: 0.5rem 1rem;
  background-color: hsla(160, 100%, 37%, 1);
  color: #ffffff;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.2s;
}

.btn-login-nav:hover {
  opacity: 0.9;
}

.logged-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-balance {
  display: flex;
  flex-direction: column;
  text-align: right;
  padding-right: 0.75rem;
  border-right: 1px solid var(--color-border);
}

.balance-label {
  font-size: 0.65rem;
  color: var(--color-text);
  opacity: 0.7;
  text-transform: uppercase;
}

.balance-val {
  font-size: 0.95rem;
  color: #10b981;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background-color: var(--color-background);
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  border: 1px solid var(--color-border);
}

.user-avatar {
  font-size: 0.9rem;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-heading);
}

.btn-logout {
  background: none;
  border: 1px solid var(--color-border);
  color: #ef4444;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}

.main-content {
  flex: 1;
  width: 100%;
}
</style>
