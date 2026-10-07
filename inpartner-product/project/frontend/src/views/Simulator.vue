<template>
  <div class="max-w-xl mx-auto space-y-6 pt-10">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-50 text-brand-600 mb-4 shadow-sm">
        <Icon name="bolt" size="xl" />
      </div>
      <h1 class="text-2xl font-extrabold text-slate-800">Simulator Pembayaran</h1>
      <p class="text-slate-500 text-sm mt-2">Gunakan ini untuk mensimulasikan pembayaran yang berhasil di Midtrans pada local environment.</p>
    </div>

    <div class="card p-6 border-brand-100 shadow-lg shadow-brand-500/5">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-1.5">Order Number</label>
          <input type="text" :value="orderNumber" disabled class="input-field bg-slate-50 text-slate-600 font-mono text-sm" />
        </div>

        <button @click="simulateSuccess" :disabled="loading" class="btn btn-leaf w-full py-3 shadow-md shadow-leaf-500/20">
          <Icon v-if="loading" name="refresh" class="animate-spin" />
          <span v-else>Simulasikan Pembayaran Berhasil</span>
        </button>

        <button @click="back" :disabled="loading" class="btn btn-outline w-full py-3">
          Kembali ke Detail Order
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { useToast } from '../components/Toast.vue'
import Icon from '../components/Icon.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const orderNumber = ref(route.params.number)
const loading = ref(false)

const simulateSuccess = async () => {
  loading.value = true
  try {
    await api.post(`/orders/${orderNumber.value}/simulate-payment`)
    toast.success('Pembayaran berhasil disimulasikan!')
    router.push(`/orders/${orderNumber.value}`)
  } catch (err) {
    toast.error('Gagal mensimulasikan pembayaran.')
  } finally {
    loading.value = false
  }
}

const back = () => {
  router.push(`/orders/${orderNumber.value}`)
}
</script>
