<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center gap-3 border-b border-slate-100 pb-4">
      <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
        <Icon name="user" size="md" />
      </div>
      <div>
        <h1 class="text-xl font-bold text-slate-800">Profil Saya</h1>
        <p class="text-xs text-slate-500">Kelola informasi akun Anda.</p>
      </div>
    </div>

    <div class="card p-6 md:p-8">
      <form @submit.prevent="updateProfile" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1.5">Nama Lengkap</label>
            <input 
              v-model="form.name" 
              type="text" 
              required
              class="input-field"
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1.5">Email</label>
            <input 
              v-model="form.email" 
              type="email" 
              required
              class="input-field bg-slate-50 text-slate-500"
              disabled
            />
            <p class="text-[10px] text-slate-400 mt-1">Email tidak dapat diubah.</p>
          </div>
        </div>

        <div class="border-t border-slate-100 pt-6">
          <h4 class="text-sm font-bold text-slate-800 mb-4">Ubah Password (Opsional)</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">Password Baru</label>
              <input 
                v-model="form.password" 
                type="password" 
                class="input-field"
                placeholder="Biarkan kosong jika tidak ingin mengubah"
              />
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">Konfirmasi Password Baru</label>
              <input 
                v-model="form.password_confirmation" 
                type="password" 
                class="input-field"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-4">
          <button type="submit" :disabled="loading" class="btn btn-primary px-8 shadow-md shadow-brand-500/20">
            <Icon v-if="loading" name="refresh" class="animate-spin mr-2" />
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import { useToast } from '../components/Toast.vue'
import Icon from '../components/Icon.vue'

const auth = useAuthStore()
const toast = useToast()

const loading = ref(false)
const form = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: ''
})

onMounted(() => {
  if (auth.user) {
    form.name = auth.user.name
    form.email = auth.user.email
  }
})

const updateProfile = async () => {
  if (form.password && form.password !== form.password_confirmation) {
    return toast.error('Password konfirmasi tidak cocok.')
  }
  loading.value = true
  try {
    const res = await api.put('/profile', {
      name: form.name,
      password: form.password,
      password_confirmation: form.password_confirmation
    })
    toast.success('Profil berhasil diperbarui.')
    auth.user.name = form.name
    form.password = ''
    form.password_confirmation = ''
  } catch (err) {
    toast.error(err.response?.data?.message || 'Gagal memperbarui profil.')
  } finally {
    loading.value = false
  }
}
</script>
