<template>
  <div class="space-y-6">
    
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-extrabold text-white tracking-tight">Manajemen Hero Banners CMS</h1>
        <p class="text-slate-400 text-xs mt-1">Kelola banner promo & sorotan di halaman depan storefront</p>
      </div>

      <button @click="openModal()" class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 hover:brightness-110 shadow-lg shadow-amber-500/20">
        <span>+</span> Tambah Banner
      </button>
    </div>

    <!-- Banner Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div 
        v-for="b in banners" 
        :key="b.id"
        class="glass p-5 rounded-3xl border border-white/10 space-y-4 relative overflow-hidden"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span :class="['px-2 py-0.5 rounded text-[10px] font-bold uppercase', b.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400']">
                {{ b.is_active ? 'Aktif' : 'Non-aktif' }}
              </span>
              <span class="text-xs text-slate-400 font-mono">Urutan: #{{ b.sort_order }}</span>
            </div>
            <h3 class="font-bold text-white text-base leading-snug">{{ b.title }}</h3>
            <p class="text-xs text-slate-400 mt-1 line-clamp-2">{{ b.subtitle }}</p>
          </div>

          <div class="flex items-center gap-2">
            <button @click="openModal(b)" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold">Edit</button>
            <button @click="deleteBanner(b.id)" class="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold">✕</button>
          </div>
        </div>

        <div v-if="b.button_text" class="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <span class="text-slate-400">Tombol CTA:</span>
          <span class="font-bold text-amber-400">{{ b.button_text }} &rarr;</span>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="glass p-6 sm:p-8 rounded-3xl border border-white/10 w-full max-w-md space-y-4">
        <h3 class="text-lg font-bold text-white border-b border-white/10 pb-3">
          {{ editingId ? 'Edit Banner' : 'Tambah Banner Baru' }}
        </h3>

        <form @submit.prevent="saveBanner" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Judul Banner</label>
            <input v-model="form.title" type="text" required class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Sub-judul / Deskripsi Promo</label>
            <textarea v-model="form.subtitle" rows="2" class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs"></textarea>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Teks Tombol (CTA)</label>
            <input v-model="form.button_text" type="text" placeholder="Jelajahi Sekarang" class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Target URL Tombol</label>
            <input v-model="form.button_url" type="text" placeholder="/products" class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs" />
          </div>

          <div class="flex items-center gap-4">
            <div class="flex-1">
              <label class="block text-xs font-semibold text-slate-300 mb-1">Urutan</label>
              <input v-model.number="form.sort_order" type="number" class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-mono" />
            </div>

            <div class="flex items-center gap-2 pt-5">
              <input type="checkbox" v-model="form.is_active" id="b_active" class="w-4 h-4 accent-amber-500" />
              <label for="b_active" class="text-xs text-white font-bold cursor-pointer">Aktifkan</label>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button type="button" @click="showModal = false" class="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300">Batal</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-amber-400 text-xs font-bold text-slate-950">Simpan</button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import api from '../../services/api'
import { useToast } from '../../components/Toast'

const toast = useToast()
const banners = ref([])
const showModal = ref(false)
const editingId = ref(null)

const form = reactive({
  title: '',
  subtitle: '',
  button_text: '',
  button_url: '',
  sort_order: 0,
  is_active: true
})

const fetchBanners = async () => {
  try {
    const res = await api.get('/admin/banners')
    banners.value = res.data.data || []
  } catch (e) {}
}

const openModal = (b = null) => {
  if (b) {
    editingId.value = b.id
    form.title = b.title
    form.subtitle = b.subtitle || ''
    form.button_text = b.button_text || ''
    form.button_url = b.button_url || ''
    form.sort_order = b.sort_order || 0
    form.is_active = !!b.is_active
  } else {
    editingId.value = null
    form.title = ''
    form.subtitle = ''
    form.button_text = ''
    form.button_url = ''
    form.sort_order = 0
    form.is_active = true
  }
  showModal.value = true
}

const saveBanner = async () => {
  try {
    if (editingId.value) {
      await api.put(`/admin/banners/${editingId.value}`, form)
      toast.success('Banner diperbarui!')
    } else {
      await api.post('/admin/banners', form)
      toast.success('Banner baru dibuat!')
    }
    showModal.value = false
    fetchBanners()
  } catch (err) {
    toast.error('Gagal menyimpan banner.')
  }
}

const deleteBanner = async (id) => {
  if (!confirm('Hapus banner ini?')) return
  try {
    await api.delete(`/admin/banners/${id}`)
    toast.success('Banner dihapus.')
    fetchBanners()
  } catch (e) {
    toast.error('Gagal menghapus banner.')
  }
}

onMounted(() => {
  fetchBanners()
})
</script>
