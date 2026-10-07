<template>
  <div class="space-y-6">
    
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-extrabold text-white tracking-tight">Manajemen Transaksi & Order</h1>
        <p class="text-slate-400 text-xs mt-1">Kelola transaksi, status pembayaran, dan penerbitan hak akses</p>
      </div>

      <a href="/api/admin/orders/export" target="_blank" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-xs font-bold flex items-center gap-2">
        <span>📥</span> Export CSV
      </a>
    </div>

    <!-- Table -->
    <div class="glass rounded-3xl border border-white/10 overflow-hidden">
      <table class="w-full text-left text-xs text-slate-300">
        <thead class="bg-slate-900/80 border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <tr>
            <th class="py-3.5 px-4">Invoice & Tanggal</th>
            <th class="py-3.5 px-4">Pembeli / User</th>
            <th class="py-3.5 px-4">Metode</th>
            <th class="py-3.5 px-4">Total</th>
            <th class="py-3.5 px-4">Status</th>
            <th class="py-3.5 px-4 text-right">Aksi Manual</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-white/5">
          <tr v-if="orders.length === 0">
            <td colspan="6" class="py-12 text-center text-slate-500">Belum ada transaksi.</td>
          </tr>

          <tr v-for="o in orders" :key="o.id" class="hover:bg-white/[0.02] transition-colors">
            <td class="py-3 px-4">
              <div class="font-bold text-white font-mono">#{{ o.order_number }}</div>
              <div class="text-[10px] text-slate-400 mt-0.5">{{ formatDate(o.created_at) }}</div>
            </td>

            <td class="py-3 px-4">
              <div class="font-semibold text-white">{{ o.user?.name || '-' }}</div>
              <div class="text-[10px] text-slate-400 font-mono">{{ o.user?.email }}</div>
            </td>

            <td class="py-3 px-4 font-mono text-slate-400 uppercase">
              {{ o.payment_provider || 'Direct' }}
            </td>

            <td class="py-3 px-4 font-mono font-bold text-amber-400">
              {{ formatRupiah(o.total_amount) }}
            </td>

            <td class="py-3 px-4">
              <span 
                :class="[
                  'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                  o.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                  o.payment_status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                  'bg-rose-500/10 text-rose-400 border-rose-500/30'
                ]"
              >
                {{ o.payment_status }}
              </span>
            </td>

            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button 
                  v-if="o.payment_status !== 'paid'"
                  @click="markPaid(o.id)" 
                  class="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30"
                >
                  ✓ Tandai Lunas
                </button>

                <button 
                  v-if="o.payment_status === 'paid'"
                  @click="refund(o.id)" 
                  class="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-[11px] border border-rose-500/30"
                >
                  Refund
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../services/api'
import { useToast } from '../../components/Toast'

const toast = useToast()
const orders = ref([])
const loading = ref(true)

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0)
const formatDate = (str) => str ? new Date(str).toLocaleString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await api.get('/admin/orders')
    orders.value = res.data.data || []
  } catch (err) {
    toast.error('Gagal memuat transaksi.')
  } finally {
    loading.value = false
  }
}

const markPaid = async (id) => {
  if (!confirm('Tandai transaksi ini sebagai LUNAS dan beri hak akses artikel ke pelanggan?')) return
  try {
    await api.post(`/admin/orders/${id}/mark-paid`)
    toast.success('Order ditandai lunas!')
    fetchOrders()
  } catch (err) {
    toast.error('Gagal mengubah status order.')
  }
}

const refund = async (id) => {
  if (!confirm('Refund transaksi ini dan cabut hak akses produk?')) return
  try {
    await api.post(`/admin/orders/${id}/refund`)
    toast.success('Order berhasil di-refund.')
    fetchOrders()
  } catch (err) {
    toast.error('Gagal memproses refund.')
  }
}

onMounted(() => {
  fetchOrders()
})
</script>
