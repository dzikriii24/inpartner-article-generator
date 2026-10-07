import { defineStore } from 'pinia'
import api from '../services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || null,
    loading: false,
    initialized: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    isAdmin: (state) => state.user?.role === 'admin' || state.user?.is_admin === true
  },

  actions: {
    async fetchMe() {
      if (!this.token) {
        this.initialized = true
        return null
      }
      try {
        const res = await api.get('/auth/me')
        this.user = res.data.user
        localStorage.setItem('user', JSON.stringify(res.data.user))
        return res.data.user
      } catch (err) {
        this.logout()
        return null
      } finally {
        this.initialized = true
      }
    },

    async login(email, password) {
      this.loading = true
      try {
        const res = await api.post('/auth/login', { email, password })
        this.token = res.data.token
        this.user = res.data.user
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        return res.data.user
      } finally {
        this.loading = false
      }
    },

    async register(name, email, password, password_confirmation, phone) {
      this.loading = true
      try {
        const res = await api.post('/auth/register', {
          name, email, password, password_confirmation, phone
        })
        this.token = res.data.token
        this.user = res.data.user
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        return res.data.user
      } finally {
        this.loading = false
      }
    },

    async logout() {
      if (this.token) {
        try {
          await api.post('/auth/logout')
        } catch (e) {}
      }
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }
})
