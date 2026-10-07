import { defineStore } from 'pinia'
import api from '../services/api'
import { useAuthStore } from './auth'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    summary: { count: 0, subtotal: 0, discount: 0, total: 0 },
    loading: false
  }),

  actions: {
    async fetchCart() {
      const auth = useAuthStore()
      if (!auth.isAuthenticated) {
        this.items = []
        this.summary = { count: 0, subtotal: 0, discount: 0, total: 0 }
        return
      }
      this.loading = true
      try {
        const res = await api.get('/cart')
        this.items = res.data.items || []
        this.summary = res.data.summary || { count: 0, subtotal: 0, discount: 0, total: 0 }
      } catch (err) {
        console.error('Fetch cart error:', err)
      } finally {
        this.loading = false
      }
    },

    async addToCart(productId) {
      const res = await api.post('/cart', { product_id: productId })
      await this.fetchCart()
      return res.data
    },

    async removeFromCart(productId) {
      await api.delete(`/cart/${productId}`)
      await this.fetchCart()
    },

    async clearCart() {
      await api.delete('/cart')
      this.items = []
      this.summary = { count: 0, subtotal: 0, discount: 0, total: 0 }
    }
  }
})
