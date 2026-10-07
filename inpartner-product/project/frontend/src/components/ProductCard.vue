<template>
  <div class="group flex flex-col h-full bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-brand-200 hover:-translate-y-1 transition-all duration-300">
    <!-- Cover -->
    <router-link
      :to="`/products/${product.slug}`"
      class="relative block aspect-[3/4] rounded-xl overflow-hidden shadow-sm bg-slate-100"
    >
      <BookCover :product="product" rounded="rounded-xl" />

      <span :class="['badge absolute top-2.5 left-2.5 shadow-sm font-bold', badgeClass(product.type)]">
        {{ product.type_label }}
      </span>

      <span v-if="product.is_owned" class="badge badge-success absolute top-2.5 right-2.5 shadow-sm font-bold">
        <Icon name="check" size="xs" :stroke="3" /> Dimiliki
      </span>
      <span v-else-if="product.discount_percent > 0" class="badge absolute top-2.5 right-2.5 bg-rose-500 text-white shadow-sm font-extrabold">
        -{{ product.discount_percent }}%
      </span>

      <!-- Hover quick action -->
      <div class="absolute inset-x-2.5 bottom-2.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
        <span class="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-white/95 backdrop-blur-md text-xs font-bold text-brand-700 shadow-md">
          <Icon name="eye" size="xs" /> Lihat Detail
        </span>
      </div>
    </router-link>

    <!-- Meta -->
    <div class="pt-3 flex flex-col flex-1 px-1">
      <router-link :to="`/products/${product.slug}`">
        <h3 class="text-sm font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
          {{ product.title }}
        </h3>
      </router-link>
      <p class="text-[11px] text-slate-400 mt-1 font-medium truncate">
        {{ product.author?.name || product.category?.name || 'Inpartner Editorial' }}<template v-if="product.published_at"> · {{ yearOf(product.published_at) }}</template>
      </p>

      <div class="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-slate-100/80">
        <div class="min-w-0">
          <span v-if="product.is_free" class="text-sm font-extrabold text-emerald-600">GRATIS</span>
          <template v-else>
            <span class="block text-sm font-extrabold text-brand-700 truncate">{{ formatRupiah(product.final_price) }}</span>
            <span v-if="product.discount_percent > 0" class="block text-[10px] text-slate-400 line-through -mt-0.5">{{ formatRupiah(product.price) }}</span>
          </template>
        </div>

        <router-link
          v-if="product.is_owned"
          :to="`/library/${product.slug}/read`"
          class="shrink-0 w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
          title="Baca Sekarang"
        >
          <Icon name="book-open" size="sm" />
        </router-link>
        <button
          v-else
          @click="$emit('add-cart', product)"
          class="shrink-0 w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center hover:bg-brand-600 hover:text-white hover:shadow-md hover:shadow-brand-500/25 transition-all"
          title="Tambah ke keranjang"
        >
          <Icon name="plus" size="sm" :stroke="2.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import Icon from './Icon.vue'
import BookCover from './BookCover.vue'
import { formatRupiah, yearOf } from '../utils/format'

defineProps({
  product: { type: Object, required: true }
})
defineEmits(['add-cart'])

const badgeClass = (type) => ({
  article: 'badge-article',
  ebook: 'badge-ebook',
  journal: 'badge-journal',
  research_paper: 'badge-research'
}[type] || 'badge-article')
</script>
