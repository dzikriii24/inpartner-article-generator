<template>
  <nav class="sticky top-0 z-50 bg-[#0d1117]/90 backdrop-blur-md border-b border-white/10 transition-all">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
      
      <!-- Brand Logo -->
      <router-link to="/" class="flex items-center gap-3 group">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#e5a93b] to-[#b87c14] flex items-center justify-center text-slate-950 font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">
          I
        </div>
        <div class="flex flex-col">
          <span class="font-bold text-lg text-white leading-tight tracking-tight">Inpartner<span class="text-[#e5a93b]">Store</span></span>
          <span class="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Digital Knowledge Store</span>
        </div>
      </router-link>

      <!-- Nav Links -->
      <div class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
        <router-link to="/" class="hover:text-white transition-colors" active-class="text-[#e5a93b] font-semibold">Beranda</router-link>
        <router-link to="/products" class="hover:text-white transition-colors" active-class="text-[#e5a93b] font-semibold">Katalog Produk</router-link>
        <router-link v-if="auth.isAuthenticated" to="/library" class="hover:text-white transition-colors flex items-center gap-1.5" active-class="text-[#e5a93b] font-semibold">
          <svg class="w-4 h-4 text-[#e5a93b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          Library Saya
        </router-link>
      </div>

      <!-- Quick Search Bar -->
      <div class="hidden lg:flex flex-1 max-w-md mx-4 relative">
        <input 
          v-model="searchQuery" 
          @keyup.enter="handleSearch"
          type="text" 
          placeholder="Cari artikel, ebook, jurnal, riset..." 
          class="w-full bg-[#161b22] text-sm text-white placeholder-slate-500 rounded-full py-2 pl-10 pr-4 border border-white/10 focus:outline-none focus:border-[#e5a93b] focus:ring-1 focus:ring-[#e5a93b]"
        />
        <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>

      <!-- Right Actions -->
      <div class="flex items-center gap-3">
        <!-- Cart Icon -->
        <router-link to="/cart" class="relative p-2 text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
          <span v-if="cart.summary.count > 0" class="absolute -top-1 -right-1 bg-[#e5a93b] text-slate-950 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
            {{ cart.summary.count }}
          </span>
        </router-link>

        <!-- User Menu / Auth Buttons -->
        <template v-if="auth.isAuthenticated">
          <div class="relative group">
            <button class="flex items-center gap-2 p-1.5 rounded-lg border border-white/10 hover:bg-slate-800 transition-colors">
              <div class="w-7 h-7 rounded-full bg-slate-700 text-amber-400 flex items-center justify-center font-bold text-xs">
                {{ auth.user.name.charAt(0).toUpperCase() }}
              </div>
              <span class="text-sm text-slate-200 font-medium hidden sm:inline max-w-[100px] truncate">{{ auth.user.name }}</span>
            </button>
            
            <div class="absolute right-0 mt-2 w-48 bg-[#161b22] border border-white/10 rounded-xl shadow-2xl py-2 hidden group-hover:block hover:block">
              <div class="px-4 py-2 border-b border-white/10">
                <p class="text-xs text-slate-400">Signed in as</p>
                <p class="text-sm font-semibold text-white truncate">{{ auth.user.email }}</p>
              </div>
              <router-link v-if="auth.isAdmin" to="/admin" class="block px-4 py-2 text-sm text-amber-400 hover:bg-slate-800 font-semibold">
                ⚡ Admin Portal
              </router-link>
              <router-link to="/profile" class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Profil Saya</router-link>
              <router-link to="/library" class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Library Saya</router-link>
              <button @click="logout" class="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-slate-800 border-t border-white/10 mt-1">
                Keluar
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <router-link to="/login" class="btn btn-outline btn-sm">Masuk</router-link>
          <router-link to="/register" class="btn btn-primary btn-sm hidden sm:inline-flex">Daftar</router-link>
        </template>
      </div>

    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const searchQuery = ref('')

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ name: 'Products', query: { q: searchQuery.value.trim() } })
  }
}

const logout = async () => {
  await auth.logout()
  cart.items = []
  router.push({ name: 'Home' })
}

onMounted(() => {
  if (auth.isAuthenticated) {
    cart.fetchCart()
  }
})
</script>
