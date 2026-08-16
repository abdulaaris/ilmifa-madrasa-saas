import React, { createContext, useContext, useState, useCallback } from 'react';
import { MadrasaTenant } from '../types';
import { domainService } from '../services/domainService';

interface TenantContextType {
  tenant: MadrasaTenant | null;
  loadingTenant: boolean;
  tenantError: string | null;
  resolveTenant: (slug: string) => Promise<MadrasaTenant | null>;
  setTenant: (tenant: MadrasaTenant | null) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenantState] = useState<MadrasaTenant | null>(null);
  const [loadingTenant, setLoadingTenant] = useState<boolean>(false);
  const [tenantError, setTenantError] = useState<string | null>(null);

  const resolveTenant = useCallback(async (slug: string): Promise<MadrasaTenant | null> => {
    if (!slug) return null;
    setLoadingTenant(true);
    setTenantError(null);
    try {
      const resolved = await domainService.resolveTenantFromSlug(slug);
      if (resolved) {
        setTenantState(resolved);
      } else {
        setTenantState(null);
        setTenantError(`Madrasa portal "${slug}" could not be found.`);
      }
      setLoadingTenant(false);
      return resolved;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error resolving Madrasa portal';
      setTenantError(msg);
      setLoadingTenant(false);
      return null;
    }
  }, []);

  const setTenant = (t: MadrasaTenant | null) => {
    setTenantState(t);
  };

  return (
    <TenantContext.Provider value={{ tenant, loadingTenant, tenantError, resolveTenant, setTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
