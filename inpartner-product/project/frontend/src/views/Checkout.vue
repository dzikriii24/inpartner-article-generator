<template>
  <div class="max-w-7xl mx-auto space-y-8">
    <!-- Title -->
    <div>
      <h1 class="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Konfirmasi & Pembayaran</h1>
      <p class="text-slate-500 text-sm mt-1">Lengkapi data untuk memproses pesanan artikel Anda</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-20 text-center">
      <Icon name="refresh" class="animate-spin text-brand-500 mx-auto w-8 h-8 mb-3" />
      <p class="text-slate-500 text-sm">Menyiapkan checkout...</p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      
      <!-- Customer Info & Form -->
      <div class="lg:col-span-2 space-y-6">
        <div class="card p-6 sm:p-8 space-y-6">
          <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4">
            <Icon name="user" size="sm" class="text-brand-600" /> Informasi Pembeli
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
              <div class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm font-medium">
                {{ auth.user?.name }}
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Akses</label>
              <div class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm font-medium">
                {{ auth.user?.email }}
              </div>
            </div>

            <div class="md:col-span-2 mt-2">
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Nomor Handphone / WhatsApp (Opsional)</label>
              <input 
                v-model="phone" 
                type="tel" 
                placeholder="08123456789"
                class="input-field"
              />
              <p class="text-[11px] text-slate-400 mt-1">Digunakan untuk notifikasi bukti transaksi & update status.</p>
            </div>
          </div>
        </div>

        <!-- Payment Mode Info -->
        <div class="card p-6 border-leaf-100 shadow-sm">
          <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Icon name="shield" size="sm" class="text-leaf-600" /> Metode Pembayaran
          </h2>
          <div class="p-4 rounded-xl bg-leaf-50 border border-leaf-200 flex items-start gap-4">
            <div class="text-leaf-500 bg-white p-2 rounded-lg shadow-sm">
              <Icon name="bolt" size="md" />
            </div>
            <div class="text-xs text-leaf-800 space-y-1">
              <div class="font-bold text-leaf-700 text-sm">Automated Gateways & Simulator</div>
              <p>Mendukung Midtrans Snap (QRIS, Transfer Bank, GoPay) & Payment Simulator Offline untuk kemudahan pengujian.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Order Summary Card -->
      <div class="lg:col-span-1">
        <div class="card p-6 sticky top-24 shadow-lg shadow-brand-900/5 border-brand-100">
          <h2 class="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">Rincian Item</h2>

          <!-- Items Mini List -->
          <div class="space-y-4 max-h-60 overflow-y-auto pr-2 mb-4">
            <div v-for="item in cart.items" :key="item.id" class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-50 border border-slate-100">
                <img 
                  v-if="item.product?.cover_url"
                  :src="item.product.cover_url" 
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                  <Icon name="document" size="xs" />
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="text-xs font-bold text-slate-700 truncate">{{ item.product?.title }}</h4>
                <div class="text-[11px] text-brand-600 font-bold mt-0.5">{{ formatRupiah(item.price) }}</div>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-100 pt-4 space-y-2 text-sm">
            <div class="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span class="font-medium text-slate-700">{{ formatRupiah(cart.total) }}</span>
            </div>
            <div class="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center">
              <span class="font-bold text-slate-800">Total Tagihan</span>
              <span class="font-extrabold text-brand-700 text-lg">{{ formatRupiah(cart.total) }}</span>
            </div>
          </div>

          <button 
            @click="processCheckout"
            :disabled="processing"
            class="btn btn-primary w-full mt-6 shadow-md shadow-brand-500/20"
          >
            <Icon v-if="processing" name="refresh" class="animate-spin" />
            <span v-else>Bayar Sekarang &rarr;</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import api from '../services/api'
import { useToast } from '../components/Toast.vue'
import Icon from '../components/Icon.vue'
import { formatRupiah } from '../utils/format'

const auth = useAuthStore()
const cart = useCartStore()
const router = useRouter()
const toast = useToast()

const phone = ref('')
const loading = ref(false)
const processing = ref(false)

onMounted(async () => {
  loading.value = true
  if (auth.user?.phone) phone.value = auth.user.phone
  await cart.fetchCart()
  loading.value = false

  if (cart.items.length === 0) {
    toast.info('Keranjang Anda kosong.')
    router.push('/cart')
  }
})

const processCheckout = async () => {
  processing.value = true
  try {
    // We send phone as array of product IDs inside checkout endpoint (wait, API checkout uses product_ids?)
    // Ah, wait. Looking at the old checkout: it sends { phone: phone.value }.
    // BUT in ProductDetail, buyNow sends { product_ids: [id] }. 
    // In Cart.vue I changed checkout to send { product_ids: cart.items.map(i=>i.product_id) }.
    // Let's stick to what Cart.vue does if the backend expects product_ids.
    // Or if backend creates checkout from cart implicitly, let's pass product_ids to be safe.
    
    const product_ids = cart.items.map(i => i.product_id)
    const res = await api.post('/checkout', { phone: phone.value, product_ids })
    const { order, payment } = res.data

    await cart.fetchCart() // Refresh cart after checkout

    toast.success(`Order #${order.order_number} berhasil dibuat!`)

    // Check payment mode
    if (payment.provider === 'simulator' || !payment.token) {
      router.push(`/payment/simulator/${order.order_number}`)
    } else if (window.snap && payment.token) {
      window.snap.pay(payment.token, {
        onSuccess: () => router.push(`/orders/${order.order_number}`),
        onPending: () => router.push(`/orders/${order.order_number}`),
        onError: () => router.push(`/orders/${order.order_number}`),
        onClose: () => router.push(`/orders/${order.order_number}`)
      })
    } else {
      router.push(`/orders/${order.order_number}`)
    }
  } catch (err) {
    toast.error(err.response?.data?.message || 'Gagal memproses pesanan.')
  } finally {
    processing.value = false
  }
}
</script>
