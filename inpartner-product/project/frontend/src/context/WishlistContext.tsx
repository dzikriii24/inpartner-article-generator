import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/services/api';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlistIds: number[];
  wishlistCount: number;
  loading: boolean;
  isWishlisted: (productId: number) => boolean;
  toggleWishlist: (productId: number) => Promise<boolean>;
  fetchWishlistIds: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem('local_wishlist');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  const fetchWishlistIds = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await api.get('/wishlist/ids');
      if (Array.isArray(res.data?.wishlist_ids)) {
        setWishlistIds(res.data.wishlist_ids);
        localStorage.setItem('local_wishlist', JSON.stringify(res.data.wishlist_ids));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlistIds();
    }
  }, [isAuthenticated]);

  const isWishlisted = (productId: number) => {
    return wishlistIds.includes(productId);
  };

  const toggleWishlist = async (productId: number): Promise<boolean> => {
    if (!isAuthenticated) {
      // Local fallback for guests
      let updated: number[];
      let added = false;
      if (wishlistIds.includes(productId)) {
        updated = wishlistIds.filter(id => id !== productId);
      } else {
        updated = [...wishlistIds, productId];
        added = true;
      }
      setWishlistIds(updated);
      localStorage.setItem('local_wishlist', JSON.stringify(updated));
      return added;
    }

    try {
      const res = await api.post(`/wishlist/toggle/${productId}`);
      const added = Boolean(res.data?.is_wishlisted);
      if (Array.isArray(res.data?.wishlist_ids)) {
        setWishlistIds(res.data.wishlist_ids);
        localStorage.setItem('local_wishlist', JSON.stringify(res.data.wishlist_ids));
      } else {
        fetchWishlistIds();
      }
      return added;
    } catch (e) {
      console.error('Failed to toggle wishlist', e);
      return false;
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistCount: wishlistIds.length,
        loading,
        isWishlisted,
        toggleWishlist,
        fetchWishlistIds,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

