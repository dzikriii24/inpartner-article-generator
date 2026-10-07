<template>
  <div class="max-w-4xl mx-auto space-y-6">
    
    <!-- Top Bar Navigation Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <router-link to="/admin/products" class="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 text-xs font-semibold">
          ← Kembali
        </router-link>
        <h1 class="text-2xl font-extrabold text-white tracking-tight">
          {{ isEdit ? 'Edit Produk / Artikel' : 'Tambah Produk Baru' }}
        </h1>
      </div>

      <div v-if="isEdit && form.external_id" class="flex items-center gap-2">
        <button @click="resyncProduct" :disabled="resyncing" class="px-3.5 py-2 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 hover:bg-purple-500/20">
          <span :class="{'animate-spin': resyncing}">🔄</span> Resync Generator
        </button>
      </div>
    </div>

    <!-- Form Container -->
    <form @submit.prevent="saveProduct" class="space-y-6">
      
      <!-- Basic Meta Card -->
      <div class="glass p-6 sm:p-8 rounded-3xl border border-white/10 space-y-5">
        <h2 class="text-base font-bold text-white border-b border-white/10 pb-3">Informasi Utama</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">Judul Produk / Artikel</label>
            <input 
              v-model="form.title" 
              type="text" 
              required 
              placeholder="e.g. Analisis Tren Kecerdasan Buatan Terapan 2026"
              class="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">Kategori</label>
            <select v-model="form.category_id" class="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500">
              <option :value="null">Pilih Kategori</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">Penulis / Author</label>
            <select v-model="form.author_id" class="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500">
              <option :value="null">Inpartner Editorial Board</option>
              <option v-for="a in authors" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">Harga Normal (Rp)</label>
            <input 
              v-model.number="form.price" 
              type="number" 
              required 
              placeholder="50000"
              class="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">Harga Coret / Promo (Rp, Optional)</label>
            <input 
              v-model.number="form.sale_price" 
              type="number" 
              placeholder="35000"
              class="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">Status Publikasi Toko</label>
            <select v-model="form.status" class="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 font-bold text-amber-400">
              <option value="draft">Draft (Tersembunyi)</option>
              <option value="published">Published (Tampil di Store)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">Tipe Publikasi</label>
            <select v-model="form.type" class="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500">
              <option value="article">Artikel Riset</option>
              <option value="ebook">Ebook Digital</option>
              <option value="journal">Jurnal Ilmiah</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">Akses Produk Pembeli</label>
            <select v-model="form.access_type" class="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500">
              <option value="read_download">Baca Online & Unduh PDF</option>
              <option value="read">Hanya Baca Online</option>
              <option value="download">Hanya Unduh Berkas</option>
            </select>
          </div>

          <div class="flex items-center gap-2 pt-6">
            <input type="checkbox" v-model="form.is_featured" id="is_featured" class="w-4 h-4 accent-amber-500 rounded" />
            <label for="is_featured" class="text-xs font-bold text-white cursor-pointer">Tampilkan di Highlight Home Hero</label>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">Ringkasan / Excerpt</label>
          <textarea 
            v-model="form.excerpt" 
            rows="3" 
            placeholder="Ringkasan singkat tentang publikasi ini..."
            class="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
          ></textarea>
        </div>
      </div>

      <!-- Content Editor Card -->
      <div class="glass p-6 sm:p-8 rounded-3xl border border-white/10 space-y-5">
        <h2 class="text-base font-bold text-white border-b border-white/10 pb-3">Konten HTML / Markdown Artikel</h2>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">Rendered HTML Content</label>
          <textarea 
            v-model="form.content_html" 
            rows="10" 
            placeholder="<html>...</html>"
            class="w-full bg-slate-900/80 border border-white/10 rounded-xl p-4 text-white text-xs font-mono focus:outline-none focus:border-amber-500 leading-relaxed"
          ></textarea>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="flex items-center justify-end gap-3">
        <router-link to="/admin/products" class="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold">
          Batal
        </router-link>
        <button 
          type="submit" 
          :disabled="saving"
          class="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          {{ saving ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Buat Produk Baru') }}
        </button>
      </div>

    </form>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../services/api'
import { useToast } from '../../components/Toast'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const isEdit = computed(() => !!route.params.id)

const categories = ref([])
const authors = ref([])
const saving = ref(false)
const resyncing = ref(false)

const form = reactive({
  title: '',
  slug: '',
  subtitle: '',
  excerpt: '',
  type: 'article',
  price: 50000,
  sale_price: null,
  status: 'draft',
  access_type: 'read_download',
  is_featured: false,
  category_id: null,
  author_id: null,
  content_html: '',
  external_id: null
})

const fetchMeta = async () => {
  try {
    const res = await api.get('/admin/products/meta')
    categories.value = res.data.categories || []
    authors.value = res.data.authors || []
  } catch (e) {}
}

const fetchProduct = async () => {
  if (!isEdit.value) return
  try {
    const res = await api.get(`/admin/products/${route.params.id}`)
    const p = res.data.product
    Object.assign(form, p)
  } catch (err) {
    toast.error('Gagal memuat produk.')
  }
}

const saveProduct = async () => {
  saving.value = true
  try {
    if (isEdit.value) {
      await api.put(`/admin/products/${route.params.id}`, form)
      toast.success('Produk berhasil diperbarui!')
    } else {
      await api.post('/admin/products', form)
      toast.success('Produk baru berhasil dibuat!')
    }
    router.push('/admin/products')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Gagal menyimpan produk.')
  } finally {
    saving.value = false
  }
}

const resyncProduct = async () => {
  resyncing.value = true
  try {
    const res = await api.post(`/admin/products/${route.params.id}/resync`)
    const p = res.data.product
    Object.assign(form, p)
    toast.success('Artikel berhasil di-resync dari generator!')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Gagal resync dari generator.')
  } finally {
    resyncing.value = false
  }
}

onMounted(() => {
  fetchMeta()
  fetchProduct()
})
</script>
