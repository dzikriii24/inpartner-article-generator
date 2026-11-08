import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { CartProvider } from './context/CartContext';
import { CatalogProvider } from './context/CatalogContext';
import { WishlistProvider } from './context/WishlistContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import QuickCartDrawer from './components/QuickCartDrawer';

import Home from './views/Home';
import Products from './views/Products';
import ProductDetail from './views/ProductDetail';
import ThematicResearch from './views/ThematicResearch';
import SectorInsights from './views/SectorInsights';
import CustomAnalysis from './views/CustomAnalysis';
import DocumentWorkspace from './views/DocumentWorkspace';
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
import Wishlist from './views/Wishlist';
import Admin from './views/Admin';

const StoreLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#334155] font-sans selection:bg-[#D1E4F6] selection:text-[#0C3B69]">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      <Footer />
      <QuickCartDrawer />
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const isBareLayout = location.pathname.includes('/read');
  const isAdminLayout = location.pathname.startsWith('/admin');

  if (isBareLayout) {
    return (
      <Routes>
        <Route path="/library/:slug/read" element={<Reader />} />
      </Routes>
    );
  }

  if (isAdminLayout) {
    return (
      <Routes>
        <Route path="/admin" element={<Admin />} />
      </Routes>
    );
  }

  return (
    <StoreLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/thematic-research" element={<ThematicResearch />} />
        <Route path="/sector-insights" element={<SectorInsights />} />
        <Route path="/custom-analysis" element={<CustomAnalysis />} />
        <Route path="/workspace/editor" element={<DocumentWorkspace />} />
        <Route path="/workspace/merge" element={<DocumentWorkspace />} />
        <Route path="/wishlist" element={<Wishlist />} />
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
      <LanguageProvider>
        <AuthProvider>
          <CatalogProvider>
            <CartProvider>
              <WishlistProvider>
                <AppRoutes />
              </WishlistProvider>
            </CartProvider>
          </CatalogProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
};

export default App;
