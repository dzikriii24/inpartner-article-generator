<template>
  <div class="relative w-full h-full overflow-hidden" :class="rounded">
    <img
      v-if="product.cover_url && !failed"
      :src="product.cover_url"
      :alt="product.title"
      loading="lazy"
      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      @error="failed = true"
    />

    <!-- Generated "book" cover -->
    <div
      v-else
      :class="['w-full h-full flex flex-col justify-between bg-gradient-to-br text-white relative', palette, compact ? 'p-2.5' : 'p-4']"
    >
      <!-- decorative shapes -->
      <div class="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/10"></div>
      <div class="absolute -left-8 bottom-6 w-24 h-24 rounded-full bg-white/10"></div>
      <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-black/10"></div>

      <span :class="['relative font-semibold uppercase tracking-widest opacity-80', compact ? 'text-[7px]' : 'text-[9px]']">
        {{ product.type_label || 'Artikel' }}
      </span>
      <h4 :class="['relative font-bold leading-tight line-clamp-4 text-white', compact ? 'text-[11px]' : 'text-base']">
        {{ product.title }}
      </h4>
      <span :class="['relative font-medium opacity-80 truncate', compact ? 'text-[7px]' : 'text-[10px]']">
        {{ product.author?.name || 'Inpartner' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  product: { type: Object, required: true },
  compact: { type: Boolean, default: false },
  rounded: { type: String, default: 'rounded-xl' }
})

const failed = ref(false)

// Blue-led palette with a few warm/green accents — intentionally no purple.
const PALETTES = [
  'from-brand-500 to-brand-800',
  'from-sky-400 to-brand-600',
  'from-cyan-500 to-blue-700',
  'from-emerald-500 to-teal-700',
  'from-slate-700 to-brand-900',
  'from-amber-400 to-orange-600',
  'from-blue-400 to-sky-700',
  'from-rose-400 to-red-600'
]

const palette = computed(() => {
  const seed = Number(props.product.id) || String(props.product.title || '').length
  return PALETTES[seed % PALETTES.length]
})
</script>
