<template>
  <div>
    <div class="mb-8">
      <router-link to="/login" class="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-brand-600 mb-6 transition-colors">
        <Icon name="chevron-right" class="rotate-180 mr-1" size="xs" /> Kembali ke Login
      </router-link>
      <h1 class="text-3xl font-extrabold text-slate-900 mb-2">Lupa Password?</h1>
      <p class="text-slate-500">Masukkan email Anda dan kami akan mengirimkan tautan untuk mengatur ulang kata sandi.</p>
    </div>

    <div v-if="errorMessage" class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm font-medium mb-6 flex items-center gap-2">
      <Icon name="x-circle" size="sm" /> {{ errorMessage }}
    </div>

    <div v-if="successMessage" class="p-6 rounded-2xl bg-leaf-50 border border-leaf-200 text-leaf-800 text-center mb-6">
      <Icon name="check-circle" size="xl" class="mx-auto mb-3 text-leaf-500" />
      <h3 class="font-bold text-lg mb-1">Email Terkirim!</h3>
      <p class="text-sm opacity-80">{{ successMessage }}</p>
    </div>

    <form v-else @submit.prevent="handleForgot" class="space-y-5">
      <div>
        <label class="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon name="mail" size="sm" />
          </div>
          <input 
            v-model="email" 
            type="email" 
            required
            class="input-field pl-10"
            placeholder="nama@email.com"
          />
        </div>
      </div>

      <div class="pt-2">
        <button type="submit" :disabled="loading" class="btn btn-primary w-full py-3 text-base shadow-md shadow-brand-500/20">
          <Icon v-if="loading" name="refresh" class="animate-spin" />
          <span v-else>Kirim Tautan Reset</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '../services/api'
import Icon from '../components/Icon.vue'

const email = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const handleForgot = async () => {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const res = await api.post('/forgot-password', { email: email.value })
    successMessage.value = res.data.message || 'Silakan cek kotak masuk email Anda.'
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal memproses permintaan.'
  } finally {
    loading.value = false
  }
}
</script>
