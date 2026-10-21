import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CatalogProvider } from './context/CatalogContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

import Home from './views/Home';
import Products from './views/Products';
import ProductDetail from './views/ProductDetail';
import Login from './views/Login';
import Register from './views/Register';
import ForgotPassword from './views/ForgotPassword';
import ResetPassword from './views/ResetPassword';
import Cart from './views/Cart';
import Checkout from './views/Checkout';
import OrderDetail from './views/OrderDetail';
import Library from './views/Library';
import Reader from './views/Reader';
import Profile from './views/Profile';
import Simulator from './views/Simulator';

const StoreLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const isBareLayout = location.pathname.includes('/read');

  if (isBareLayout) {
    return (
      <Routes>
        <Route path="/library/:slug/read" element={<Reader />} />
      </Routes>
    );
  }

  return (
    <StoreLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders/:number" element={<OrderDetail />} />
        <Route path="/payment/simulator/:number" element={<Simulator />} />
        <Route path="/library" element={<Library />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </StoreLayout>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CatalogProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </CatalogProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
