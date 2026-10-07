<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div v-if="loading" class="text-center py-20 text-slate-400">
      <Icon name="refresh" class="w-8 h-8 mx-auto animate-spin mb-4 text-brand-500" />
      <p class="text-sm font-medium">Memuat naskah...</p>
    </div>

    <template v-else-if="product">
      <!-- Header Reader -->
      <div class="bg-white rounded-2xl shadow-card border border-slate-100 p-6 md:p-10 mb-8 text-center relative overflow-hidden">
        <!-- Decoration -->
        <div class="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-300 via-brand-500 to-leaf-400"></div>

        <div class="mb-4 inline-flex items-center justify-center space-x-2 text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
          <Icon name="book-open" size="xs" />
          <span class="uppercase tracking-widest">{{ product.type_label }}</span>
        </div>

        <h1 class="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
          {{ product.title }}
        </h1>
        <p v-if="product.subtitle" class="text-lg md:text-xl text-slate-600 font-serif italic mb-6">
          {{ product.subtitle }}
        </p>

        <div class="flex items-center justify-center gap-6 text-sm font-medium text-slate-500 border-t border-slate-100 pt-6 mt-6">
          <div v-if="product.author" class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
              <img v-if="product.author.photo_url" :src="product.author.photo_url" :alt="product.author.name" class="w-full h-full object-cover"/>
            </div>
            <span class="text-slate-700 font-bold">{{ product.author.name }}</span>
          </div>
          <div class="flex items-center gap-1.5" title="Waktu Baca">
            <Icon name="clock" size="sm" /> {{ product.reading_time || 5 }} mnt
          </div>
        </div>
      </div>

      <!-- Content Reader -->
      <div class="bg-white rounded-2xl shadow-card border border-slate-100 p-6 md:p-12 lg:p-16">
        <div 
          class="article-prose"
          v-html="product.content_html"
        ></div>
      </div>

      <!-- Action Footer -->
      <div class="flex justify-between items-center py-6 px-4">
        <router-link to="/library" class="btn btn-outline btn-sm">
          &larr; Kembali ke Library
        </router-link>
        <button @click="window.scrollTo({top:0, behavior:'smooth'})" class="btn btn-primary btn-sm rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg">
          <Icon name="chevron-right" class="-rotate-90" />
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { useToast } from '../components/Toast.vue'
import Icon from '../components/Icon.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const product = ref(null)
const loading = ref(true)

const fetchContent = async () => {
  loading.value = true
  try {
    const res = await api.get(`/library/${route.params.slug}/read`)
    product.value = res.data.product
  } catch (err) {
    if (err.response?.status === 403) {
      toast.error('Anda tidak memiliki akses ke konten ini.')
      router.push(`/product/${route.params.slug}`)
    } else {
      toast.error('Gagal memuat konten bacaan.')
      router.push('/library')
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchContent)
</script>
