import React, { useEffect, useState } from 'react';
import { tenantService } from '../../services/tenantService';
import { MadrasaTenant, DomainStatus } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { Globe, Plus, Link, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export const CoreDomainsPage: React.FC = () => {
  const [tenants, setTenants] = useState<MadrasaTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const list = await tenantService.getAllTenants();
    setTenants(list);
    if (list.length > 0 && !selectedTenantId) {
      setSelectedTenantId(list[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveCustomDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId || !customDomainInput) return;
    setSaving(true);
    setMsg(null);

    await tenantService.setCustomDomain(selectedTenantId, customDomainInput, 'connected');
    setSaving(false);
    setMsg(`✓ Custom domain "${customDomainInput}" configured successfully.`);
    setCustomDomainInput('');
    await loadData();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '28px 32px 80px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#252525', margin: 0 }}>
              Domain Management
            </h1>
            <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
              Subdomain resolution and custom customer domain mapping
            </p>
          </div>

          {/* Add Custom Domain Mapping Card */}
          <div className="card" style={{ marginBottom: '28px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: '#7B2525', fontWeight: 600, fontSize: '16px' }}>
              <Globe size={20} />
              <span>Connect Custom Domain</span>
            </div>

            {msg && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', marginBottom: '16px' }}>
                {msg}
              </div>
            )}

            <form onSubmit={handleSaveCustomDomain} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Select Madrasa</label>
                <select 
                  className="input-field"
                  value={selectedTenantId}
                  onChange={e => setSelectedTenantId(e.target.value)}
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Custom Domain Name</label>
                <input 
                  type="text"
                  className="input-field"
                  placeholder="e.g. noorulhayath.com"
                  value={customDomainInput}
                  onChange={e => setCustomDomainInput(e.target.value)}
                  required
                />
              </div>

              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : 'Connect Domain'}
              </button>
            </form>
          </div>

          {/* Domains Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', fontWeight: 600, fontSize: '16px', color: '#252525' }}>
              Registered Madrasa Portal & Domain Registry
            </div>

            {loading ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#666' }}>Loading domain records...</div>
            ) : (
              <div className="table-container" style={{ border: 'none' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Madrasa Name</th>
                      <th>Tenant ID</th>
                      <th>Generated Portal Path</th>
                      <th>Subdomain URL</th>
                      <th>Custom Domain</th>
                      <th>Domain Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600, color: '#252525' }}>{t.name}</td>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#7B2525' }}>{t.id}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#7B2525', fontSize: '13px' }}>/m/{t.slug}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', color: '#4B5563', fontFamily: 'monospace' }}>
                            {t.slug}.ilmifa.com
                          </div>
                        </td>
                        <td>
                          {t.customDomain ? (
                            <div style={{ fontWeight: 600, color: '#059669', fontSize: '13px' }}>
                              🌐 {t.customDomain}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>None configured</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-${t.domainStatus || 'generated'}`}>
                            {t.domainStatus || 'generated'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
};
