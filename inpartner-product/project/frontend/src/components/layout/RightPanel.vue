<template>
  <aside class="flex flex-col gap-5 px-5 py-7">
    <!-- Profile / auth card -->
    <div class="card px-4 py-3 flex items-center gap-3" ref="menuRef">
      <template v-if="auth.isAuthenticated">
        <router-link to="/library" class="relative p-2 rounded-full text-brand-600 hover:bg-brand-50 transition-colors" title="Library">
          <Icon name="bell" size="sm" />
          <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-leaf-500 ring-2 ring-white"></span>
        </router-link>

        <div class="relative ml-auto">
          <button @click="menuOpen = !menuOpen" class="flex items-center gap-2.5 py-1 pl-1 pr-2 rounded-full hover:bg-slate-50 transition-colors">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white flex items-center justify-center text-xs font-bold ring-2 ring-brand-100">
              {{ initials(auth.user?.name) }}
            </div>
            <span class="text-[13px] font-semibold text-slate-800 max-w-[110px] truncate">{{ auth.user?.name }}</span>
            <Icon name="chevron-down" size="xs" :class="['text-leaf-600 transition-transform', menuOpen && 'rotate-180']" :stroke="2.4" />
          </button>

          <transition name="page">
            <div v-if="menuOpen" class="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-card py-2 z-50">
              <div class="px-4 py-2 border-b border-slate-100">
                <p class="text-[11px] text-slate-400">Masuk sebagai</p>
                <p class="text-xs font-semibold text-slate-800 truncate">{{ auth.user?.email }}</p>
              </div>
              <router-link v-if="auth.isAdmin" to="/admin" class="menu-item text-brand-600 font-semibold" @click="menuOpen = false">
                <Icon name="bolt" size="sm" /> Admin Portal
              </router-link>
              <router-link to="/profile" class="menu-item" @click="menuOpen = false"><Icon name="user" size="sm" /> Profil Saya</router-link>
              <router-link to="/library" class="menu-item" @click="menuOpen = false"><Icon name="library" size="sm" /> Library Saya</router-link>
              <button @click="logout" class="menu-item w-full text-rose-600 border-t border-slate-100 mt-1"><Icon name="logout" size="sm" /> Keluar</button>
            </div>
          </transition>
        </div>
      </template>

      <template v-else>
        <div class="flex-1">
          <p class="text-[11px] text-slate-400">Selamat datang 👋</p>
          <p class="text-[13px] font-semibold text-slate-800">Tamu</p>
        </div>
        <router-link to="/login" class="btn btn-outline btn-sm">Masuk</router-link>
        <router-link to="/register" class="btn btn-primary btn-sm">Daftar</router-link>
      </template>
    </div>

    <!-- Cart box (replaces "Subscribe to our blog") -->
    <router-link
      to="/cart"
      class="group flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-brand-200 bg-white hover:border-brand-400 hover:shadow-lift transition-all"
    >
      <div class="flex-1">
        <p class="text-[13px] font-semibold text-slate-800">Keranjang Belanja</p>
        <p class="text-[11px] text-slate-400 mt-0.5">
          <template v-if="cart.summary.count">{{ cart.summary.count }} item · {{ formatRupiah(cart.summary.total) }}</template>
          <template v-else>Belum ada item</template>
        </p>
      </div>
      <div class="relative w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/30 group-hover:scale-105 transition-transform">
        <Icon name="cart" size="md" />
        <span v-if="cart.summary.count" class="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-leaf-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
          {{ cart.summary.count }}
        </span>
      </div>
    </router-link>

    <!-- Community banner -->
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 px-6 py-8 text-center shadow-lift">
      <svg class="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 40 C 80 10, 160 70, 300 30 L300 0 L0 0 Z" fill="white" />
        <path d="M0 200 C 90 150, 180 210, 300 160 L300 200 Z" fill="white" />
      </svg>
      <div class="relative">
        <p class="text-white font-semibold text-[15px] leading-snug">
          Buka akses ke<br />
          <span class="text-xl font-bold">{{ productLabel }} Konten</span><br />
          riset & artikel premium
        </p>
        <router-link
          :to="auth.isAuthenticated ? '/products' : '/register'"
          class="btn btn-leaf mt-5 px-7"
        >
          {{ auth.isAuthenticated ? 'Jelajahi Katalog' : 'Gabung Sekarang' }}
        </router-link>
      </div>
    </div>

    <!-- Latest items (replaces "Next Books") -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="section-title text-base">Terbaru</h3>
        <router-link to="/products?sort=newest" class="link-more text-xs">Lihat semua</router-link>
      </div>

      <div v-if="catalog.loading && !catalog.latest.length" class="space-y-3">
        <div v-for="n in 3" :key="n" class="h-[72px] rounded-2xl bg-white animate-pulse"></div>
      </div>

      <div v-else class="space-y-3">
        <router-link
          v-for="item in catalog.latest.slice(0, 4)"
          :key="item.id"
          :to="`/products/${item.slug}`"
          class="card card-hover group flex items-center gap-3 p-2.5 pr-4"
        >
          <div class="w-11 h-14 shrink-0 shadow-md rounded-md overflow-hidden">
            <BookCover :product="item" compact rounded="rounded-md" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-slate-800 line-clamp-1 group-hover:text-brand-600 transition-colors">{{ item.title }}</p>
            <p class="text-[11px] text-slate-400 truncate mt-0.5">{{ item.author?.name || item.category?.name || 'Inpartner' }}</p>
          </div>
          <span class="text-[11px] font-medium text-slate-400 whitespace-nowrap">{{ timeAgo(item.published_at) }}</span>
        </router-link>
        <p v-if="!catalog.latest.length" class="text-xs text-slate-400 text-center py-4">Belum ada publikasi.</p>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../Icon.vue'
import BookCover from '../BookCover.vue'
import { useAuthStore } from '../../stores/auth'
import { useCartStore } from '../../stores/cart'
import { useCatalogStore } from '../../stores/catalog'
import { formatRupiah, initials, timeAgo } from '../../utils/format'

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const catalog = useCatalogStore()

const menuOpen = ref(false)
const menuRef = ref(null)

const productLabel = computed(() => {
  const n = catalog.stats.products || 0
  return n >= 10 ? `${Math.floor(n / 10) * 10}+` : `${n}`
})

const logout = async () => {
  menuOpen.value = false
  await auth.logout()
  cart.items = []
  cart.summary = { count: 0, subtotal: 0, discount: 0, total: 0 }
  router.push({ name: 'Home' })
}

const onClickOutside = (e) => {
  if (menuRef.value && !menuRef.value.contains(e.target)) menuOpen.value = false
}

onMounted(() => {
  catalog.fetchHome()
  document.addEventListener('click', onClickOutside)
})
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.menu-item {
  @apply flex items-center gap-2.5 px-4 py-2 text-[13px] text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-colors text-left;
}
</style>
