import React from 'react';
import { useTenant } from '../context/TenantContext';
import { MadrasaModule } from '../types';
import { moduleService } from '../services/moduleService';

interface ModuleGuardProps {
  moduleKey: MadrasaModule;
  children: React.ReactNode;
}

export const ModuleGuard: React.FC<ModuleGuardProps> = ({ moduleKey, children }) => {
  const { tenant } = useTenant();

  if (!moduleService.isModuleEnabled(tenant, moduleKey)) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ background: '#FFF', maxWidth: '440px', margin: '0 auto', padding: '32px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚙️</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#252525', marginBottom: '8px' }}>Module Disabled</h3>
          <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
            The <strong>{moduleKey}</strong> module is currently disabled for this Madrasa. Contact your Principal to enable it.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
