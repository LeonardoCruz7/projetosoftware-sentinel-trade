import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface User {
  id: string
  name: string
  email: string
  role: 'investor' | 'admin' | 'operator'
}

export interface LoginCredentials {
  email: string
  password: string
  mfaCode?: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const user = ref<User | null>(
    localStorage.getItem('auth_user')
      ? JSON.parse(localStorage.getItem('auth_user') as string)
      : null,
  )
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  /**
   * Realiza login no SentinelTrade.
   * Atualmente simula a validação e o RNF-01 (MFA).
   * Pode ser facilmente substituído pela chamada HTTP à API backend.
   */
  async function login(credentials: LoginCredentials): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      // Simulação de delay de rede / verificação de segurança
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Validação básica
      if (!credentials.email || !credentials.password) {
        throw new Error('E-mail e senha são obrigatórios.')
      }

      // Se informou MFA, valida se possui 6 dígitos
      if (credentials.mfaCode && credentials.mfaCode.trim().length !== 6) {
        throw new Error('O código MFA deve ter exatamente 6 dígitos.')
      }

      // Mock de usuário autenticado
      const mockUser: User = {
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        name: credentials.email.split('@')[0] ?? 'Investidor Orion',
        email: credentials.email,
        role: 'investor',
      }

      const mockToken = 'jwt_sentinel_' + btoa(credentials.email + ':' + Date.now())

      // Persistência local
      token.value = mockToken
      user.value = mockUser
      localStorage.setItem('auth_token', mockToken)
      localStorage.setItem('auth_user', JSON.stringify(mockUser))

      return true
    } catch (err: any) {
      error.value = err.message || 'Erro ao realizar login. Tente novamente.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    error.value = null
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  return {
    token,
    user,
    isLoading,
    error,
    isAuthenticated,
    login,
    logout,
  }
})
