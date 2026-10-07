<template>
  <div class="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
    <TransitionGroup name="toast">
      <div 
        v-for="t in toasts" 
        :key="t.id"
        :class="[
          'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl backdrop-blur-md min-w-[280px]',
          t.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200' :
          t.type === 'error' ? 'bg-rose-950/90 border-rose-500/40 text-rose-200' :
          'bg-slate-900/90 border-slate-700 text-slate-200'
        ]"
      >
        <span class="text-base">
          {{ t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ' }}
        </span>
        <div class="flex-1">{{ t.message }}</div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script>
import { ref } from 'vue'

const toasts = ref([])
let idCounter = 0

export const useToast = () => {
  const show = (message, type = 'info', duration = 3500) => {
    const id = ++idCounter
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }
  return {
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info')
  }
}

export default {
  setup() {
    return { toasts }
  }
}
</script>

<style scoped>
.toast-enter-active, .toast-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100px);
}
</style>
