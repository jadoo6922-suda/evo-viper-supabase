import { useUI } from './UIContext';
import { useAuth } from './AuthContext';
import { useWallet } from './WalletContext';
import { useProducts } from './ProductsContext';
import { useAdmin } from './AdminContext';

/**
 * Compatibility bridge hook for existing components.
 * Aggregates all modular contexts so existing components continue to function
 * without requiring an all-at-once migration.
 */
export function useStore() {
  const ui = useUI();
  const auth = useAuth();
  const wallet = useWallet();
  const products = useProducts();
  const admin = useAdmin();

  return {
    ...ui,
    ...auth,
    ...wallet,
    ...products,
    ...admin,
  };
}

export default useStore;
