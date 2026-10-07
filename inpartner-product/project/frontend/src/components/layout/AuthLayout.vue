<template>
  <div class="relative min-h-screen bg-canvas overflow-x-clip flex items-center justify-center p-4 sm:p-8">
    <div class="pointer-events-none absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full bg-brand-200/60 blur-3xl"></div>
    <div class="pointer-events-none absolute -bottom-40 -left-32 w-[460px] h-[460px] rounded-full bg-sky-200/50 blur-3xl"></div>

    <div class="relative w-full max-w-5xl grid lg:grid-cols-2 bg-white rounded-[2.25rem] shadow-shell overflow-hidden animate-fade-up">
      <!-- Brand panel -->
      <div class="relative hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-white overflow-hidden">
        <svg class="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 400 600" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 120 C 120 60, 260 180, 400 100 L400 0 L0 0 Z" fill="white" />
          <path d="M0 600 C 140 520, 260 620, 400 540 L400 600 Z" fill="white" />
        </svg>

        <router-link to="/" class="relative flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Icon name="book-open" size="md" :stroke="2" />
          </div>
          <span class="font-bold text-lg">Inpartner<span class="text-brand-200">Store</span></span>
        </router-link>

        <img :src="hero" alt="" class="relative w-full max-w-[320px] mx-auto my-6 animate-float drop-shadow-2xl" />

        <div class="relative">
          <h2 class="text-2xl font-bold text-white leading-snug">Riset & artikel premium,<br />siap dibaca kapan saja.</h2>
          <p class="mt-2 text-sm text-brand-100/90">Beli sekali, akses selamanya dari Library kamu.</p>
        </div>
      </div>

      <!-- Form slot -->
      <div class="p-7 sm:p-12 flex flex-col justify-center">
        <router-link to="/" class="lg:hidden flex items-center gap-2 mb-8 text-sm font-bold text-slate-800">
          <span class="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center"><Icon name="book-open" size="sm" /></span>
          Inpartner<span class="text-brand-600 -ml-2">Store</span>
        </router-link>
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import Icon from '../Icon.vue'
import hero from '../../assets/hero-reader.png'
</script>
