import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import Home from '../views/Home.vue'
import Products from '../views/Products.vue'
import ProductDetail from '../views/ProductDetail.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import ForgotPassword from '../views/ForgotPassword.vue'
import ResetPassword from '../views/ResetPassword.vue'
import Cart from '../views/Cart.vue'
import Checkout from '../views/Checkout.vue'
import OrderDetail from '../views/OrderDetail.vue'
import Simulator from '../views/Simulator.vue'
import Library from '../views/Library.vue'
import Reader from '../views/Reader.vue'
import Profile from '../views/Profile.vue'

import AdminLayout from '../components/admin/AdminLayout.vue'
import AdminDashboard from '../views/admin/AdminDashboard.vue'
import AdminProducts from '../views/admin/AdminProducts.vue'
import AdminProductForm from '../views/admin/AdminProductForm.vue'
import AdminCategories from '../views/admin/AdminCategories.vue'
import AdminAuthors from '../views/admin/AdminAuthors.vue'
import AdminBanners from '../views/admin/AdminBanners.vue'
import AdminOrders from '../views/admin/AdminOrders.vue'
import AdminUsers from '../views/admin/AdminUsers.vue'
import AdminIntegration from '../views/admin/AdminIntegration.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/products', name: 'Products', component: Products },
  { path: '/products/:slug', name: 'ProductDetail', component: ProductDetail },
  { path: '/login', name: 'Login', component: Login, meta: { guestOnly: true, layout: 'auth' } },
  { path: '/register', name: 'Register', component: Register, meta: { guestOnly: true, layout: 'auth' } },
  { path: '/forgot-password', name: 'ForgotPassword', component: ForgotPassword, meta: { guestOnly: true, layout: 'auth' } },
  { path: '/reset-password', name: 'ResetPassword', component: ResetPassword, meta: { layout: 'auth' } },
  
  { path: '/cart', name: 'Cart', component: Cart, meta: { requiresAuth: true } },
  { path: '/checkout', name: 'Checkout', component: Checkout, meta: { requiresAuth: true } },
  { path: '/orders/:number', name: 'OrderDetail', component: OrderDetail, meta: { requiresAuth: true } },
  { path: '/payment/simulator/:number', name: 'Simulator', component: Simulator, meta: { requiresAuth: true } },
  { path: '/library', name: 'Library', component: Library, meta: { requiresAuth: true } },
  { path: '/library/:slug/read', name: 'Reader', component: Reader, meta: { requiresAuth: true, layout: 'bare' } },
  { path: '/profile', name: 'Profile', component: Profile, meta: { requiresAuth: true } },

  // Admin Portal Routes
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', name: 'AdminDashboard', component: AdminDashboard },
      { path: 'products', name: 'AdminProducts', component: AdminProducts },
      { path: 'products/create', name: 'AdminProductCreate', component: AdminProductForm },
      { path: 'products/:id/edit', name: 'AdminProductEdit', component: AdminProductForm },
      { path: 'categories', name: 'AdminCategories', component: AdminCategories },
      { path: 'authors', name: 'AdminAuthors', component: AdminAuthors },
      { path: 'banners', name: 'AdminBanners', component: AdminBanners },
      { path: 'orders', name: 'AdminOrders', component: AdminOrders },
      { path: 'users', name: 'AdminUsers', component: AdminUsers },
      { path: 'integration', name: 'AdminIntegration', component: AdminIntegration }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  if (!auth.initialized) {
    await auth.fetchMe()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return next({ name: 'Home' })
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return next({ name: 'Home' })
  }

  next()
})

export default router
