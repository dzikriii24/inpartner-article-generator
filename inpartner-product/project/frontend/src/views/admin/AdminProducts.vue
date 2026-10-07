<template>
  <div class="space-y-6">
    
    <!-- Top Action Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold text-white tracking-tight">Manajemen Katalog Produk & Artikel</h1>
        <p class="text-slate-400 text-xs mt-1">Kelola artikel, harga jual, status publikasi, dan file terlampir</p>
      </div>

      <router-link to="/admin/products/create" class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 hover:brightness-110 shadow-lg shadow-amber-500/20">
        <span>+</span> Tambah Produk Manual
      </router-link>
    </div>

    <!-- Filters & Search Bar -->
    <div class="glass p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center gap-4">
      <div class="relative flex-1 w-full">
        <input 
          v-model="search"
          @input="fetchProducts"
          type="text"
          placeholder="Cari judul artikel, slug, atau tag..."
          class="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
        />
      </div>

      <div class="flex items-center gap-2 w-full md:w-auto">
        <select v-model="selectedStatus" @change="fetchProducts" class="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500">
          <option value="">Semua Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <select v-model="selectedCategory" @change="fetchProducts" class="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500">
          <option value="">Semua Kategori</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-20 text-center">
      <div class="inline-block animate-spin text-amber-400 text-3xl mb-3">⚙</div>
      <p class="text-slate-400 text-xs">Memuat katalog produk...</p>
    </div>

    <!-- Products Table View -->
    <div v-else class="glass rounded-3xl border border-white/10 overflow-hidden">
      <table class="w-full text-left text-xs text-slate-300">
        <thead class="bg-slate-900/80 border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <tr>
            <th class="py-3.5 px-4">Artikel / Produk</th>
            <th class="py-3.5 px-4">Kategori & Tipe</th>
            <th class="py-3.5 px-4">Harga Jual</th>
            <th class="py-3.5 px-4">Status</th>
            <th class="py-3.5 px-4 text-center">Penjualan</th>
            <th class="py-3.5 px-4 text-right">Aksi</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-white/5">
          <tr v-if="products.length === 0">
            <td colspan="6" class="py-12 text-center text-slate-500">Tidak ada produk ditemukan.</td>
          </tr>

          <tr v-for="p in products" :key="p.id" class="hover:bg-white/[0.02] transition-colors">
            <!-- Product Title & Image -->
            <td class="py-3 px-4">
              <div class="flex items-center gap-3">
                <img 
                  :src="p.cover_url || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=200&q=80'" 
                  class="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                />
                <div class="min-w-0 max-w-xs sm:max-w-sm">
                  <div class="font-bold text-white truncate text-xs">{{ p.title }}</div>
                  <div class="text-[11px] text-slate-400 font-mono mt-0.5">
                    <span v-if="p.external_id" class="text-purple-400">🤖 Generator #{{ p.external_id }}</span>
                    <span v-else class="text-slate-400">Manual Entry</span>
                    &bull; {{ p.reading_time_minutes || 5 }} min read
                  </div>
                </div>
              </div>
            </td>

            <!-- Category & Type -->
            <td class="py-3 px-4">
              <div class="font-semibold text-white">{{ p.category?.name || '-' }}</div>
              <div class="text-[10px] text-slate-400 uppercase font-mono mt-0.5">{{ p.type || 'article' }}</div>
            </td>

            <!-- Price -->
            <td class="py-3 px-4 font-mono font-bold text-amber-400">
              <div v-if="p.sale_price" class="space-y-0.5">
                <div class="text-amber-400">{{ formatRupiah(p.sale_price) }}</div>
                <div class="text-[10px] text-slate-500 line-through">{{ formatRupiah(p.price) }}</div>
              </div>
              <div v-else>
                {{ formatRupiah(p.price) }}
              </div>
            </td>

            <!-- Status -->
            <td class="py-3 px-4">
              <span 
                :class="[
                  'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                  p.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                ]"
              >
                {{ p.status }}
              </span>
            </td>

            <!-- Sales Count -->
            <td class="py-3 px-4 text-center font-mono font-bold text-white">
              {{ p.sales_count || 0 }}
            </td>

            <!-- Actions -->
            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <router-link :to="`/admin/products/${p.id}/edit`" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs border border-slate-700">
                  Edit
                </router-link>
                <button @click="deleteProduct(p.id)" class="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/30">
                  ✕
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../services/api'
import { useToast } from '../../components/Toast'

const toast = useToast()

const products = ref([])
const categories = ref([])
const loading = ref(true)
const search = ref('')
const selectedStatus = ref('')
const selectedCategory = ref('')

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0)

const fetchCategories = async () => {
  try {
    const res = await api.get('/categories')
    categories.value = res.data.data || []
  } catch (e) {}
}

const fetchProducts = async () => {
  loading.value = true
  try {
    const res = await api.get('/admin/products', {
      params: {
        search: search.value,
        status: selectedStatus.value,
        category_id: selectedCategory.value
      }
    })
    products.value = res.data.data || []
  } catch (err) {
    toast.error('Gagal mengambil daftar produk.')
  } finally {
    loading.value = false
  }
}

const deleteProduct = async (id) => {
  if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return
  try {
    await api.delete(`/admin/products/${id}`)
    toast.success('Produk berhasil dihapus.')
    fetchProducts()
  } catch (err) {
    toast.error('Gagal menghapus produk.')
  }
}

onMounted(() => {
  fetchCategories()
  fetchProducts()
})
</script>
