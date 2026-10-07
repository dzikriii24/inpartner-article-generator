<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-brand-600 selection:text-white">
    
    <!-- Top Announcement Bar -->
    <div class="bg-gradient-to-r from-brand-600 via-indigo-600 to-blue-700 text-white text-[12px] font-semibold py-2 px-4 text-center tracking-wide flex items-center justify-center gap-2 shadow-inner">
      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] uppercase font-extrabold tracking-wider">
        <Icon name="sparkles" size="xs" /> E-COMMERCE PLATFORM
      </span>
      <span>Akses ratusan artikel riset, ebook & jurnal digital terpercaya — Beli sekali, baca selamanya di Library.</span>
    </div>

    <!-- Main Navigation Header -->
    <header class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        <!-- Left: Mobile Menu Toggle & Brand Logo -->
        <div class="flex items-center gap-3">
          <button 
            @click="drawerOpen = true" 
            class="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Buka Menu"
          >
            <Icon name="menu" size="md" />
          </button>

          <router-link to="/" class="flex items-center gap-2.5 group">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-brand-500/25 group-hover:scale-105 transition-transform">
              <Icon name="book-open" size="md" :stroke="2.2" />
            </div>
            <div class="flex flex-col">
              <span class="font-extrabold text-lg text-slate-900 leading-tight tracking-tight">
                Inpartner<span class="text-brand-600">Store</span>
              </span>
              <span class="text-[10px] text-slate-400 font-semibold tracking-wider uppercase -mt-0.5">
                Digital Knowledge Platform
              </span>
            </div>
          </router-link>
        </div>

        <!-- Center Nav Links (Desktop) -->
        <nav class="hidden lg:flex items-center gap-1 text-xs font-bold text-slate-600">
          <router-link 
            to="/" 
            class="px-3.5 py-2 rounded-xl hover:text-brand-600 hover:bg-brand-50/80 transition-all"
            active-class="!text-brand-600 !bg-brand-50 shadow-sm"
            exact
          >
            Beranda
          </router-link>
          
          <router-link 
            to="/products" 
            class="px-3.5 py-2 rounded-xl hover:text-brand-600 hover:bg-brand-50/80 transition-all"
            active-class="!text-brand-600 !bg-brand-50 shadow-sm"
          >
            Katalog Produk
          </router-link>
          
          <router-link 
            v-if="auth.isAuthenticated" 
            to="/library" 
            class="px-3.5 py-2 rounded-xl hover:text-brand-600 hover:bg-brand-50/80 transition-all flex items-center gap-1.5"
            active-class="!text-brand-600 !bg-brand-50 shadow-sm"
          >
            <Icon name="library" size="xs" class="text-brand-500" />
            Library Saya
          </router-link>

          <router-link 
            v-if="auth.isAdmin" 
            to="/admin" 
            class="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100 transition-all flex items-center gap-1 text-[11px]"
          >
            <Icon name="bolt" size="xs" /> Admin Portal
          </router-link>
        </nav>

        <!-- Search Bar (Desktop) -->
        <form @submit.prevent="submitSearch" class="hidden md:flex flex-1 max-w-sm relative">
          <input
            id="global-search"
            v-model="search"
            type="search"
            placeholder="Cari artikel, ebook, riset..."
            class="w-full h-10 pl-9 pr-8 rounded-full bg-slate-100/80 border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-400 focus:ring-4 focus:ring-brand-100 transition-all"
          />
          <Icon name="search" size="xs" class="absolute left-3 top-3 text-slate-400" />
          <button v-if="search" type="button" @click="search = ''" class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
            <Icon name="x" size="xs" />
          </button>
        </form>

        <!-- Right Actions (Cart & Auth Profile) -->
        <div class="flex items-center gap-3">
          
          <!-- Cart Icon button -->
          <router-link 
            to="/cart" 
            class="relative p-2.5 rounded-xl bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-700 transition-all" 
            aria-label="Keranjang"
          >
            <Icon name="cart" size="sm" />
            <span 
              v-if="cart.summary.count" 
              class="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-leaf-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white animate-pulse shadow-sm"
            >
              {{ cart.summary.count }}
            </span>
          </router-link>

          <!-- User Menu Dropdown (Logged In) -->
          <template v-if="auth.isAuthenticated">
            <div class="relative" ref="menuRef">
              <button 
                @click="menuOpen = !menuOpen" 
                class="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-slate-50 transition-all"
              >
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-blue-700 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {{ initials(auth.user?.name) }}
                </div>
                <span class="hidden sm:inline text-xs font-bold text-slate-800 max-w-[110px] truncate">
                  {{ auth.user?.name }}
                </span>
                <Icon name="chevron-down" size="xs" :class="['text-slate-400 transition-transform', menuOpen && 'rotate-180']" />
              </button>

              <transition name="page">
                <div v-if="menuOpen" class="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-50">
                  <div class="px-4 py-2.5 border-b border-slate-100">
                    <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Masuk Sebagai</p>
                    <p class="text-xs font-bold text-slate-800 truncate mt-0.5">{{ auth.user?.email }}</p>
                  </div>
                  
                  <router-link v-if="auth.isAdmin" to="/admin" class="menu-item text-amber-700 font-semibold bg-amber-50/50" @click="menuOpen = false">
                    <Icon name="bolt" size="sm" /> Admin Portal
                  </router-link>
                  
                  <router-link to="/profile" class="menu-item" @click="menuOpen = false">
                    <Icon name="user" size="sm" /> Profil Saya
                  </router-link>
                  
                  <router-link to="/library" class="menu-item" @click="menuOpen = false">
                    <Icon name="library" size="sm" /> Library Saya
                  </router-link>
                  
                  <router-link to="/cart" class="menu-item" @click="menuOpen = false">
                    <Icon name="cart" size="sm" /> Keranjang Belanja
                  </router-link>
                  
                  <button @click="logout" class="menu-item w-full text-rose-600 border-t border-slate-100 mt-1">
                    <Icon name="logout" size="sm" /> Keluar
                  </button>
                </div>
              </transition>
            </div>
          </template>

          <!-- Auth Buttons (Logged Out) -->
          <template v-else>
            <router-link to="/login" class="btn btn-outline btn-sm font-bold">
              Masuk
            </router-link>
            <router-link to="/register" class="btn btn-primary btn-sm hidden sm:inline-flex font-bold">
              Daftar
            </router-link>
          </template>

        </div>
      </div>
    </header>

    <!-- Mobile Navigation Drawer -->
    <transition name="drawer">
      <div v-if="drawerOpen" class="fixed inset-0 z-[60] lg:hidden">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="drawerOpen = false"></div>
        <div class="drawer-panel absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl overflow-y-auto flex flex-col p-6">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">I</div>
              <span class="font-bold text-slate-900">Inpartner Store</span>
            </div>
            <button @click="drawerOpen = false" class="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
              <Icon name="x" size="sm" />
            </button>
          </div>

          <!-- Mobile Search -->
          <form @submit.prevent="submitSearch" class="mt-4 relative">
            <input
              v-model="search"
              type="search"
              placeholder="Cari artikel..."
              class="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-100 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Icon name="search" size="xs" class="absolute left-3 top-3 text-slate-400" />
          </form>

          <nav class="mt-6 flex flex-col gap-2 font-medium text-sm text-slate-700">
            <router-link to="/" class="p-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-3" @click="drawerOpen = false">
              <Icon name="home" size="sm" /> Beranda
            </router-link>
            <router-link to="/products" class="p-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-3" @click="drawerOpen = false">
              <Icon name="grid" size="sm" /> Katalog Produk
            </router-link>
            <router-link v-if="auth.isAuthenticated" to="/library" class="p-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-3" @click="drawerOpen = false">
              <Icon name="library" size="sm" /> Library Saya
            </router-link>
            <router-link to="/cart" class="p-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-3" @click="drawerOpen = false">
              <Icon name="cart" size="sm" /> Keranjang Belanja
              <span v-if="cart.summary.count" class="ml-auto badge badge-article">{{ cart.summary.count }}</span>
            </router-link>
            <router-link v-if="auth.isAdmin" to="/admin" class="p-2.5 rounded-xl bg-amber-50 text-amber-800 flex items-center gap-3 font-bold" @click="drawerOpen = false">
              <Icon name="bolt" size="sm" /> Admin Portal
            </router-link>
          </nav>

          <div class="mt-auto pt-6 border-t border-slate-100">
            <template v-if="auth.isAuthenticated">
              <p class="text-xs text-slate-400">Signed in as</p>
              <p class="text-xs font-bold text-slate-800 truncate mb-3">{{ auth.user?.email }}</p>
              <button @click="logout" class="btn btn-danger btn-sm w-full">Keluar</button>
            </template>
            <template v-else>
              <div class="grid grid-cols-2 gap-2">
                <router-link to="/login" class="btn btn-outline btn-sm text-center" @click="drawerOpen = false">Masuk</router-link>
                <router-link to="/register" class="btn btn-primary btn-sm text-center" @click="drawerOpen = false">Daftar</router-link>
              </div>
            </template>
          </div>
        </div>
      </div>
    </transition>

    <!-- Main Content Full-Width Shell Container -->
    <main class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <slot />
    </main>

    <!-- Modern Full Footer -->
    <Footer />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Footer from '../Footer.vue'
import Icon from '../Icon.vue'
import { useAuthStore } from '../../stores/auth'
import { useCartStore } from '../../stores/cart'
import { initials } from '../../utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()

const drawerOpen = ref(false)
const menuOpen = ref(false)
const menuRef = ref(null)
const search = ref(route.query.q || '')

watch(() => route.query.q, (q) => { search.value = q || '' })
watch(() => route.fullPath, () => { 
  drawerOpen.value = false 
  menuOpen.value = false
})

const submitSearch = () => {
  const q = search.value.trim()
  router.push({ name: 'Products', query: q ? { q } : {} })
}

const logout = async () => {
  menuOpen.value = false
  drawerOpen.value = false
  await auth.logout()
  cart.items = []
  cart.summary = { count: 0, subtotal: 0, discount: 0, total: 0 }
  router.push({ name: 'Home' })
}

const onClickOutside = (e) => {
  if (menuRef.value && !menuRef.value.contains(e.target)) menuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<style scoped>
.menu-item {
  @apply flex items-center gap-2.5 px-4 py-2 text-[13px] text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition-colors text-left;
}
.drawer-enter-active, .drawer-leave-active { transition: opacity 0.25s ease; }
.drawer-enter-active .drawer-panel, .drawer-leave-active .drawer-panel { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .drawer-panel, .drawer-leave-to .drawer-panel { transform: translateX(-100%); }
</style>
