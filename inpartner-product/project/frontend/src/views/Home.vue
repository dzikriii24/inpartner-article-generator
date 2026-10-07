<template>
  <div class="space-y-10">
    <!-- ================= Hero banner ================= -->
    <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-indigo-700 to-blue-900 shadow-xl text-white">
      <!-- Ambient Lights & Wave SVGs -->
      <svg class="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 800 300" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 210 C 160 150, 300 260, 470 200 S 700 120, 800 170 L800 300 L0 300 Z" fill="white" />
        <path d="M0 250 C 200 200, 360 290, 560 240 S 760 210, 800 230 L800 300 L0 300 Z" fill="white" />
      </svg>
      <div class="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-400/20 blur-3xl"></div>
      <div class="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl"></div>

      <div class="relative grid md:grid-cols-[1.2fr_1fr] items-center gap-6 px-8 sm:px-12 pt-10 pb-12 md:py-14 min-h-[320px]">
        <transition name="page" mode="out-in">
          <div :key="activeIndex" class="max-w-xl">
            <span v-if="banner.eyebrow" class="inline-flex items-center gap-1.5 mb-4 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-bold uppercase tracking-widest text-brand-100 border border-white/10">
              <Icon name="sparkles" size="xs" /> {{ banner.eyebrow }}
            </span>
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase leading-tight text-white tracking-tight">
              {{ banner.title }}
            </h1>
            <p class="mt-4 text-base text-blue-100/90 leading-relaxed max-w-lg">{{ banner.subtitle }}</p>
            <div class="mt-8 flex flex-wrap items-center gap-4">
              <router-link :to="banner.cta_url || '/products'" class="btn btn-leaf px-8 py-3 text-xs uppercase font-extrabold tracking-wider shadow-lg shadow-emerald-500/20">
                {{ banner.cta_label || 'Jelajahi Sekarang' }} &rarr;
              </router-link>
              <router-link to="/products?price=free" class="btn btn-outline border-white/30 text-white hover:bg-white/10 px-6 py-3 text-xs font-extrabold uppercase tracking-wider">
                Riset Gratis
              </router-link>
            </div>
          </div>
        </transition>

        <div class="hidden md:flex justify-center items-center">
          <img
            :src="banner.image_url || heroImg"
            alt=""
            class="max-h-[280px] w-auto object-contain drop-shadow-2xl animate-float"
          />
        </div>
      </div>

      <!-- Carousel indicators -->
      <div v-if="slides.length > 1" class="absolute bottom-5 left-8 sm:left-12 flex gap-2">
        <button
          v-for="(s, i) in slides"
          :key="i"
          @click="goTo(i)"
          :class="['h-2 rounded-full transition-all', i === activeIndex ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70']"
          :aria-label="`Banner ${i + 1}`"
        ></button>
      </div>
    </section>

    <!-- ================= Popular ================= -->
    <section class="pt-2">
      <div class="flex items-center justify-between gap-5 mb-6">
        <div>
          <h2 class="text-xl sm:text-2xl font-bold text-slate-900">Populer & Trending</h2>
          <p class="text-xs text-slate-400 mt-0.5">Artikel dan publikasi riset dengan pembaca terbanyak bulan ini.</p>
        </div>
        <div class="flex items-center gap-3">
          <router-link to="/products?sort=popular" class="link-more text-xs font-bold">Lihat Semua &rarr;</router-link>
          <div class="hidden sm:flex gap-2">
            <button @click="scrollRow(-1)" class="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-600 flex items-center justify-center transition-all shadow-sm" aria-label="Sebelumnya">
              <Icon name="chevron-left" size="sm" />
            </button>
            <button @click="scrollRow(1)" class="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-600 flex items-center justify-center transition-all shadow-sm" aria-label="Berikutnya">
              <Icon name="chevron-right" size="sm" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="catalog.loading && !popular.length" class="flex gap-6 overflow-hidden">
        <div v-for="n in 6" :key="n" class="w-[180px] shrink-0">
          <div class="aspect-[3/4] rounded-2xl bg-slate-200/80 animate-pulse"></div>
          <div class="h-4 mt-3 rounded bg-slate-200/80 animate-pulse"></div>
          <div class="h-3 mt-2 w-2/3 rounded bg-slate-200/80 animate-pulse"></div>
        </div>
      </div>

      <div v-else-if="popular.length" ref="rowRef" class="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4 -mx-1 px-1 pt-1">
        <div v-for="item in popular" :key="item.id" class="w-[180px] sm:w-[200px] shrink-0 snap-start">
          <ProductCard :product="item" @add-cart="handleAddToCart" />
        </div>
      </div>

      <EmptyHint v-else text="Belum ada produk yang dipublikasikan." />
    </section>

    <!-- ================= Stats ================= -->
    <section class="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <div v-for="s in statCards" :key="s.label" class="card card-hover flex items-center gap-5 p-6 border border-slate-200/80 shadow-sm">
        <div :class="['w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm', s.tone]">
          <Icon :name="s.icon" size="lg" />
        </div>
        <div>
          <div class="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">{{ s.value }}</div>
          <div class="text-xs font-semibold text-slate-500 mt-1.5">{{ s.label }}</div>
        </div>
      </div>
    </section>

    <!-- ================= Categories ================= -->
    <section v-if="catalog.categories.length">
      <div class="flex items-center gap-5 mb-4">
        <h2 class="section-title">Jelajahi Kategori</h2>
      </div>
      <div class="flex flex-wrap gap-2.5">
        <router-link
          v-for="cat in catalog.categories"
          :key="cat.id"
          :to="{ name: 'Products', query: { category: cat.slug } }"
          class="group inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-all"
        >
          <Icon name="tag" size="xs" class="text-brand-400" />
          {{ cat.name }}
          <span class="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-500 group-hover:bg-white">{{ cat.products_count || 0 }}</span>
        </router-link>
      </div>
    </section>

    <!-- ================= Featured ================= -->
    <section v-if="catalog.featured.length">
      <div class="flex items-center gap-5 mb-4">
        <h2 class="section-title">Rekomendasi Pilihan</h2>
        <router-link to="/products" class="link-more">Lihat semua</router-link>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-x-5 gap-y-7">
        <ProductCard v-for="item in catalog.featured" :key="item.id" :product="item" @add-cart="handleAddToCart" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ProductCard from '../components/ProductCard.vue'
import Icon from '../components/Icon.vue'
import heroImg from '../assets/hero-reader.png'
import { useCartStore } from '../stores/cart'
import { useCatalogStore } from '../stores/catalog'
import { useToast } from '../components/Toast.vue'
import { initials } from '../utils/format'

const EmptyHint = (props) => h('div', { class: 'text-center text-xs text-slate-400 py-10 rounded-2xl border border-dashed border-slate-200' }, props.text)
EmptyHint.props = ['text']

const router = useRouter()
const cart = useCartStore()
const catalog = useCatalogStore()
const toast = useToast()

const DEFAULT_BANNER = {
  title: 'Artikel riset paling banyak dibaca bulan ini',
  subtitle: 'Temukan analisis mendalam, ebook, dan paper riset terkurasi dari tim editorial Inpartner.',
  cta_label: 'Lihat Sekarang',
  cta_url: '/products?sort=popular'
}

const slides = computed(() => (catalog.banners.length ? catalog.banners : [DEFAULT_BANNER]))
const activeIndex = ref(0)
const banner = computed(() => slides.value[activeIndex.value] || DEFAULT_BANNER)

let timer = null
const startAuto = () => {
  clearInterval(timer)
  timer = setInterval(() => {
    if (slides.value.length > 1) activeIndex.value = (activeIndex.value + 1) % slides.value.length
  }, 6000)
}
const goTo = (i) => { activeIndex.value = i; startAuto() }

const popular = computed(() => (catalog.popular.length ? catalog.popular : catalog.latest))

const rowRef = ref(null)
const scrollRow = (dir) => rowRef.value?.scrollBy({ left: dir * 340, behavior: 'smooth' })

const statCards = computed(() => [
  { label: 'Produk Digital', value: catalog.stats.products ?? 0, icon: 'book', tone: 'bg-brand-50 text-brand-600' },
  { label: 'Penulis', value: catalog.stats.authors ?? catalog.authors.length, icon: 'users', tone: 'bg-leaf-50 text-leaf-600' },
  { label: 'Artikel Riset', value: catalog.stats.articles ?? 0, icon: 'document', tone: 'bg-sky-50 text-sky-600' }
])

const AVATAR_COLORS = ['from-brand-400 to-brand-700', 'from-sky-400 to-blue-600', 'from-emerald-400 to-teal-600', 'from-amber-400 to-orange-500', 'from-slate-500 to-slate-800']
const avatarColor = (id) => AVATAR_COLORS[(Number(id) || 0) % AVATAR_COLORS.length]

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

onMounted(() => {
  catalog.fetchHome(true)
  startAuto()
})
onBeforeUnmount(() => clearInterval(timer))
</script>
