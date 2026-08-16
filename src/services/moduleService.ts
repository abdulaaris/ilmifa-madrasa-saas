import { MadrasaTenant, MadrasaModule } from '../types';

export const moduleService = {
  /**
   * Check if a module is enabled for a given Madrasa Tenant
   */
  isModuleEnabled(tenant: MadrasaTenant | null, moduleKey: MadrasaModule): boolean {
    if (!tenant) return true; // Default fallback if tenant context not loaded
    if (!tenant.enabledModules || tenant.enabledModules.length === 0) return true;
    return tenant.enabledModules.includes(moduleKey);
  }
};
