<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-leaf-50 flex items-center justify-center text-leaf-600">
          <Icon name="book-open" size="md" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-slate-800">Library Saya</h1>
          <p class="text-xs text-slate-500">Akses semua artikel dan produk yang telah Anda beli.</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex gap-2">
        <button 
          v-for="f in ['all', 'article', 'ebook', 'journal', 'research_paper']" 
          :key="f"
          @click="filter = f"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border"
          :class="filter === f 
            ? 'bg-brand-50 border-brand-200 text-brand-700' 
            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'"
        >
          {{ f === 'all' ? 'Semua' : f.replace('_', ' ').toUpperCase() }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-16 text-slate-400">
      <Icon name="refresh" class="w-8 h-8 mx-auto animate-spin mb-4 text-brand-500" />
      <p class="text-sm font-medium">Memuat library...</p>
    </div>

    <div v-else-if="filteredItems.length === 0" class="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
      <div class="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-5">
        <Icon name="book-open" size="xl" />
      </div>
      <h3 class="text-lg font-bold text-slate-800 mb-2">Belum Ada Produk</h3>
      <p class="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
        {{ filter === 'all' 
          ? 'Anda belum memiliki koleksi apapun.' 
          : 'Tidak ada koleksi untuk kategori ini.' }}
      </p>
      <router-link to="/products" class="btn btn-primary px-8">Cari Artikel &rarr;</router-link>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
      <!-- Library Item Card -->
      <div 
        v-for="item in filteredItems" 
        :key="item.id"
        class="card group flex flex-col overflow-hidden"
      >
        <div class="relative bg-slate-100 aspect-[4/3] overflow-hidden">
           <BookCover :product="item.product" class="w-1/2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-lg group-hover:scale-105 transition-transform duration-300" />
           <span class="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded shadow bg-white text-slate-600 uppercase tracking-wider">
              {{ item.product.type_label }}
           </span>
        </div>
        
        <div class="p-4 flex-1 flex flex-col bg-white">
          <router-link :to="`/product/${item.product.slug}`" class="text-sm font-bold text-slate-800 hover:text-brand-600 truncate-2-lines leading-snug mb-2">
            {{ item.product.title }}
          </router-link>
          
          <div class="flex items-center justify-between text-xs text-slate-500 mt-auto pt-4">
            <span v-if="item.product.author" class="truncate pr-2">Oleh {{ item.product.author.name }}</span>
            <span v-else></span>
            <span class="text-[10px] shrink-0 text-slate-400">Dibeli {{ new Date(item.created_at).toLocaleDateString('id-ID') }}</span>
          </div>
        </div>

        <div class="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <router-link :to="`/library/${item.product.slug}/read`" class="btn btn-leaf btn-sm w-full">
            <Icon name="book-open" size="sm" /> Baca Sekarang
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../services/api'
import BookCover from '../components/BookCover.vue'
import Icon from '../components/Icon.vue'
import { useToast } from '../components/Toast.vue'

const items = ref([])
const loading = ref(true)
const filter = ref('all')
const toast = useToast()

const fetchLibrary = async () => {
  loading.value = true
  try {
    const res = await api.get('/library')
    items.value = res.data.library
  } catch (err) {
    toast.error('Gagal memuat library.')
  } finally {
    loading.value = false
  }
}

const filteredItems = computed(() => {
  if (filter.value === 'all') return items.value
  return items.value.filter(item => item.product.type === filter.value)
})

onMounted(fetchLibrary)
</script>
