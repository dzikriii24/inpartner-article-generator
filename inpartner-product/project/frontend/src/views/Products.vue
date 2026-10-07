<template>
  <div class="space-y-7">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-1">Katalog</p>
        <h1 class="text-2xl font-bold text-slate-900">Produk Digital</h1>
        <p class="text-sm text-slate-400 mt-1">Ebook, artikel premium, jurnal, dan paper riset terkurasi.</p>
      </div>
      <div class="w-full md:w-72 relative">
        <input
          v-model="filters.q"
          @input="debounceSearch"
          type="search"
          placeholder="Filter judul, kata kunci..."
          class="form-input pl-10"
        />
        <Icon name="search" size="sm" class="absolute left-3.5 top-3 text-slate-400" />
      </div>
    </div>

    <!-- Type tabs -->
    <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
      <button @click="setType('')" :class="tabClass(!filters.type)">Semua</button>
      <button v-for="t in types" :key="t.key" @click="setType(t.key)" :class="tabClass(filters.type === t.key)">
        {{ t.label }}
        <span :class="['ml-1 px-1.5 py-0.5 rounded-full text-[10px]', filters.type === t.key ? 'bg-white/25' : 'bg-slate-100 text-slate-500']">{{ t.count }}</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
      <div>
        <label class="form-label">Kategori</label>
        <select v-model="filters.category" @change="refetch" class="form-input bg-white">
          <option value="">Semua Kategori</option>
          <option v-for="c in categories" :key="c.id" :value="c.slug">{{ c.name }} ({{ c.products_count }})</option>
        </select>
      </div>
      <div>
        <label class="form-label">Harga</label>
        <select v-model="filters.price" @change="refetch" class="form-input bg-white">
          <option value="">Semua Harga</option>
          <option value="paid">Berbayar</option>
          <option value="free">Gratis</option>
        </select>
      </div>
      <div>
        <label class="form-label">Urutkan</label>
        <select v-model="filters.sort" @change="refetch" class="form-input bg-white">
          <option value="newest">Terbaru</option>
          <option value="popular">Terpopuler</option>
          <option value="price_asc">Harga: Rendah ke Tinggi</option>
          <option value="price_desc">Harga: Tinggi ke Rendah</option>
          <option value="title">Judul (A-Z)</option>
        </select>
      </div>
    </div>

    <!-- Active author filter -->
    <div v-if="filters.author" class="flex items-center gap-2 text-xs">
      <span class="text-slate-400">Penulis:</span>
      <span class="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-brand-50 text-brand-700 font-semibold">
        {{ authorName }}
        <button @click="clearAuthor" class="w-5 h-5 rounded-full hover:bg-brand-100 flex items-center justify-center" aria-label="Hapus filter penulis">
          <Icon name="x" size="xs" :stroke="2.5" />
        </button>
      </span>
    </div>

    <!-- Result meta -->
    <p v-if="!loading" class="text-xs text-slate-400">
      Menampilkan <span class="font-semibold text-slate-700">{{ products.length }}</span> dari {{ meta.total || products.length }} produk
    </p>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-x-5 gap-y-7">
      <div v-for="n in 10" :key="n">
        <div class="aspect-[3/4] rounded-2xl bg-slate-100 animate-pulse"></div>
        <div class="h-3 mt-3 rounded bg-slate-100 animate-pulse"></div>
        <div class="h-3 mt-2 w-1/2 rounded bg-slate-100 animate-pulse"></div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="products.length === 0" class="text-center py-16 rounded-3xl border border-dashed border-slate-200">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mb-4">
        <Icon name="search" size="lg" />
      </div>
      <h3 class="text-base font-semibold text-slate-800">Tidak ada produk ditemukan</h3>
      <p class="text-xs text-slate-400 mt-1 mb-5">Coba ubah kata kunci atau reset filter.</p>
      <button @click="resetFilters" class="btn btn-outline btn-sm">Reset Filter</button>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-x-5 gap-y-8">
      <ProductCard v-for="item in products" :key="item.id" :product="item" @add-cart="handleAddToCart" />
    </div>

    <!-- Pagination -->
    <div v-if="meta.last_page > 1" class="flex items-center justify-center gap-1.5 pt-4">
      <button :disabled="meta.current_page === 1" @click="changePage(meta.current_page - 1)" class="pager">
        <Icon name="chevron-left" size="sm" />
      </button>
      <button
        v-for="p in pages"
        :key="p"
        @click="changePage(p)"
        :class="['pager', p === meta.current_page && '!bg-brand-600 !text-white !border-brand-600 shadow-lg shadow-brand-600/30']"
      >{{ p }}</button>
      <button :disabled="meta.current_page === meta.last_page" @click="changePage(meta.current_page + 1)" class="pager">
        <Icon name="chevron-right" size="sm" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import ProductCard from '../components/ProductCard.vue'
import Icon from '../components/Icon.vue'
import { useCartStore } from '../stores/cart'
import { useCatalogStore } from '../stores/catalog'
import { useToast } from '../components/Toast.vue'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const catalog = useCatalogStore()
const toast = useToast()

const products = ref([])
const categories = ref([])
const types = ref([])
const loading = ref(false)
const meta = ref({ current_page: 1, last_page: 1, total: 0 })

const filters = reactive({
  q: route.query.q || '',
  type: route.query.type || '',
  category: route.query.category || '',
  author: route.query.author || '',
  price: route.query.price || '',
  sort: route.query.sort || 'newest',
  page: Number(route.query.page) || 1
})

const authorName = computed(() => {
  const a = catalog.authors.find(x => x.slug === filters.author)
  return a?.name || products.value[0]?.author?.name || filters.author
})

const pages = computed(() => {
  const total = meta.value.last_page
  const cur = meta.value.current_page
  const start = Math.max(1, Math.min(cur - 2, total - 4))
  return Array.from({ length: Math.min(5, total) }, (_, i) => start + i)
})

const tabClass = (active) => [
  'px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
  active ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25' : 'bg-white border border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-700'
]

let timer = null
const debounceSearch = () => {
  clearTimeout(timer)
  timer = setTimeout(refetch, 300)
}

const refetch = () => { filters.page = 1; fetchProducts() }
const setType = (key) => { filters.type = key; refetch() }
const clearAuthor = () => { filters.author = ''; refetch() }

const cleanQuery = () => Object.fromEntries(
  Object.entries(filters)
    .filter(([k, v]) => v !== '' && v !== null && !(k === 'page' && v === 1) && !(k === 'sort' && v === 'newest'))
    .map(([k, v]) => [k, String(v)])
)
const sameQuery = (a, b) => {
  const ka = Object.keys(a), kb = Object.keys(b)
  return ka.length === kb.length && ka.every(k => String(a[k]) === String(b[k]))
}

const fetchProducts = async () => {
  loading.value = true
  try {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
    const res = await api.get('/products', { params })
    products.value = res.data.data || []
    meta.value = res.data.meta || { current_page: 1, last_page: 1, total: 0 }
    const next = cleanQuery()
    if (!sameQuery(route.query, next)) router.replace({ query: next })
  } catch (err) {
    console.error('Fetch products error:', err)
  } finally {
    loading.value = false
  }
}

const fetchMeta = async () => {
  try {
    const [catRes, typeRes] = await Promise.all([api.get('/categories'), api.get('/types')])
    categories.value = catRes.data.data || []
    types.value = typeRes.data.data || []
  } catch (err) {}
}

const resetFilters = () => {
  Object.assign(filters, { q: '', type: '', category: '', author: '', price: '', sort: 'newest', page: 1 })
  fetchProducts()
}

const changePage = (p) => {
  filters.page = p
  fetchProducts()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleAddToCart = async (product) => {
  try {
    await cart.addToCart(product.id)
    toast.success(`'${product.title}' ditambahkan ke keranjang.`)
  } catch (err) {
    if (err.response?.status === 401) {
      router.push({ name: 'Login', query: { redirect: `/products/${product.slug}` } })
    } else {
      toast.error(err.response?.data?.message || 'Gagal menambahkan ke keranjang.')
    }
  }
}

// React to external navigation (e.g. global search bar, author links)
watch(() => route.query, (q) => {
  if (route.name !== 'Products' || sameQuery(q, cleanQuery())) return
  filters.q = q.q || ''
  filters.category = q.category || ''
  filters.type = q.type || ''
  filters.author = q.author || ''
  filters.price = q.price || ''
  filters.sort = q.sort || 'newest'
  filters.page = Number(q.page) || 1
  fetchProducts()
})

onMounted(() => {
  fetchMeta()
  fetchProducts()
  catalog.fetchHome()
})
</script>

<style scoped>
.pager {
  @apply min-w-[36px] h-9 px-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 flex items-center justify-center hover:border-brand-300 hover:text-brand-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed;
}
</style>
