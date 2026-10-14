import React, { ReactNode } from 'react';
import { AppProviders } from './AppProviders';
import { useStore } from './useStore';
import { useUI, UIProvider } from './UIContext';
import { useAuth, AuthProvider } from './AuthContext';
import { useWallet, WalletProvider } from './WalletContext';
import { useProducts, ProductsProvider } from './ProductsContext';
import { useAdmin, AdminProvider } from './AdminContext';

export {
  useStore,
  useUI,
  UIProvider,
  useAuth,
  AuthProvider,
  useWallet,
  WalletProvider,
  useProducts,
  ProductsProvider,
  useAdmin,
  AdminProvider,
  AppProviders,
};

/**
 * Backwards compatibility StoreProvider wrapping the new modular AppProviders.
 * Prevents any regression in existing component trees.
 */
export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <AppProviders>{children}</AppProviders>;
};

export default StoreProvider;
