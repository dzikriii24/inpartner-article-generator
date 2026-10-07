<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div class="flex items-center gap-3 border-b border-slate-100 pb-4">
      <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
        <Icon name="cart" size="md" />
      </div>
      <div>
        <h1 class="text-xl font-bold text-slate-800">Keranjang Belanja</h1>
        <p class="text-xs text-slate-500">Selesaikan pembelian untuk membaca konten selengkapnya.</p>
      </div>
    </div>

    <div v-if="cart.loading" class="text-center py-16 text-slate-400">
      <Icon name="refresh" class="w-8 h-8 mx-auto animate-spin mb-4 text-brand-500" />
      <p class="text-sm font-medium">Memuat keranjang...</p>
    </div>

    <div v-else-if="cart.items.length === 0" class="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
      <div class="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-5">
        <Icon name="cart" size="xl" />
      </div>
      <h3 class="text-lg font-bold text-slate-800 mb-2">Keranjang Anda Kosong</h3>
      <p class="text-sm text-slate-500 mb-6 max-w-sm mx-auto">Anda belum menambahkan produk apapun ke keranjang. Jelajahi katalog kami untuk menemukan bacaan menarik.</p>
      <router-link to="/products" class="btn btn-primary px-8">Cari Artikel &rarr;</router-link>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      
      <!-- Cart Items -->
      <div class="space-y-4">
        <div 
          v-for="item in cart.items" 
          :key="item.id" 
          class="card p-4 flex gap-4 items-start group"
        >
          <!-- Thumb -->
          <div class="w-20 sm:w-24 shrink-0 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
            <BookCover :product="item.product" class="w-full" />
          </div>
          
          <!-- Details -->
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start gap-4">
              <div>
                <router-link :to="`/product/${item.product.slug}`" class="text-sm sm:text-base font-bold text-slate-800 hover:text-brand-600 truncate-2-lines leading-snug mb-1">
                  {{ item.product.title }}
                </router-link>
                <div v-if="item.product.author" class="text-[11px] text-slate-500 font-medium mb-3">
                  Oleh {{ item.product.author.name }}
                </div>
              </div>
              <button 
                @click="removeFromCart(item.id)" 
                class="text-slate-300 hover:text-rose-500 p-1.5 -mr-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                title="Hapus"
              >
                <Icon name="trash" size="sm" />
              </button>
            </div>
            
            <div class="flex items-end justify-between mt-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                {{ item.product.type_label }}
              </span>
              <div class="text-right">
                <div v-if="item.product.discount_percent > 0" class="text-[11px] text-slate-400 line-through mb-0.5">
                  {{ formatRupiah(item.product.price) }}
                </div>
                <div class="text-base font-extrabold text-brand-700">
                  {{ formatRupiah(item.price) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="card p-5 sticky top-24 bg-slate-50 border-brand-100 shadow-lg shadow-brand-900/5">
        <h3 class="text-sm font-bold text-slate-800 mb-4 pb-3 border-b border-slate-200">Ringkasan Belanja</h3>
        
        <div class="space-y-3 mb-5 text-sm text-slate-600">
          <div class="flex justify-between">
            <span>Total Item</span>
            <span class="font-medium text-slate-800">{{ cart.items.length }}</span>
          </div>
          <div class="flex justify-between">
            <span>Subtotal</span>
            <span class="font-medium text-slate-800">{{ formatRupiah(cart.total) }}</span>
          </div>
          <!-- Bisa tambah PPN/Kode Promo disini kedepannya -->
        </div>

        <div class="pt-4 border-t border-slate-200 mb-6">
          <div class="flex justify-between items-center mb-1">
            <span class="text-base font-bold text-slate-800">Total Harga</span>
            <span class="text-lg font-extrabold text-brand-700">{{ formatRupiah(cart.total) }}</span>
          </div>
        </div>

        <button 
          @click="checkout" 
          :disabled="submitting" 
          class="btn btn-primary w-full shadow-md shadow-brand-500/20"
        >
          <Icon v-if="!submitting" name="lock" size="sm" />
          {{ submitting ? 'Memproses...' : 'Lanjut ke Pembayaran' }}
        </button>
        <p class="text-[10px] text-slate-400 text-center mt-3 flex items-center justify-center gap-1">
          <Icon name="shield" size="xs" /> Keamanan Terjamin 100%
        </p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { useCartStore } from '../stores/cart'
import { useToast } from '../components/Toast.vue'
import BookCover from '../components/BookCover.vue'
import Icon from '../components/Icon.vue'
import { formatRupiah } from '../utils/format'

const router = useRouter()
const cart = useCartStore()
const toast = useToast()
const submitting = ref(false)

const removeFromCart = async (itemId) => {
  if (confirm('Hapus item ini dari keranjang?')) {
    try {
      await cart.removeFromCart(itemId)
      toast.success('Item dihapus.')
    } catch (err) {
      toast.error('Gagal menghapus item.')
    }
  }
}

const checkout = async () => {
  if (cart.items.length === 0) return
  submitting.value = true
  try {
    const product_ids = cart.items.map(i => i.product_id)
    const res = await api.post('/checkout', { product_ids })
    await cart.fetchCart() // Refresh
    toast.success('Pesanan berhasil dibuat!')
    router.push({ name: 'OrderDetail', params: { number: res.data.order.order_number } })
  } catch (err) {
    toast.error(err.response?.data?.message || 'Gagal checkout.')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  cart.fetchCart()
})
</script>
