<template>
  <div class="min-h-screen bg-slate-50 flex text-slate-800 font-sans">
    
    <!-- Sidebar Navigation -->
    <aside class="w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 z-30 shadow-sm">
      <!-- Admin Header Brand -->
      <div class="h-16 px-6 flex items-center justify-between border-b border-slate-100">
        <router-link to="/admin" class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
            <Icon name="bolt" size="sm" />
          </div>
          <span class="font-bold text-slate-800 text-base">Inpartner<span class="text-brand-600">Admin</span></span>
        </router-link>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto text-sm font-medium">
        <router-link to="/admin" exact-active-class="bg-brand-50 text-brand-700 font-bold" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
          <Icon name="chart" size="sm" /> Dashboard
        </router-link>

        <div class="pt-4 pb-1 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Katalog & Produk</div>

        <router-link to="/admin/products" active-class="bg-brand-50 text-brand-700 font-bold" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
          <Icon name="document" size="sm" /> Produk & Artikel
        </router-link>
        <router-link to="/admin/categories" active-class="bg-brand-50 text-brand-700 font-bold" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
          <Icon name="tag" size="sm" /> Kategori
        </router-link>
        <router-link to="/admin/authors" active-class="bg-brand-50 text-brand-700 font-bold" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
          <Icon name="user" size="sm" /> Penulis / Author
        </router-link>
        <router-link to="/admin/banners" active-class="bg-brand-50 text-brand-700 font-bold" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
          <Icon name="image" size="sm" /> Hero Banners
        </router-link>

        <div class="pt-4 pb-1 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Penjualan & User</div>

        <router-link to="/admin/orders" active-class="bg-brand-50 text-brand-700 font-bold" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
          <Icon name="cart" size="sm" /> Transaksi & Order
        </router-link>
        <router-link to="/admin/users" active-class="bg-brand-50 text-brand-700 font-bold" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
          <Icon name="users" size="sm" /> Pelanggan & User
        </router-link>

        <div class="pt-4 pb-1 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Integrasi System</div>

        <router-link to="/admin/integration" active-class="bg-brand-50 text-brand-700 font-bold" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
          <Icon name="server" size="sm" /> Article Generator
        </router-link>
      </nav>

      <!-- Sidebar Bottom -->
      <div class="p-4 border-t border-slate-100">
        <router-link to="/" class="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-200">
          <Icon name="chevron-right" class="rotate-180" size="xs" /> Ke Storefront
        </router-link>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="pl-64 flex-1 flex flex-col min-w-0">
      
      <!-- Admin Top Navbar -->
      <header class="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
        <div class="text-sm font-bold text-slate-600">
          Admin Portal &bull; <span class="text-brand-600">{{ currentTitle }}</span>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-xs font-medium text-slate-500">
            Halo, <strong class="text-slate-800">{{ auth.user?.name }}</strong>
          </div>
          <button @click="logout" class="text-xs font-bold text-rose-500 hover:text-rose-600 hover:underline">Keluar</button>
        </div>
      </header>

      <!-- Page Component Viewport -->
      <main class="flex-1 p-8 overflow-y-auto">
        <router-view />
      </main>

    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import Icon from '../Icon.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const currentTitle = computed(() => {
  const name = route.name || ''
  if (name.includes('Dashboard')) return 'Dashboard Overview'
  if (name.includes('Product')) return 'Manajemen Produk & Artikel'
  if (name.includes('Categories')) return 'Manajemen Kategori'
  if (name.includes('Authors')) return 'Manajemen Penulis'
  if (name.includes('Banners')) return 'Manajemen Banner CMS'
  if (name.includes('Orders')) return 'Manajemen Transaksi Order'
  if (name.includes('Users')) return 'Manajemen User & Akses'
  if (name.includes('Integration')) return 'Integrasi Article Generator'
  return 'Dashboard'
})

const logout = async () => {
  await auth.logout()
  router.push({ name: 'Home' })
}
</script>
