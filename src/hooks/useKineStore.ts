import { useContext } from 'react';
import { KineContext, KineContextValue, ActiveNavTab, ThemeMode } from '../context/KineContext.tsx';

export type { ActiveNavTab, ThemeMode };

export function useKineStore(): KineContextValue {
  const context = useContext(KineContext);
  if (!context) {
    throw new Error('useKineStore must be used within a KineProvider');
  }
  return context;
}
