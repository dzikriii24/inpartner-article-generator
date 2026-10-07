<template>
  <footer class="bg-[#0b0e14] border-t border-white/10 mt-20 pt-16 pb-12 text-slate-400 text-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
        
        <!-- Brand Info -->
        <div class="md:col-span-1 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md">I</div>
            <span class="font-extrabold text-white text-lg tracking-tight">Inpartner<span class="text-brand-400">Store</span></span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Platform komersial produk digital & artikel berbasis riset terpercaya. Membantu profesional dan investor membuat keputusan berbasis data.
          </p>
        </div>

        <!-- Quick Links -->
        <div>
          <h4 class="text-white font-semibold text-xs uppercase tracking-wider mb-4">Navigasi</h4>
          <ul class="space-y-2 text-xs">
            <li><router-link to="/" class="hover:text-white transition-colors">Beranda</router-link></li>
            <li><router-link to="/products" class="hover:text-white transition-colors">Katalog Produk</router-link></li>
            <li><router-link to="/products?price=free" class="hover:text-white transition-colors">Riset Gratis</router-link></li>
            <li><router-link to="/library" class="hover:text-white transition-colors">Library Saya</router-link></li>
          </ul>
        </div>

        <!-- Product Types -->
        <div>
          <h4 class="text-white font-semibold text-xs uppercase tracking-wider mb-4">Jenis Produk</h4>
          <ul class="space-y-2 text-xs">
            <li><router-link to="/products?type=article" class="hover:text-white transition-colors">Artikel Premium</router-link></li>
            <li><router-link to="/products?type=ebook" class="hover:text-white transition-colors">Ebook Digital</router-link></li>
            <li><router-link to="/products?type=journal" class="hover:text-white transition-colors">Jurnal Publikasi</router-link></li>
            <li><router-link to="/products?type=research_paper" class="hover:text-white transition-colors">Paper Riset</router-link></li>
          </ul>
        </div>

        <!-- Security & Payment Info -->
        <div class="space-y-4">
          <h4 class="text-white font-semibold text-xs uppercase tracking-wider">Pembayaran Aman</h4>
          <p class="text-xs text-slate-400">
            Didukung oleh Midtrans Snap Payment Gateway & SSL Encryption.
          </p>
          <div class="flex flex-wrap gap-2 text-[10px] text-slate-500 font-mono">
            <span class="px-2 py-1 bg-slate-900 border border-white/10 rounded">BCA</span>
            <span class="px-2 py-1 bg-slate-900 border border-white/10 rounded">Mandiri</span>
            <span class="px-2 py-1 bg-slate-900 border border-white/10 rounded">BNI</span>
            <span class="px-2 py-1 bg-slate-900 border border-white/10 rounded">QRIS</span>
            <span class="px-2 py-1 bg-slate-900 border border-white/10 rounded">GoPay</span>
          </div>
        </div>

      </div>

      <!-- Bottom Bar -->
      <div class="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>&copy; 2026 Inpartner Digital Platform. All rights reserved.</p>
        <div class="flex items-center gap-6">
          <a href="#" class="hover:text-slate-400">Syarat & Ketentuan</a>
          <a href="#" class="hover:text-slate-400">Kebijakan Privasi</a>
          <a href="#" class="hover:text-slate-400">Bantuan & FAQ</a>
        </div>
      </div>
    </div>
  </footer>
</template>
