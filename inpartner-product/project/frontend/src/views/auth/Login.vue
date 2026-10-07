<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-extrabold text-slate-900 mb-2">Selamat Datang Kembali</h1>
      <p class="text-slate-500">Masuk untuk mengakses library dan melanjutkan membaca.</p>
    </div>

    <form @submit.prevent="handleLogin" class="space-y-5">
      <div>
        <label class="block text-sm font-bold text-slate-700 mb-1.5">Email</label>
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
        <div class="flex justify-between items-center mb-1.5">
          <label class="block text-sm font-bold text-slate-700">Password</label>
          <router-link to="/forgot-password" class="text-xs font-semibold text-brand-600 hover:text-brand-700">
            Lupa password?
          </router-link>
        </div>
        <div class="relative">
           <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon name="lock" size="sm" />
          </div>
          <input 
            v-model="form.password" 
            :type="showPassword ? 'text' : 'password'" 
            required
            class="input-field pl-10 pr-10"
            placeholder="••••••••"
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

      <div class="pt-2">
        <button type="submit" :disabled="loading" class="btn btn-primary w-full py-3 text-base shadow-md shadow-brand-500/20">
          <Icon v-if="loading" name="refresh" class="animate-spin" />
          <span v-else>Masuk ke Akun</span>
        </button>
      </div>
    </form>

    <div class="mt-8 text-center text-sm text-slate-500">
      Belum punya akun? 
      <router-link to="/register" class="font-bold text-brand-600 hover:text-brand-700">Daftar sekarang</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../components/Toast.vue'
import Icon from '../components/Icon.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const toast = useToast()

const loading = ref(false)
const showPassword = ref(false)
const form = ref({
  email: '',
  password: ''
})

const handleLogin = async () => {
  loading.value = true
  try {
    await auth.login(form.value)
    toast.success('Berhasil login.')
    const redirect = route.query.redirect || '/library'
    router.push(redirect)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Login gagal. Periksa kembali kredensial Anda.')
  } finally {
    loading.value = false
  }
}
</script>
