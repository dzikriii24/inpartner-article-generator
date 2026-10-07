<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-extrabold text-slate-900 mb-2">Buat Akun Baru</h1>
      <p class="text-slate-500">Daftar sekarang untuk mulai membeli dan membaca artikel premium.</p>
    </div>

    <div v-if="errorMessage" class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm font-medium mb-6 flex items-center gap-2">
      <Icon name="x-circle" size="sm" /> {{ errorMessage }}
    </div>

    <form @submit.prevent="handleRegister" class="space-y-5">
      <div>
        <label class="block text-sm font-bold text-slate-700 mb-1.5">Nama Lengkap</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon name="user" size="sm" />
          </div>
          <input 
            v-model="form.name" 
            type="text" 
            required
            class="input-field pl-10"
            placeholder="John Doe"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon name="mail" size="sm" />
          </div>
          <input 
            v-model="form.email" 
            type="email" 
            required
            class="input-field pl-10"
            placeholder="nama@email.com"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
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
        <label class="block text-sm font-bold text-slate-700 mb-1.5">Konfirmasi Password</label>
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
          <span v-else>Daftar Sekarang</span>
        </button>
      </div>
    </form>

    <div class="mt-8 text-center text-sm text-slate-500">
      Sudah punya akun? 
      <router-link to="/login" class="font-bold text-brand-600 hover:text-brand-700">Masuk disini</router-link>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../components/Toast'
import Icon from '../components/Icon.vue'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const form = reactive({ name: '', email: '', password: '', password_confirmation: '' })
const loading = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)

const handleRegister = async () => {
  if (form.password !== form.password_confirmation) {
    errorMessage.value = 'Password tidak cocok.'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await auth.register(form)
    toast.success('Pendaftaran berhasil! Silakan masuk.')
    router.push('/login')
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal mendaftar. Pastikan email belum digunakan.'
  } finally {
    loading.value = false
  }
}
</script>
