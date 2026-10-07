<template>
  <div v-if="loading" class="max-w-7xl mx-auto py-16 text-center text-slate-400">
    <Icon name="refresh" class="w-8 h-8 mx-auto animate-spin mb-4 text-brand-500" />
    <p class="text-sm font-medium">Memuat detail produk...</p>
  </div>

  <div v-else-if="product" class="max-w-7xl mx-auto space-y-8">
    
    <!-- Top Hero Section -->
    <div class="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 xl:gap-12 items-start">
      
      <!-- Left: Cover Image Card -->
      <div class="space-y-4">
        <div class="relative aspect-[3/4] shadow-card rounded-2xl overflow-hidden group">
          <BookCover :product="product" rounded="rounded-2xl" />
          <span :class="['badge absolute top-3 left-3 shadow', badgeClass(product.type)]">{{ product.type_label }}</span>
          <!-- Enlarge hint on hover (if there's a real cover) -->
          <div v-if="product.cover_url" class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <Icon name="eye" size="lg" class="text-white drop-shadow-md" />
          </div>
        </div>
        <p v-if="product.cover_caption" class="text-xs text-slate-400 text-center italic font-serif px-4">
          {{ product.cover_caption }}
        </p>
      </div>

      <!-- Right: Main Details & Purchase Actions -->
      <div class="space-y-6 pt-2">
        
        <!-- Category & Meta -->
        <div class="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
          <router-link v-if="product.category" :to="`/products?category=${product.category.slug}`" class="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-md hover:bg-brand-100 transition-colors">
            {{ product.category.name }}
          </router-link>
          <span v-if="product.reading_time" class="flex items-center gap-1.5"><Icon name="clock" size="xs" /> {{ product.reading_time }} mnt baca</span>
          <span v-if="product.word_count" class="flex items-center gap-1.5"><Icon name="document" size="xs" /> {{ product.word_count }} kata</span>
          <span v-if="product.sources_count" class="flex items-center gap-1.5"><Icon name="link" size="xs" /> {{ product.sources_count }} referensi</span>
        </div>

        <!-- Title & Subtitle -->
        <div>
          <h1 class="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
            {{ product.title }}
          </h1>
          <p v-if="product.subtitle" class="text-slate-600 font-serif text-base sm:text-lg leading-relaxed italic border-l-2 border-brand-300 pl-4">
            {{ product.subtitle }}
          </p>
        </div>

        <!-- Author Info -->
        <router-link v-if="product.author" :to="`/products?author=${product.author.slug}`" class="group flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50 w-fit transition-all">
          <div class="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0">
            <img v-if="product.author.photo_url" :src="product.author.photo_url" :alt="product.author.name" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-700 text-white font-bold text-sm">
              {{ initials(product.author.name) }}
            </div>
          </div>
          <div>
            <div class="text-[10px] uppercase tracking-wider font-bold text-slate-400 group-hover:text-brand-500 transition-colors">Penulis / Analyst</div>
            <div class="text-sm font-bold text-slate-800">{{ product.author.name }}</div>
          </div>
          <Icon name="chevron-right" size="sm" class="text-slate-300 ml-2 group-hover:text-brand-600 transition-colors" />
        </router-link>

        <!-- Price & Action Box -->
        <div class="card p-6 bg-gradient-to-br from-white to-slate-50 space-y-5">
          <div class="flex items-end gap-3">
            <template v-if="product.is_free">
              <span class="text-3xl font-extrabold text-leaf-600 tracking-tight">GRATIS</span>
            </template>
            <template v-else>
              <span class="text-3xl font-extrabold text-brand-700 tracking-tight">{{ formatRupiah(product.final_price) }}</span>
              <span v-if="product.discount_percent > 0" class="text-sm font-semibold text-slate-400 line-through mb-1.5">
                {{ formatRupiah(product.price) }}
              </span>
              <span v-if="product.discount_percent > 0" class="px-2 py-0.5 bg-rose-50 text-rose-600 text-[11px] font-bold rounded-md mb-2 border border-rose-100">
                Hemat {{ product.discount_percent }}%
              </span>
            </template>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-3">
            <template v-if="product.is_owned">
              <router-link :to="`/library/${product.slug}/read`" class="btn btn-leaf btn-lg flex-1">
                <Icon name="book-open" size="md" /> Baca di Library
              </router-link>
            </template>
            <template v-else>
              <button @click="buyNow" :disabled="submitting" class="btn btn-primary btn-lg flex-1">
                <Icon v-if="!submitting" name="bolt" size="sm" />
                {{ submitting ? 'Memproses...' : 'Beli Sekarang' }}
              </button>
              <button @click="addToCart" :disabled="submitting" class="btn btn-outline btn-lg w-full sm:w-auto">
                <Icon name="cart" size="sm" /> Keranjang
              </button>
            </template>
          </div>
          <p class="text-[11px] text-slate-400 flex items-center justify-center sm:justify-start gap-1.5">
            <Icon name="shield" size="xs" /> Pembayaran aman via Midtrans · Langsung tersedia setelah pembayaran
          </p>
        </div>

        <!-- Features Bullets -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs font-medium text-slate-500 pt-2">
          <div class="flex items-center gap-2"><Icon name="check-circle" size="sm" class="text-leaf-500" /> Akses Online Reader 24/7</div>
          <div class="flex items-center gap-2"><Icon name="check-circle" size="sm" class="text-leaf-500" /> Hak akses milik akun selamanya</div>
          <div class="flex items-center gap-2"><Icon name="check-circle" size="sm" class="text-leaf-500" /> Format responsive seluler & desktop</div>
          <div class="flex items-center gap-2"><Icon name="check-circle" size="sm" class="text-leaf-500" /> Bebas unduh PDF jika tersedia</div>
        </div>

      </div>
    </div>

    <!-- Article Teaser / Preview HTML Section -->
    <div class="card p-6 md:p-10">
      <div class="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
        <h2 class="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
          <Icon name="document" size="md" class="text-brand-500" /> Ringkasan & Teaser
        </h2>
        <span class="text-[10px] font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100 tracking-wider">FREE PREVIEW</span>
      </div>

      <div 
        class="article-prose" 
        v-html="product.preview_html || product.description || '<p>Tidak ada preview tersedia.</p>'"
      ></div>

      <!-- Lock Overlay for Non-Owners -->
      <div v-if="!product.is_owned" class="mt-8 pt-8 border-t border-dashed border-slate-200">
        <div class="max-w-lg mx-auto bg-slate-50 rounded-2xl p-6 text-center border border-slate-100">
          <div class="w-12 h-12 mx-auto rounded-xl bg-white shadow-sm border border-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <Icon name="lock" size="md" />
          </div>
          <h4 class="text-base font-bold text-slate-800 mb-1.5">Konten Eksklusif</h4>
          <p class="text-xs text-slate-500 mb-5 leading-relaxed">
            Sisa isi artikel, data penelitian, dan grafik analisis dilindungi. Beli produk ini untuk membuka akses penuh tanpa batas waktu.
          </p>
          <button @click="buyNow" class="btn btn-primary btn-sm px-6">Buka Akses Lengkap &rarr;</button>
        </div>
      </div>
    </div>

    <!-- Related Products -->
    <div v-if="related.length > 0" class="pt-6">
      <h3 class="section-title mb-5">Produk Terkait</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-x-5 gap-y-7">
        <ProductCard v-for="item in related" :key="item.id" :product="item" @add-cart="handleAddToCart" />
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import ProductCard from '../components/ProductCard.vue'
import BookCover from '../components/BookCover.vue'
import Icon from '../components/Icon.vue'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useToast } from '../components/Toast.vue'
import { formatRupiah, initials } from '../utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const toast = useToast()

const product = ref(null)
const related = ref([])
const loading = ref(true)
const submitting = ref(false)

const badgeClass = (type) => ({
  article: 'badge-article',
  ebook: 'badge-ebook',
  journal: 'badge-journal',
  research_paper: 'badge-research'
}[type] || 'badge-article')

const fetchProduct = async () => {
  loading.value = true
  try {
    const res = await api.get(`/products/${route.params.slug}`)
    product.value = res.data.product
    related.value = res.data.related || []
  } catch (err) {
    toast.error('Produk tidak ditemukan.')
    router.push({ name: 'Products' })
  } finally {
    loading.value = false
  }
}

const buyNow = async () => {
  if (!auth.isAuthenticated) return router.push({ name: 'Login', query: { redirect: route.fullPath } })
  
  submitting.value = true
  try {
    const res = await api.post('/checkout', { product_ids: [product.value.id] })
    toast.success('Pesanan berhasil dibuat!')
    router.push({ name: 'OrderDetail', params: { number: res.data.order.order_number } })
  } catch (err) {
    toast.error(err.response?.data?.message || 'Gagal memproses pembelian.')
  } finally {
    submitting.value = false
  }
}

const addToCart = async () => {
  if (!auth.isAuthenticated) return router.push({ name: 'Login', query: { redirect: route.fullPath } })
  try {
    await cart.addToCart(product.value.id)
    toast.success(`'${product.value.title}' ditambahkan ke keranjang.`)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Gagal menambahkan ke keranjang.')
  }
}

const handleAddToCart = async (p) => {
  if (!auth.isAuthenticated) return router.push({ name: 'Login', query: { redirect: route.fullPath } })
  try {
    await cart.addToCart(p.id)
    toast.success(`'${p.title}' ditambahkan ke keranjang.`)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Gagal menambahkan.')
  }
}

watch(() => route.params.slug, (newSlug) => {
  if (newSlug) {
    fetchProduct()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
})

onMounted(fetchProduct)
</script>
