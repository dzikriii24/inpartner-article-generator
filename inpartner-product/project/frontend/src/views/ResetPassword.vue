<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-extrabold text-slate-900 mb-2">Reset Password</h1>
      <p class="text-slate-500">Silakan masukkan password baru Anda.</p>
    </div>

    <div v-if="errorMessage" class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm font-medium mb-6 flex items-center gap-2">
      <Icon name="x-circle" size="sm" /> {{ errorMessage }}
    </div>

    <form @submit.prevent="handleReset" class="space-y-5">
      <input type="hidden" v-model="form.token" />
      <input type="hidden" v-model="form.email" />

      <div>
        <label class="block text-sm font-bold text-slate-700 mb-1.5">Password Baru</label>
        <div class="relative">
           <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon name="lock" size="sm" />
          </div>
          <input 
            v-model="form.password" 
            :type="showPassword ? 'text' : 'password'" 
            required
            minlength="8"
            class="input-field pl-10 pr-10"
            placeholder="Minimal 8 karakter"
          />
          <button 
            type="button" 
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
          >
            <Icon :name="showPassword ? 'eye-off' : 'eye'" size="sm" />
          </button>
        </div>
      </div>

      <div>
        <label class="block text-sm font-bold text-slate-700 mb-1.5">Konfirmasi Password Baru</label>
        <div class="relative">
           <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon name="lock" size="sm" />
          </div>
          <input 
            v-model="form.password_confirmation" 
            :type="showPassword ? 'text' : 'password'" 
            required
            minlength="8"
            class="input-field pl-10 pr-10"
            placeholder="Ketik ulang password"
          />
        </div>
      </div>

      <div class="pt-2">
        <button type="submit" :disabled="loading" class="btn btn-primary w-full py-3 text-base shadow-md shadow-brand-500/20">
          <Icon v-if="loading" name="refresh" class="animate-spin" />
          <span v-else>Simpan Password Baru</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../services/api'
import { useToast } from '../components/Toast'
import Icon from '../components/Icon.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const loading = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)

const form = reactive({
  token: '',
  email: '',
  password: '',
  password_confirmation: ''
})

onMounted(() => {
  form.token = route.query.token || ''
  form.email = route.query.email || ''
  
  if (!form.token || !form.email) {
    toast.error('Tautan reset password tidak valid.')
    router.push('/login')
  }
})

const handleReset = async () => {
  if (form.password !== form.password_confirmation) {
    errorMessage.value = 'Password konfirmasi tidak cocok.'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await api.post('/reset-password', form)
    toast.success('Password berhasil diubah. Silakan login.')
    router.push('/login')
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal mereset password.'
  } finally {
    loading.value = false
  }
}
</script>
