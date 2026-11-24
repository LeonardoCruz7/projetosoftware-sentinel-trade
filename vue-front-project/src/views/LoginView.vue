<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const mfaCode = ref('')
const showPassword = ref(false)
const rememberMe = ref(false)
const localError = ref('')

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const handleForgotPassword = () => {
  localError.value = 'Redefinição de senha em desenvolvimento para a Orion Capital.'
}

// Preenche dados simulados para facilitar demonstração acadêmica
const fillDemoData = () => {
  email.value = 'investidor@orioncapital.com'
  password.value = 'Sentinel@2026'
  mfaCode.value = '123456'
  localError.value = ''
}

const handleSubmit = async () => {
  localError.value = ''

  if (!email.value || !password.value) {
    localError.value = 'Por favor, preencha o e-mail e a senha.'
    return
  }

  const success = await authStore.login({
    email: email.value,
    password: password.value,
    mfaCode: mfaCode.value || undefined,
  })

  if (success) {
    // Redireciona para onde o usuário tentava ir, ou para a Home
    const redirectPath = (route.query.redirect as string) || '/'
    router.push(redirectPath)
  }
}
</script>

<template>
  <main class="login-wrapper">
    <div class="login-card">
      <!-- Cabeçalho do Card -->
      <header class="card-header">
        <div class="brand-badge">
          <span class="pulse-indicator"></span>
          SentinelTrade
        </div>
        <h1 class="title">Acesso Orion Capital</h1>
        <p class="subtitle">Plataforma de Operações & Risco de Ativos</p>
      </header>

      <!-- Mensagens de Alerta / Erro -->
      <div v-if="localError || authStore.error" class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>{{ localError || authStore.error }}</span>
      </div>

      <!-- Formulário de Login -->
      <form @submit.prevent="handleSubmit" class="form-content">
        <!-- Campo: E-mail -->
        <div class="form-field">
          <label for="email">E-mail do Investidor</label>
          <div class="input-wrapper">
            <svg class="field-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="investidor@orioncapital.com"
              required
              autocomplete="email"
            />
          </div>
        </div>

        <!-- Campo: Senha -->
        <div class="form-field">
          <div class="field-label-row">
            <label for="password">Senha de Acesso</label>
            <a href="#" class="forgot-link" @click.prevent="handleForgotPassword">Esqueceu?</a>
          </div>
          <div class="input-wrapper">
            <svg class="field-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••••••"
              required
              autocomplete="current-password"
            />
            <button
              type="button"
              class="password-toggle"
              @click="togglePasswordVisibility"
              :title="showPassword ? 'Ocultar senha' : 'Ver senha'"
            >
              {{ showPassword ? '👁️' : '🔒' }}
            </button>
          </div>
        </div>

        <!-- Campo: Código MFA / 2FA (Requisito RNF-01) -->
        <div class="form-field">
          <div class="field-label-row">
            <label for="mfaCode">Código MFA / 2FA (Opcional)</label>
            <span class="badge-mfa">RNF-01</span>
          </div>
          <div class="input-wrapper">
            <svg class="field-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <input
              id="mfaCode"
              v-model="mfaCode"
              type="text"
              maxlength="6"
              placeholder="Ex: 123456"
              pattern="[0-9]*"
              inputmode="numeric"
            />
          </div>
          <small class="helper-text">Token gerado pelo aplicativo autenticador.</small>
        </div>

        <!-- Opção Lembrar -->
        <div class="remember-row">
          <label class="checkbox-label">
            <input type="checkbox" v-model="rememberMe" />
            <span>Manter conectado</span>
          </label>
        </div>

        <!-- Botão de Login -->
        <button
          type="submit"
          :disabled="authStore.isLoading"
          class="btn-primary"
        >
          <span v-if="authStore.isLoading" class="loader-content">
            <span class="spinner"></span>
            Autenticando...
          </span>
          <span v-else>Entrar no Sistema</span>
        </button>

        <!-- Botão de Atalho para Demonstração Acadêmica -->
        <div class="demo-box">
          <button type="button" class="btn-demo" @click="fillDemoData">
            ⚡ Preencher dados de teste
          </button>
        </div>
      </form>
    </div>
  </main>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 1.5rem 0;
}

.login-card {
  width: 100%;
  max-width: 440px;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 2.25rem 2rem;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.12);
  transition: all 0.3s ease;
}

.card-header {
  text-align: center;
  margin-bottom: 1.75rem;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background-color: hsla(160, 100%, 37%, 0.12);
  color: hsla(160, 100%, 37%, 1);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin-bottom: 0.75rem;
}

.pulse-indicator {
  width: 8px;
  height: 8px;
  background-color: hsla(160, 100%, 37%, 1);
  border-radius: 50%;
  box-shadow: 0 0 0 0 hsla(160, 100%, 37%, 0.7);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 hsla(160, 100%, 37%, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px hsla(160, 100%, 37%, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 hsla(160, 100%, 37%, 0);
  }
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 0.25rem;
}

.subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.75;
}

.alert {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
}

.alert-error {
  background-color: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-heading);
}

.badge-mfa {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  background-color: var(--color-background-mute);
  color: var(--color-text);
  border-radius: 4px;
}

.forgot-link {
  font-size: 0.8rem;
  color: hsla(160, 100%, 37%, 1);
  text-decoration: none;
}

.forgot-link:hover {
  text-decoration: underline;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.field-icon {
  position: absolute;
  left: 0.9rem;
  color: var(--color-text);
  opacity: 0.5;
  pointer-events: none;
}

.input-wrapper input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 2.6rem;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s ease;
}

.input-wrapper input:focus {
  border-color: hsla(160, 100%, 37%, 1);
  box-shadow: 0 0 0 3px hsla(160, 100%, 37%, 0.15);
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  opacity: 0.7;
  padding: 0.25rem;
  transition: opacity 0.2s;
}

.password-toggle:hover {
  opacity: 1;
}

.helper-text {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.65;
}

.remember-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text);
  cursor: pointer;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.85rem 1.25rem;
  border-radius: 8px;
  border: none;
  background-color: hsla(160, 100%, 37%, 1);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loader-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.spinner {
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

.demo-box {
  margin-top: 0.5rem;
  text-align: center;
}

.btn-demo {
  background: none;
  border: 1px dashed var(--color-border);
  color: var(--color-text);
  font-size: 0.8rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0.8;
  transition: all 0.2s ease;
}

.btn-demo:hover {
  opacity: 1;
  border-color: hsla(160, 100%, 37%, 1);
  color: hsla(160, 100%, 37%, 1);
}
</style>
