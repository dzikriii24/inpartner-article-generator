<template>
  <aside class="h-full flex flex-col px-5 py-7">
    <!-- Brand -->
    <router-link to="/" class="flex flex-col items-center gap-1.5 group mb-10" @click="$emit('navigate')">
      <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg shadow-brand-600/30 group-hover:scale-105 group-hover:rotate-3 transition-transform">
        <Icon name="book-open" size="md" :stroke="2" />
      </div>
      <span class="text-[13px] font-bold text-slate-800 tracking-tight">
        Inpartner<span class="text-brand-600">Store</span>
      </span>
    </router-link>

    <!-- Main navigation -->
    <nav class="flex flex-col gap-1.5">
      <router-link
        v-for="item in visibleItems"
        :key="item.to"
        :to="item.to"
        @click="$emit('navigate')"
        :class="[
          'relative flex items-center gap-3 px-4 py-2.5 rounded-full text-[13px] font-medium transition-all duration-200',
          isActive(item)
            ? 'bg-leaf-500 text-white shadow-lg shadow-leaf-500/30'
            : 'text-slate-400 hover:text-brand-700 hover:bg-brand-50'
        ]"
      >
        <span
          :class="[
            'flex items-center justify-center w-7 h-7 rounded-full transition-colors',
            isActive(item) ? 'bg-white text-leaf-600' : ''
          ]"
        >
          <Icon :name="item.icon" size="sm" :stroke="isActive(item) ? 2.2 : 1.8" />
        </span>
        <span class="flex-1">{{ item.label }}</span>
        <span
          v-if="item.badge"
          :class="['text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center', isActive(item) ? 'bg-white text-leaf-600' : 'bg-brand-600 text-white']"
        >
          {{ item.badge }}
        </span>
      </router-link>

      <div class="my-3 border-t border-dashed border-slate-200"></div>

      <router-link
        v-if="auth.isAdmin"
        to="/admin"
        @click="$emit('navigate')"
        class="flex items-center gap-3 px-4 py-2.5 rounded-full text-[13px] font-medium text-brand-600 hover:bg-brand-50 transition-colors"
      >
        <span class="flex items-center justify-center w-7 h-7"><Icon name="bolt" size="sm" /></span>
        Admin Portal
      </router-link>

      <button
        v-if="auth.isAuthenticated"
        @click="logout"
        class="flex items-center gap-3 px-4 py-2.5 rounded-full text-[13px] font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors text-left"
      >
        <span class="flex items-center justify-center w-7 h-7"><Icon name="logout" size="sm" /></span>
        Keluar
      </button>
      <router-link
        v-else
        to="/login"
        @click="$emit('navigate')"
        class="flex items-center gap-3 px-4 py-2.5 rounded-full text-[13px] font-medium text-slate-400 hover:text-brand-700 hover:bg-brand-50 transition-colors"
      >
        <span class="flex items-center justify-center w-7 h-7"><Icon name="login" size="sm" /></span>
        Masuk
      </router-link>
    </nav>

    <!-- Illustration -->
    <div class="mt-auto pt-8 hidden lg:block">
      <img :src="illustration" alt="" class="w-full max-w-[150px] mx-auto animate-float select-none pointer-events-none" />
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../Icon.vue'
import illustration from '../../assets/sidebar-reader.png'
import { useAuthStore } from '../../stores/auth'
import { useCartStore } from '../../stores/cart'

defineEmits(['navigate'])

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()

const items = computed(() => [
  { to: '/', label: 'Beranda', icon: 'home', exact: true },
  { to: '/products', label: 'Katalog', icon: 'grid' },
  { to: '/cart', label: 'Keranjang', icon: 'cart', badge: cart.summary.count || null, auth: true },
  { to: '/library', label: 'Library Saya', icon: 'library', auth: true },
  { to: '/profile', label: 'Pengaturan', icon: 'settings', auth: true }
])

const visibleItems = computed(() => items.value.filter(i => !i.auth || auth.isAuthenticated))

const isActive = (item) => item.exact ? route.path === item.to : route.path.startsWith(item.to)

const logout = async () => {
  await auth.logout()
  cart.items = []
  cart.summary = { count: 0, subtotal: 0, discount: 0, total: 0 }
  router.push({ name: 'Home' })
}
</script>
