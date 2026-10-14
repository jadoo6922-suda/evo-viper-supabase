import React, { ReactNode } from 'react';
import { UIProvider } from './UIContext';
import { AuthProvider } from './AuthContext';
import { WalletProvider } from './WalletContext';
import { ProductsProvider } from './ProductsContext';
import { AdminProvider } from './AdminContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <UIProvider>
      <AuthProvider>
        <WalletProvider>
          <ProductsProvider>
            <AdminProvider>
              {children}
            </AdminProvider>
          </ProductsProvider>
        </WalletProvider>
      </AuthProvider>
    </UIProvider>
  );
}

export default AppProviders;
