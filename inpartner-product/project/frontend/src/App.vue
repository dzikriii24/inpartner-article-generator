<template>
  <template v-if="ready">
    <!-- Admin portal has its own shell -->
    <router-view v-if="layout === 'admin' || layout === 'bare'" />

    <AuthLayout v-else-if="layout === 'auth'">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </AuthLayout>

    <StoreLayout v-else>
      <router-view v-slot="{ Component, route: r }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="r.path" />
        </transition>
      </router-view>
    </StoreLayout>
  </template>

  <Toast />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StoreLayout from './components/layout/StoreLayout.vue'
import AuthLayout from './components/layout/AuthLayout.vue'
import Toast from './components/Toast.vue'
import { useAuthStore } from './stores/auth'
import { useCartStore } from './stores/cart'
import { useCatalogStore } from './stores/catalog'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const catalog = useCatalogStore()

const ready = ref(false)
router.isReady().then(() => { ready.value = true })

const layout = computed(() => {
  if (route.path.startsWith('/admin')) return 'admin'
  return route.meta.layout || 'store'
})

// Keep cart + ownership flags in sync with the session
watch(() => auth.isAuthenticated, (isAuth, wasAuth) => {
  if (isAuth) cart.fetchCart()
  if (wasAuth !== undefined) catalog.fetchHome(true)
}, { immediate: true })
</script>
