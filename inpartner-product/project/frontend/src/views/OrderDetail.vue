<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div v-if="loading" class="text-center py-20 text-slate-400">
      <Icon name="refresh" class="w-8 h-8 mx-auto animate-spin mb-4 text-brand-500" />
      <p class="text-sm font-medium">Memuat pesanan...</p>
    </div>

    <div v-else-if="order" class="space-y-6">
      <!-- Status Banner -->
      <div 
        class="rounded-2xl p-6 text-center border shadow-sm"
        :class="{
          'bg-leaf-50 border-leaf-200 text-leaf-800': order.status === 'success',
          'bg-amber-50 border-amber-200 text-amber-800': order.status === 'pending',
          'bg-rose-50 border-rose-200 text-rose-800': ['failed', 'expired', 'canceled'].includes(order.status)
        }"
      >
        <div class="w-16 h-16 mx-auto rounded-full mb-4 flex items-center justify-center bg-white shadow-sm">
          <Icon v-if="order.status === 'success'" name="check-circle" size="xl" class="text-leaf-500" />
          <Icon v-else-if="order.status === 'pending'" name="clock" size="xl" class="text-amber-500" />
          <Icon v-else name="x-circle" size="xl" class="text-rose-500" />
        </div>
        <h1 class="text-2xl font-extrabold mb-1">
          {{ 
            order.status === 'success' ? 'Pembayaran Berhasil!' : 
            order.status === 'pending' ? 'Menunggu Pembayaran' : 
            'Pesanan Dibatalkan' 
          }}
        </h1>
        <p class="text-sm opacity-80 mb-5">Order #{{ order.order_number }}</p>

        <div v-if="order.status === 'pending'" class="flex justify-center gap-3">
          <button @click="payNow" class="btn btn-primary shadow-md shadow-brand-500/20 px-8">
            Bayar Sekarang
          </button>
        </div>
        <div v-if="order.status === 'success'" class="flex justify-center gap-3">
          <router-link to="/library" class="btn btn-leaf shadow-md shadow-leaf-500/20 px-8">
            Ke Library Saya &rarr;
          </router-link>
        </div>
      </div>

      <!-- Order Summary -->
      <div class="card p-6">
        <h3 class="text-lg font-bold text-slate-800 mb-4 pb-4 border-b border-slate-100 flex items-center justify-between">
          <span>Ringkasan Pesanan</span>
          <span class="text-sm font-semibold text-brand-600">{{ formatRupiah(order.total_amount) }}</span>
        </h3>
        
        <div class="space-y-4">
          <div v-for="item in order.items" :key="item.id" class="flex gap-4 items-start">
            <div class="w-16 shrink-0 bg-slate-50 border border-slate-100 rounded overflow-hidden">
               <img v-if="item.product.cover_url" :src="item.product.cover_url" class="w-full object-cover aspect-[3/4]" />
               <div v-else class="w-full aspect-[3/4] bg-slate-200 flex items-center justify-center">
                 <Icon name="document" size="sm" class="text-slate-400" />
               </div>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-bold text-slate-800 truncate-2-lines mb-1">{{ item.product_name || item.product?.title }}</h4>
              <div class="text-[11px] text-slate-500 uppercase font-semibold mb-2">{{ item.product_type || item.product?.type }}</div>
              <div class="text-sm font-bold text-brand-600">{{ formatRupiah(item.price) }}</div>
            </div>
          </div>
        </div>
        
        <div class="mt-6 pt-4 border-t border-slate-100 text-sm text-slate-500">
          <div class="flex justify-between mb-1">
            <span>Tanggal Pesanan</span>
            <span class="font-medium text-slate-700">{{ new Date(order.created_at).toLocaleString('id-ID') }}</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import { useToast } from '../components/Toast.vue'
import Icon from '../components/Icon.vue'
import { formatRupiah } from '../utils/format'

const route = useRoute()
const toast = useToast()

const order = ref(null)
const loading = ref(true)

const fetchOrder = async () => {
  loading.value = true
  try {
    const res = await api.get(`/orders/${route.params.number}`)
    order.value = res.data.order
  } catch (err) {
    toast.error('Gagal memuat detail pesanan.')
  } finally {
    loading.value = false
  }
}

const payNow = () => {
  if (order.value && order.value.payment_url) {
    window.location.href = order.value.payment_url
  } else {
    toast.error('URL Pembayaran tidak tersedia.')
  }
}

onMounted(fetchOrder)
</script>
