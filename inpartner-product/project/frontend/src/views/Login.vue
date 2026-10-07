<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-extrabold text-slate-900 mb-2">Selamat Datang Kembali</h1>
      <p class="text-slate-500">Masuk untuk mengakses library dan melanjutkan membaca.</p>
    </div>

    <div v-if="errorMessage" class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm font-medium mb-6 flex items-center gap-2">
      <Icon name="x-circle" size="sm" /> {{ errorMessage }}
    </div>

    <form @submit.prevent="handleLogin" class="space-y-5">
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

    <!-- Quick Demo Login Hint -->
    <div class="mt-6 pt-6 border-t border-slate-100 text-center">
      <div class="text-xs font-medium text-slate-400 mb-2">Login Demo Cepat:</div>
      <div class="flex justify-center gap-2">
        <button @click="fillAdmin" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold transition-colors">Admin</button>
        <button @click="fillUser" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold transition-colors">Customer</button>
      </div>
    </div>

    <div class="mt-8 text-center text-sm text-slate-500">
      Belum punya akun? 
      <router-link to="/register" class="font-bold text-brand-600 hover:text-brand-700">Daftar sekarang</router-link>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../components/Toast'
import Icon from '../components/Icon.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const form = reactive({ email: '', password: '' })
const loading = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)

const fillAdmin = () => {
  form.email = 'admin@inpartner.id'
  form.password = 'admin12345'
}

const fillUser = () => {
  form.email = 'user@inpartner.id'
  form.password = 'user12345'
}

const handleLogin = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const user = await auth.login(form.email, form.password)
    toast.success(`Selamat datang kembali, ${user.name}!`)
    const redirect = route.query.redirect || (user.role === 'admin' ? '/admin' : '/')
    router.push(redirect)
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Email atau password salah. Silakan coba lagi.'
  } finally {
    loading.value = false
  }
}
</script>
