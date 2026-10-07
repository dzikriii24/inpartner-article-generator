<template>
  <div class="space-y-6">
    
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-extrabold text-white tracking-tight">Manajemen Penulis / Author</h1>
        <p class="text-slate-400 text-xs mt-1">Kelola profil dewan redaksi & penulis publikasi</p>
      </div>

      <button @click="openModal()" class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 hover:brightness-110 shadow-lg shadow-amber-500/20">
        <span>+</span> Tambah Penulis
      </button>
    </div>

    <!-- Table -->
    <div class="glass rounded-3xl border border-white/10 overflow-hidden">
      <table class="w-full text-left text-xs text-slate-300">
        <thead class="bg-slate-900/80 border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <tr>
            <th class="py-3.5 px-4">Penulis</th>
            <th class="py-3.5 px-4">Bio / Keterangan</th>
            <th class="py-3.5 px-4 text-center">Jumlah Artikel</th>
            <th class="py-3.5 px-4 text-right">Aksi</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-white/5">
          <tr v-for="a in authors" :key="a.id" class="hover:bg-white/[0.02] transition-colors">
            <td class="py-3 px-4 font-bold text-white flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
                {{ a.name.charAt(0) }}
              </div>
              <div>
                <div>{{ a.name }}</div>
                <div class="text-[10px] text-slate-400 font-mono">{{ a.slug }}</div>
              </div>
            </td>

            <td class="py-3 px-4 text-slate-400 max-w-sm truncate">
              {{ a.bio || '-' }}
            </td>

            <td class="py-3 px-4 text-center font-mono font-bold text-amber-400">
              {{ a.products_count || 0 }}
            </td>

            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button @click="openModal(a)" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs border border-slate-700">
                  Edit
                </button>
                <button @click="deleteAuthor(a.id)" class="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/30">
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
          {{ editingId ? 'Edit Penulis' : 'Tambah Penulis Baru' }}
        </h3>

        <form @submit.prevent="saveAuthor" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap Penulis</label>
            <input v-model="form.name" type="text" required class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Bio / Deskripsi Profil</label>
            <textarea v-model="form.bio" rows="3" class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs"></textarea>
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
const authors = ref([])
const showModal = ref(false)
const editingId = ref(null)

const form = reactive({ name: '', bio: '' })

const fetchAuthors = async () => {
  try {
    const res = await api.get('/admin/authors')
    authors.value = res.data.data || []
  } catch (e) {}
}

const openModal = (author = null) => {
  if (author) {
    editingId.value = author.id
    form.name = author.name
    form.bio = author.bio || ''
  } else {
    editingId.value = null
    form.name = ''
    form.bio = ''
  }
  showModal.value = true
}

const saveAuthor = async () => {
  try {
    if (editingId.value) {
      await api.put(`/admin/authors/${editingId.value}`, form)
      toast.success('Penulis diperbarui!')
    } else {
      await api.post('/admin/authors', form)
      toast.success('Penulis baru dibuat!')
    }
    showModal.value = false
    fetchAuthors()
  } catch (err) {
    toast.error('Gagal menyimpan penulis.')
  }
}

const deleteAuthor = async (id) => {
  if (!confirm('Hapus penulis ini?')) return
  try {
    await api.delete(`/admin/authors/${id}`)
    toast.success('Penulis dihapus.')
    fetchAuthors()
  } catch (e) {
    toast.error('Gagal menghapus penulis.')
  }
}

onMounted(() => {
  fetchAuthors()
})
</script>
