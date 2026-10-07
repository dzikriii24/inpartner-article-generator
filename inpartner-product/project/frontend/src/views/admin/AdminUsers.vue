<template>
  <div class="space-y-6">
    
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-extrabold text-white tracking-tight">Manajemen Pelanggan & Hak Akses</h1>
        <p class="text-slate-400 text-xs mt-1">Kelola data user, role, dan pemberian lisensi artikel manual</p>
      </div>
    </div>

    <!-- Table -->
    <div class="glass rounded-3xl border border-white/10 overflow-hidden">
      <table class="w-full text-left text-xs text-slate-300">
        <thead class="bg-slate-900/80 border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <tr>
            <th class="py-3.5 px-4">Nama Pelanggan</th>
            <th class="py-3.5 px-4">Email & No. HP</th>
            <th class="py-3.5 px-4">Role</th>
            <th class="py-3.5 px-4">Terdaftar</th>
            <th class="py-3.5 px-4 text-right">Aksi Hak Akses</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-white/5">
          <tr v-for="u in users" :key="u.id" class="hover:bg-white/[0.02] transition-colors">
            <td class="py-3 px-4 font-bold text-white flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
                {{ u.name.charAt(0) }}
              </div>
              <span>{{ u.name }}</span>
            </td>

            <td class="py-3 px-4">
              <div class="font-mono text-white">{{ u.email }}</div>
              <div class="text-[10px] text-slate-400 font-mono">{{ u.phone || '-' }}</div>
            </td>

            <td class="py-3 px-4">
              <span :class="['px-2 py-0.5 rounded text-[10px] font-bold uppercase', u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' : 'bg-slate-800 text-slate-400']">
                {{ u.role }}
              </span>
            </td>

            <td class="py-3 px-4 text-slate-400">
              {{ formatDate(u.created_at) }}
            </td>

            <td class="py-3 px-4 text-right">
              <button @click="openGrantModal(u)" class="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300">
                + Grant Produk
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Grant Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="glass p-6 sm:p-8 rounded-3xl border border-white/10 w-full max-w-md space-y-4">
        <h3 class="text-lg font-bold text-white border-b border-white/10 pb-3">
          Beri Akses Produk ke {{ selectedUser?.name }}
        </h3>

        <form @submit.prevent="grantAccess" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Pilih Produk</label>
            <select v-model="grantProductId" required class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs">
              <option :value="null">-- Pilih Produk --</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.title }}</option>
            </select>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button type="button" @click="showModal = false" class="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300">Batal</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-amber-400 text-xs font-bold text-slate-950">Berikan Akses</button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../services/api'
import { useToast } from '../../components/Toast'

const toast = useToast()
const users = ref([])
const products = ref([])
const showModal = ref(false)
const selectedUser = ref(null)
const grantProductId = ref(null)

const formatDate = (str) => str ? new Date(str).toLocaleDateString('id-ID') : '-'

const fetchUsers = async () => {
  try {
    const res = await api.get('/admin/users')
    users.value = res.data.data || []
  } catch (e) {}
}

const fetchProducts = async () => {
  try {
    const res = await api.get('/admin/products')
    products.value = res.data.data || []
  } catch (e) {}
}

const openGrantModal = (user) => {
  selectedUser.value = user
  grantProductId.value = null
  showModal.value = true
}

const grantAccess = async () => {
  if (!grantProductId.value) return
  try {
    await api.post(`/admin/users/${selectedUser.value.id}/grant`, { product_id: grantProductId.value })
    toast.success(`Akses produk berhasil diberikan ke ${selectedUser.value.name}!`)
    showModal.value = false
  } catch (err) {
    toast.error('Gagal memberikan akses produk.')
  }
}

onMounted(() => {
  fetchUsers()
  fetchProducts()
})
</script>
