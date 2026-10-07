<template>
  <div class="space-y-6">
    
    <!-- Top Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-extrabold text-white tracking-tight">Manajemen Kategori Artikel</h1>
        <p class="text-slate-400 text-xs mt-1">Kelola taksonomi kategori riset & publikasi</p>
      </div>

      <button @click="openModal()" class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 hover:brightness-110 shadow-lg shadow-amber-500/20">
        <span>+</span> Tambah Kategori
      </button>
    </div>

    <!-- Table List -->
    <div class="glass rounded-3xl border border-white/10 overflow-hidden">
      <table class="w-full text-left text-xs text-slate-300">
        <thead class="bg-slate-900/80 border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <tr>
            <th class="py-3.5 px-4">Icon & Nama Kategori</th>
            <th class="py-3.5 px-4">Slug</th>
            <th class="py-3.5 px-4">Deskripsi</th>
            <th class="py-3.5 px-4 text-center">Jumlah Produk</th>
            <th class="py-3.5 px-4 text-right">Aksi</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-white/5">
          <tr v-for="c in categories" :key="c.id" class="hover:bg-white/[0.02] transition-colors">
            <td class="py-3 px-4 font-bold text-white flex items-center gap-2">
              <span class="text-base">{{ c.icon || '🏷️' }}</span>
              <span>{{ c.name }}</span>
            </td>

            <td class="py-3 px-4 font-mono text-slate-400">
              {{ c.slug }}
            </td>

            <td class="py-3 px-4 text-slate-400 max-w-xs truncate">
              {{ c.description || '-' }}
            </td>

            <td class="py-3 px-4 text-center font-mono font-bold text-amber-400">
              {{ c.products_count || 0 }}
            </td>

            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button @click="openModal(c)" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs border border-slate-700">
                  Edit
                </button>
                <button @click="deleteCategory(c.id)" class="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/30">
                  ✕
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="glass p-6 sm:p-8 rounded-3xl border border-white/10 w-full max-w-md space-y-4">
        <h3 class="text-lg font-bold text-white border-b border-white/10 pb-3">
          {{ editingId ? 'Edit Kategori' : 'Tambah Kategori Baru' }}
        </h3>

        <form @submit.prevent="saveCategory" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Nama Kategori</label>
            <input v-model="form.name" type="text" required class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Emoji / Icon</label>
            <input v-model="form.icon" type="text" placeholder="🔬" class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Deskripsi</label>
            <textarea v-model="form.description" rows="3" class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs"></textarea>
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
const categories = ref([])
const showModal = ref(false)
const editingId = ref(null)

const form = reactive({ name: '', icon: '', description: '' })

const fetchCategories = async () => {
  try {
    const res = await api.get('/admin/categories')
    categories.value = res.data.data || []
  } catch (e) {}
}

const openModal = (cat = null) => {
  if (cat) {
    editingId.value = cat.id
    form.name = cat.name
    form.icon = cat.icon || ''
    form.description = cat.description || ''
  } else {
    editingId.value = null
    form.name = ''
    form.icon = ''
    form.description = ''
  }
  showModal.value = true
}

const saveCategory = async () => {
  try {
    if (editingId.value) {
      await api.put(`/admin/categories/${editingId.value}`, form)
      toast.success('Kategori diperbarui!')
    } else {
      await api.post('/admin/categories', form)
      toast.success('Kategori baru dibuat!')
    }
    showModal.value = false
    fetchCategories()
  } catch (err) {
    toast.error('Gagal menyimpan kategori.')
  }
}

const deleteCategory = async (id) => {
  if (!confirm('Hapus kategori ini?')) return
  try {
    await api.delete(`/admin/categories/${id}`)
    toast.success('Kategori dihapus.')
    fetchCategories()
  } catch (e) {
    toast.error('Gagal menghapus kategori.')
  }
}

onMounted(() => {
  fetchCategories()
})
</script>
