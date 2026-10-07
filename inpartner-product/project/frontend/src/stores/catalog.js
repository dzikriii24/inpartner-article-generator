import { defineStore } from 'pinia'
import api from '../services/api'

/**
 * Shared cache for the `/home` payload so the Home view and the right-hand
 * panel (latest items, stats) don't fire duplicate requests.
 */
export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    banners: [],
    featured: [],
    latest: [],
    popular: [],
    categories: [],
    authors: [],
    stats: {},
    loaded: false,
    loading: false
  }),

  actions: {
    async fetchHome(force = false) {
      if ((this.loaded && !force) || this.loading) return
      this.loading = true
      try {
        const { data } = await api.get('/home')
        this.banners = data.banners || []
        this.featured = data.featured || []
        this.latest = data.latest || []
        this.popular = data.popular || []
        this.categories = data.categories || []
        this.authors = data.authors || []
        this.stats = data.stats || {}
        this.loaded = true
      } catch (err) {
        console.error('Fetch home error:', err)
      } finally {
        this.loading = false
      }
    }
  }
})
