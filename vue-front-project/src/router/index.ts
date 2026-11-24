import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'trade',
      component: () => import('../views/TradeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guestOnly: true },
    },
  ],
})

// Guarda de navegação global
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token')
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const guestOnly = to.matched.some((record) => record.meta.guestOnly)

  if (requiresAuth && !token) {
    // Redireciona para o login e preserva a rota de destino
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (guestOnly && token) {
    // Se já estiver logado, não precisa acessar a página de login
    next({ name: 'trade' })
  } else {
    next()
  }
})

export default router
