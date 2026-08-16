import React, { useEffect, useState } from 'react';
import { tenantService } from '../../services/tenantService';
import { MadrasaTenant, MadrasaStatus, MadrasaModule } from '../../types';
import { ALL_MODULES } from '../../config/constants';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { CreateMadrasaModal } from '../../components/superadmin/CreateMadrasaModal';
import { Plus, Search, ExternalLink, Settings2, Check } from 'lucide-react';

export const CoreMadrasasPage: React.FC = () => {
  const [tenants, setTenants] = useState<MadrasaTenant[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Module edit state
  const [selectedTenant, setSelectedTenant] = useState<MadrasaTenant | null>(null);
  const [editModules, setEditModules] = useState<MadrasaModule[]>([]);

  const loadData = async () => {
    setLoading(true);
    const list = await tenantService.getAllTenants();
    setTenants(list);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (tenantId: string, status: MadrasaStatus) => {
    await tenantService.updateTenantStatus(tenantId, status);
    await loadData();
  };

  const handleOpenModuleEditor = (tenant: MadrasaTenant) => {
    setSelectedTenant(tenant);
    setEditModules(tenant.enabledModules || []);
  };

  const handleSaveModules = async () => {
    if (selectedTenant) {
      await tenantService.updateTenantModules(selectedTenant.id, editModules);
      setSelectedTenant(null);
      await loadData();
    }
  };

  const toggleModule = (mod: MadrasaModule) => {
    if (editModules.includes(mod)) {
      setEditModules(editModules.filter(m => m !== mod));
    } else {
      setEditModules([...editModules, mod]);
    }
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
                          t.id.toLowerCase().includes(search.toLowerCase()) || 
                          t.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '28px 32px 80px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#252525', margin: 0 }}>
                Madrasa Tenants Management
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                All registered Madrasas on iLmiFa Core SaaS platform
              </p>
            </div>

            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
              <Plus size={18} />
              <span>Create New Madrasa</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input 
                type="text"
                className="input-field"
                placeholder="Search Madrasa name, Tenant ID, slug..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {['all', 'active', 'trial', 'suspended'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Tenants Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Loading Madrasa tenants...</div>
            ) : filteredTenants.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>
                No Madrasas found matching filter criteria.
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Tenant ID</th>
                      <th>Madrasa Details</th>
                      <th>Portal Path</th>
                      <th>Principal</th>
                      <th>Modules</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#7B2525' }}>{t.id}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#252525' }}>{t.name}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{t.email} • {t.phone}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>/m/{t.slug}</div>
                          {t.customDomain && (
                            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 500 }}>🌐 {t.customDomain}</div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{t.principalName}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280' }}>{t.principalEmail}</div>
                        </td>
                        <td>
                          <button 
                            onClick={() => handleOpenModuleEditor(t)} 
                            className="btn btn-outline btn-sm"
                            style={{ gap: '4px', fontSize: '12px' }}
                          >
                            <Settings2 size={14} />
                            <span>{t.enabledModules?.length || 0} Modules</span>
                          </button>
                        </td>
                        <td>
                          <select 
                            value={t.status}
                            onChange={e => handleStatusChange(t.id, e.target.value as MadrasaStatus)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              border: '1px solid #E5E7EB',
                              backgroundColor: t.status === 'active' ? '#ECFDF5' : t.status === 'trial' ? '#EFF6FF' : '#FEF2F2',
                              color: t.status === 'active' ? '#047857' : t.status === 'trial' ? '#1D4ED8' : '#B91C1C',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="active">Active</option>
                            <option value="trial">Trial</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </td>
                        <td>
                          <a 
                            href={`/m/${t.slug}/login`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{ gap: '4px', textDecoration: 'none' }}
                          >
                            <ExternalLink size={14} />
                            <span>Portal Login</span>
                          </a>
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

      {/* Module Edit Modal */}
      {selectedTenant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '560px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', marginBottom: '4px' }}>
              Module Feature Flags — {selectedTenant.name}
            </h3>
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '20px' }}>
              Enable or disable modules for this tenant. Disabled modules will be hidden and blocked.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '360px', overflowY: 'auto', marginBottom: '20px' }}>
              {ALL_MODULES.map(m => {
                const checked = editModules.includes(m.id);
                return (
                  <div 
                    key={m.id}
                    onClick={() => toggleModule(m.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${checked ? '#7B2525' : '#E5E7EB'}`,
                      backgroundColor: checked ? 'rgba(123, 37, 37, 0.04)' : '#FFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                  >
                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: checked ? '#7B2525' : '#FFF', border: '1px solid #7B2525', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {checked && <Check size={10} />}
                    </div>
                    <span>{m.label}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setSelectedTenant(null)} className="btn btn-outline">Cancel</button>
              <button onClick={handleSaveModules} className="btn btn-primary">Save Module Flags</button>
            </div>
          </div>
        </div>
      )}

      <CreateMadrasaModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadData()}
      />

      <MobileNav />
    </div>
  );
};
