<template>
  <div class="space-y-8">
    
    <!-- Top Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <span>🤖</span> Integrasi Article Generator
        </h1>
        <p class="text-slate-400 text-xs mt-1">Status koneksi dua arah antara platform Store & AI Article Generator</p>
      </div>

      <button 
        @click="triggerSync" 
        :disabled="syncing"
        class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 hover:brightness-110 shadow-lg shadow-amber-500/20 disabled:opacity-50"
      >
        <span :class="{'animate-spin': syncing}">🔄</span>
        <span>{{ syncing ? 'Memproses Pull Sync...' : 'Jalankan Manual Pull Sync' }}</span>
      </button>
    </div>

    <!-- Status Overview Card -->
    <div class="glass p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div class="flex items-center gap-4">
          <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl', info.connected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30']">
            {{ info.connected ? '✓' : '⚡' }}
          </div>

          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-bold text-white">Status Server Generator:</h3>
              <span :class="['px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border', info.connected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30']">
                {{ info.connected ? 'TERHUBUNG (CONNECTED)' : 'TERPUTUS / UNCONFIGURED' }}
              </span>
            </div>
            <p class="text-xs text-slate-400 font-mono mt-0.5">{{ info.generator_url || 'http://localhost:8000' }}</p>
          </div>
        </div>

        <button @click="fetchStatus" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700">
          Cek Ulang Koneksi
        </button>
      </div>

      <!-- Key Details & Webhook URL -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div class="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
          <div class="text-slate-400 font-semibold">Webhook Endpoint Receiver (Push to Store):</div>
          <div class="font-mono text-amber-400 font-bold select-all overflow-x-auto py-1">{{ info.webhook_url }}</div>
          <p class="text-[11px] text-slate-500">Menerima sinyal instan saat penulis menekan tombol "Push to Store" di editor.</p>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
          <div class="text-slate-400 font-semibold">Konfigurasi Default Import:</div>
          <div class="text-slate-200">
            Auto Sync: <strong class="text-emerald-400">{{ info.auto_sync ? 'Aktif' : 'Non-aktif' }}</strong> &bull; 
            Harga Bawaan: <strong class="text-amber-400 font-mono">{{ formatRupiah(info.default_price) }}</strong>
          </div>
          <p class="text-[11px] text-slate-500">Artikel yang masuk otomatis berstatus Draft dengan harga default sebelum dipublikasikan.</p>
        </div>
      </div>
    </div>

    <!-- Sync Statistics KPI Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="glass p-4 rounded-2xl border border-white/10 text-center space-y-1">
        <div class="text-xs text-slate-400 font-semibold">Total Diimpor</div>
        <div class="text-2xl font-extrabold text-white font-mono">{{ info.counts?.total || 0 }}</div>
      </div>

      <div class="glass p-4 rounded-2xl border border-white/10 text-center space-y-1">
        <div class="text-xs text-amber-400 font-semibold">Menunggu Set Harga (Draft)</div>
        <div class="text-2xl font-extrabold text-amber-400 font-mono">{{ info.counts?.draft || 0 }}</div>
      </div>

      <div class="glass p-4 rounded-2xl border border-white/10 text-center space-y-1">
        <div class="text-xs text-emerald-400 font-semibold">Telah Dipublikasi</div>
        <div class="text-2xl font-extrabold text-emerald-400 font-mono">{{ info.counts?.published || 0 }}</div>
      </div>

      <div class="glass p-4 rounded-2xl border border-white/10 text-center space-y-1">
        <div class="text-xs text-slate-400 font-semibold">Total Omzet Penjualan</div>
        <div class="text-2xl font-extrabold text-white font-mono">{{ info.counts?.sales || 0 }} pcs</div>
      </div>
    </div>

    <!-- Remote Articles Browser Section -->
    <div class="glass p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <span>🌐</span> Penjelajah Artikel Remote (Generator Engine)
          </h3>
          <p class="text-xs text-slate-400">Pilih & impor artikel yang diproduksi di Article Generator ke dalam Store secara manual</p>
        </div>

        <button @click="fetchRemote" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-700">
          Load Remote Articles
        </button>
      </div>

      <!-- Table of Remote Articles -->
      <div v-if="loadingRemote" class="py-12 text-center text-slate-400 text-xs">
        <span class="animate-spin inline-block text-xl">⚙</span> Mengambil daftar artikel dari server generator...
      </div>

      <div v-else-if="remoteArticles.length === 0" class="py-8 text-center text-slate-400 text-xs">
        Tekan tombol "Load Remote Articles" untuk menampilkan artikel yang dibuat di Article Generator.
      </div>

      <div v-else class="overflow-hidden rounded-2xl border border-white/10">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase border-b border-white/10">
            <tr>
              <th class="py-3 px-4">ID & Judul Generator</th>
              <th class="py-3 px-4">Status di Store</th>
              <th class="py-3 px-4 text-right">Aksi Impor</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="a in remoteArticles" :key="a.id" class="hover:bg-white/[0.02]">
              <td class="py-3 px-4">
                <div class="font-bold text-white">{{ a.title }}</div>
                <div class="text-[10px] text-slate-400 font-mono mt-0.5">Generator ID: #{{ a.id }} &bull; {{ a.word_count || 0 }} kata</div>
              </td>

              <td class="py-3 px-4">
                <span v-if="a.store" class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Impor #{{ a.store.product_id }} ({{ a.store.status }})
                </span>
                <span v-else class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400">
                  Belum Diimpor
                </span>
              </td>

              <td class="py-3 px-4 text-right">
                <button 
                  @click="importSingle(a.id)" 
                  :disabled="importingId === a.id"
                  class="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs disabled:opacity-50"
                >
                  {{ importingId === a.id ? 'Mengimpor...' : (a.store ? 'Re-Import' : 'Impor ke Store') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Sync Log History Table -->
    <div class="glass p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
      <h3 class="text-base font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
        <span>📜</span> Riwayat Log Sinkronisasi
      </h3>

      <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
        <div v-for="log in info.logs" :key="log.id" class="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs flex items-center justify-between">
          <div>
            <div class="font-bold text-white font-mono flex items-center gap-2">
              <span :class="['w-2 h-2 rounded-full', log.status === 'success' ? 'bg-emerald-400' : 'bg-rose-400']"></span>
              <span>Trigger: {{ log.triggered_by }}</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-0.5">Fetched: {{ log.items_fetched }} &bull; Processed: {{ log.items_processed }} &bull; Errors: {{ log.items_failed }}</div>
          </div>

          <div class="text-right text-[11px] font-mono text-slate-400">
            {{ formatDate(log.created_at) }}
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../services/api'
import { useToast } from '../../components/Toast'

const toast = useToast()

const info = ref({})
const remoteArticles = ref([])
const syncing = ref(false)
const loadingRemote = ref(false)
const importingId = ref(null)

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0)
const formatDate = (str) => str ? new Date(str).toLocaleString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

const fetchStatus = async () => {
  try {
    const res = await api.get('/admin/integration')
    info.value = res.data
  } catch (err) {
    toast.error('Gagal mengambil status integrasi.')
  }
}

const triggerSync = async () => {
  syncing.value = true
  try {
    const res = await api.post('/admin/integration/sync')
    toast.success(`Pull Sync selesai. Log ID: #${res.data.log?.id}`)
    fetchStatus()
  } catch (err) {
    toast.error('Gagal memproses sync.')
  } finally {
    syncing.value = false
  }
}

const fetchRemote = async () => {
  loadingRemote.value = true
  try {
    const res = await api.get('/admin/integration/remote')
    remoteArticles.value = res.data.data || []
  } catch (err) {
    toast.error('Gagal mengambil artikel remote.')
  } finally {
    loadingRemote.value = false
  }
}

const importSingle = async (id) => {
  importingId.value = id
  try {
    await api.post('/admin/integration/import', { ids: [id] })
    toast.success(`Artikel Generator #${id} berhasil diimpor ke store!`)
    fetchStatus()
    fetchRemote()
  } catch (err) {
    toast.error('Gagal mengimpor artikel.')
  } finally {
    importingId.value = null
  }
}

onMounted(() => {
  fetchStatus()
})
</script>
