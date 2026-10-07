<template>
  <div class="space-y-8">
    
    <!-- Header Title -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-extrabold text-white tracking-tight">Dashboard Ringkasan Store</h1>
        <p class="text-slate-400 text-xs mt-1">Status penjualan real-time & antrean draft artikel generator</p>
      </div>

      <router-link to="/admin/integration" class="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-2">
        <span>🤖</span> Artikel Sync Status
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-20 text-center">
      <div class="inline-block animate-spin text-amber-400 text-3xl mb-3">⚙</div>
      <p class="text-slate-400 text-xs">Memuat data dashboard...</p>
    </div>

    <div v-else class="space-y-8">
      
      <!-- Top Stat Cards (KPIs) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div class="glass p-5 rounded-2xl border border-white/10 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400 font-medium">Total Omzet Penjualan</span>
            <span class="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs">💰</span>
          </div>
          <div class="text-2xl font-extrabold text-white font-mono">{{ formatRupiah(stats.revenue) }}</div>
          <div class="text-[11px] text-emerald-400">Bulan Ini: {{ formatRupiah(stats.revenue_month) }}</div>
        </div>

        <div class="glass p-5 rounded-2xl border border-white/10 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400 font-medium">Transaksi Lunas</span>
            <span class="p-2 rounded-lg bg-amber-500/10 text-amber-400 text-xs">💳</span>
          </div>
          <div class="text-2xl font-extrabold text-white font-mono">{{ stats.paid_orders }} / {{ stats.orders }}</div>
          <div class="text-[11px] text-amber-400">Pending: {{ stats.pending_orders }} pesanan</div>
        </div>

        <div class="glass p-5 rounded-2xl border border-white/10 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400 font-medium">Total Artikel Publik</span>
            <span class="p-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs">📦</span>
          </div>
          <div class="text-2xl font-extrabold text-white font-mono">{{ stats.published_products }}</div>
          <div class="text-[11px] text-slate-400">Total di katalog: {{ stats.products }} item</div>
        </div>

        <div class="glass p-5 rounded-2xl border border-white/10 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400 font-medium">Draft Generator</span>
            <span class="p-2 rounded-lg bg-purple-500/10 text-purple-400 text-xs">🤖</span>
          </div>
          <div class="text-2xl font-extrabold text-white font-mono">{{ stats.generator_drafts }}</div>
          <div class="text-[11px] text-purple-300">Menunggu penetapan harga</div>
        </div>

      </div>

      <!-- Quick Action Alert for Generator Drafts -->
      <div v-if="awaitingReview.length > 0" class="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="text-2xl">⚡</div>
          <div>
            <h4 class="text-sm font-bold text-amber-400">Ada {{ awaitingReview.length }} Artikel Baru Diterima dari Generator!</h4>
            <p class="text-xs text-slate-300">Artikel baru otomatis tersimpan sebagai draft. Tentukan harga dan klik Publikasikan agar tampil di toko.</p>
          </div>
        </div>

        <router-link to="/admin/products?status=draft" class="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shrink-0 hover:bg-amber-300">
          Review Draft Sekarang →
        </router-link>
      </div>

      <!-- Content Grid: Recent Orders & Awaiting Review List -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <!-- Recent Orders Table -->
        <div class="glass p-6 rounded-3xl border border-white/10 space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <span>💳</span> Transaksi Terbaru
            </h3>
            <router-link to="/admin/orders" class="text-xs text-amber-400 hover:underline font-semibold">Lihat Semua →</router-link>
          </div>

          <div class="space-y-3">
            <div 
              v-for="o in recentOrders" 
              :key="o.id"
              class="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs"
            >
              <div>
                <div class="font-bold text-white font-mono">#{{ o.order_number }}</div>
                <div class="text-[11px] text-slate-400">{{ o.user?.name || 'Pelanggan' }} &bull; {{ formatDate(o.created_at) }}</div>
              </div>

              <div class="text-right">
                <div class="font-mono font-bold text-amber-400">{{ formatRupiah(o.total_amount) }}</div>
                <span :class="['text-[10px] font-bold uppercase', o.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400']">
                  {{ o.payment_status }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Awaiting Review Drafts -->
        <div class="glass p-6 rounded-3xl border border-white/10 space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <span>📥</span> Antrean Draft Generator
            </h3>
            <router-link to="/admin/products" class="text-xs text-amber-400 hover:underline font-semibold">Kelola Produk →</router-link>
          </div>

          <div v-if="awaitingReview.length === 0" class="py-8 text-center text-slate-400 text-xs">
            Belum ada draft artikel baru dari generator.
          </div>

          <div v-else class="space-y-3">
            <div 
              v-for="p in awaitingReview" 
              :key="p.id"
              class="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs"
            >
              <div class="min-w-0 flex-1 pr-4">
                <h4 class="font-bold text-white truncate">{{ p.title }}</h4>
                <div class="text-[11px] text-slate-400">{{ p.category?.name || 'Artikel' }} &bull; {{ p.reading_time_minutes || 5 }} min</div>
              </div>

              <router-link :to="`/admin/products/${p.id}/edit`" class="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 hover:bg-amber-300">
                Edit & Set Harga
              </router-link>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../services/api'

const stats = ref({})
const chart = ref([])
const recentOrders = ref([])
const awaitingReview = ref([])
const loading = ref(true)

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0)
const formatDate = (str) => str ? new Date(str).toLocaleString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

onMounted(async () => {
  try {
    const res = await api.get('/admin/dashboard')
    stats.value = res.data.stats || {}
    chart.value = res.data.chart || []
    recentOrders.value = res.data.recent_orders || []
    awaitingReview.value = res.data.awaiting_review || []
  } catch (err) {
    console.error('Fetch dashboard stats error:', err)
  } finally {
    loading.value = false
  }
})
</script>
