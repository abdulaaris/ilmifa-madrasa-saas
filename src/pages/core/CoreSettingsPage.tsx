import React from 'react';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { Settings, Shield, Globe, Database, Cpu } from 'lucide-react';

export const CoreSettingsPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '28px 32px 80px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#252525', margin: 0 }}>
              Platform SaaS Settings
            </h1>
            <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
              iLmiFa Central System Architecture and Security Configurations
            </p>
          </div>

          <div style={{ display: 'grid', gap: '20px', maxWidth: '800px' }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Shield size={22} style={{ color: '#7B2525' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Security & Firestore Isolation</h3>
              </div>
              <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
                All customer data is strictly isolated using <code>madrasas/&#123;tenantId&#125;</code> sub-collections enforced by <code>firestore.rules</code> and <code>TenantGuard</code>.
              </p>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Globe size={22} style={{ color: '#7B2525' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Domain Routing Infrastructure</h3>
              </div>
              <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
                Supports dev route paths (<code>/m/:tenantSlug</code>), platform subdomains (<code>tenant.ilmifa.com</code>), and custom customer domain mapping.
              </p>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Cpu size={22} style={{ color: '#7B2525' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>PWA Capabilities</h3>
              </div>
              <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
                Service Worker shell caching and standalone PWA manifests configured for seamless home screen app installation on Android and iOS.
              </p>
            </div>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
};
