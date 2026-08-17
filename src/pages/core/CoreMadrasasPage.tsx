import React, { useEffect, useState } from 'react';
import { tenantService } from '../../services/tenantService';
import { userService } from '../../services/userService';
import { MadrasaTenant, MadrasaStatus, MadrasaModule } from '../../types';
import { ALL_MODULES } from '../../config/constants';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { CreateMadrasaModal } from '../../components/superadmin/CreateMadrasaModal';
import { Plus, Search, ExternalLink, Settings2, Check, Edit2, X, Lock, Unlock } from 'lucide-react';

export const CoreMadrasasPage: React.FC = () => {
  const [tenants, setTenants] = useState<MadrasaTenant[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Module edit state
  const [selectedTenant, setSelectedTenant] = useState<MadrasaTenant | null>(null);
  const [editModules, setEditModules] = useState<MadrasaModule[]>([]);

  // Madrasa Full Edit Details Modal State & Safety Locking
  const [editingMadrasa, setEditingMadrasa] = useState<MadrasaTenant | null>(null);
  const [unlockedFields, setUnlockedFields] = useState<Record<string, boolean>>({});
  const [editName, setEditName] = useState('');
  const [editShortName, setEditShortName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editStatus, setEditStatus] = useState<MadrasaStatus>('active');
  const [editTrialEndsAt, setEditTrialEndsAt] = useState('');
  const [editPrincipalName, setEditPrincipalName] = useState('');
  const [editPrincipalEmail, setEditPrincipalEmail] = useState('');
  const [editPrincipalPassword, setEditPrincipalPassword] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editPrimaryColor, setEditPrimaryColor] = useState('');
  const [savingMadrasa, setSavingMadrasa] = useState(false);

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

  const toggleFieldUnlock = (fieldKey: string) => {
    setUnlockedFields(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const openEditMadrasaModal = (t: MadrasaTenant) => {
    setEditingMadrasa(t);
    setUnlockedFields({}); // All fields start locked by default for safety!
    setEditName(t.name);
    setEditShortName(t.shortName || '');
    setEditSlug(t.slug || '');
    setEditPhone(t.phone || '');
    setEditEmail(t.email || '');
    setEditAddress(t.address || '');
    setEditStatus(t.status || 'active');
    setEditLogoUrl(t.branding?.logoUrl || '');
    setEditPrimaryColor(t.branding?.primaryColor || '#7B2525');
    
    // Set default trial expiry date if not already set (7 days from now at 23:59)
    if (t.trialEndsAt) {
      setEditTrialEndsAt(t.trialEndsAt);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(23, 59, 0, 0);
      setEditTrialEndsAt(d.toISOString().substring(0, 16));
    }

    setEditPrincipalName(t.principalName || '');
    setEditPrincipalEmail(t.principalEmail || '');
    setEditPrincipalPassword('');
  };

  const handleSaveMadrasaDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMadrasa) return;
    setSavingMadrasa(true);

    const cleanSlug = editSlug.toLowerCase().trim();

    await tenantService.updateTenant(editingMadrasa.id, {
      name: editName,
      shortName: editShortName,
      slug: cleanSlug,
      phone: editPhone,
      email: editEmail,
      address: editAddress,
      status: editStatus,
      principalName: editPrincipalName,
      principalEmail: editPrincipalEmail,
      branding: {
        ...(editingMadrasa.branding || {}),
        primaryColor: editPrimaryColor || '#7B2525',
        logoUrl: editLogoUrl || ''
      },
      ...(editStatus === 'trial' ? {
        trialStartDate: editingMadrasa.trialStartDate || new Date().toISOString(),
        trialEndsAt: editTrialEndsAt
      } : {})
    });

    // Cascade update to Principal User Profile document & Password reset if provided
    if (editingMadrasa.principalUid) {
      await userService.updateUserProfile(editingMadrasa.principalUid, {
        displayName: editPrincipalName,
        email: editPrincipalEmail.toLowerCase().trim()
      });

      if (editPrincipalPassword.trim()) {
        await userService.updateUserProfile(editingMadrasa.principalUid, {
          passwordResetByAdmin: true,
          updatedAt: new Date().toISOString()
        });
      }
    }

    setSavingMadrasa(false);
    setEditingMadrasa(null);
    await loadData();
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

            <div className="action-bar-scrollable">
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
                              backgroundColor: t.status === 'active' ? '#ECFDF5' : t.status === 'trial' ? '#FFFBEB' : '#FEF2F2',
                              color: t.status === 'active' ? '#047857' : t.status === 'trial' ? '#B45309' : '#B91C1C',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="active">Active</option>
                            <option value="trial">Trial</option>
                            <option value="suspended">Suspended</option>
                          </select>
                          {t.status === 'trial' && t.trialEndsAt && (
                            <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 600, marginTop: '3px' }}>
                              ⏱️ Ends: {new Date(t.trialEndsAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                          {t.status === 'suspended' && (
                            <div style={{ fontSize: '10px', color: '#DC2626', fontWeight: 600, marginTop: '3px' }}>
                              🔴 {t.suspensionReason || 'Suspended'}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => openEditMadrasaModal(t)} className="btn btn-outline btn-sm" title="Edit Madrasa">
                              <Edit2 size={14} />
                              <span>Edit</span>
                            </button>
                            <a 
                              href={`/m/${t.slug}/login`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="btn btn-outline btn-sm"
                              style={{ gap: '4px', textDecoration: 'none' }}
                            >
                              <ExternalLink size={14} />
                              <span>Portal</span>
                            </a>
                          </div>
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

      {/* Edit Madrasa Details Modal */}
      {editingMadrasa && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="modal-card" style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                Edit Madrasa — {editingMadrasa.id}
              </h3>
              <button onClick={() => setEditingMadrasa(null)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMadrasaDetails} style={{ display: 'grid', gap: '14px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '4px' }}>
              {/* MADRASA NAME */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#252525' }}>Madrasa Name *</label>
                  <button type="button" onClick={() => toggleFieldUnlock('name')} className={`btn btn-xs ${unlockedFields['name'] ? 'btn-primary' : 'btn-outline'}`} style={{ gap: '4px', fontSize: '11px', padding: '2px 8px' }}>
                    {unlockedFields['name'] ? <Unlock size={12} /> : <Lock size={12} />}
                    <span>{unlockedFields['name'] ? 'Unlocked' : 'Edit'}</span>
                  </button>
                </div>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  disabled={!unlockedFields['name']}
                  style={{ backgroundColor: unlockedFields['name'] ? '#FFF' : '#F9FAFB', cursor: unlockedFields['name'] ? 'text' : 'not-allowed' }}
                  required 
                />
              </div>

              {/* SHORT NAME & SLUG */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#252525' }}>Short Name</label>
                    <button type="button" onClick={() => toggleFieldUnlock('shortName')} className={`btn btn-xs ${unlockedFields['shortName'] ? 'btn-primary' : 'btn-outline'}`} style={{ gap: '4px', fontSize: '11px', padding: '2px 8px' }}>
                      {unlockedFields['shortName'] ? <Unlock size={12} /> : <Lock size={12} />}
                      <span>{unlockedFields['shortName'] ? 'Unlocked' : 'Edit'}</span>
                    </button>
                  </div>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={editShortName} 
                    onChange={e => setEditShortName(e.target.value)} 
                    disabled={!unlockedFields['shortName']}
                    style={{ backgroundColor: unlockedFields['shortName'] ? '#FFF' : '#F9FAFB', cursor: unlockedFields['shortName'] ? 'text' : 'not-allowed' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#252525' }}>Subdomain Slug *</label>
                    <button type="button" onClick={() => toggleFieldUnlock('slug')} className={`btn btn-xs ${unlockedFields['slug'] ? 'btn-primary' : 'btn-outline'}`} style={{ gap: '4px', fontSize: '11px', padding: '2px 8px' }}>
                      {unlockedFields['slug'] ? <Unlock size={12} /> : <Lock size={12} />}
                      <span>{unlockedFields['slug'] ? 'Unlocked' : 'Edit'}</span>
                    </button>
                  </div>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={editSlug} 
                    onChange={e => setEditSlug(e.target.value)} 
                    disabled={!unlockedFields['slug']}
                    style={{ backgroundColor: unlockedFields['slug'] ? '#FFF' : '#F9FAFB', cursor: unlockedFields['slug'] ? 'text' : 'not-allowed' }}
                    required 
                  />
                </div>
              </div>

              {/* PHONE & EMAIL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#252525' }}>Official Phone</label>
                    <button type="button" onClick={() => toggleFieldUnlock('phone')} className={`btn btn-xs ${unlockedFields['phone'] ? 'btn-primary' : 'btn-outline'}`} style={{ gap: '4px', fontSize: '11px', padding: '2px 8px' }}>
                      {unlockedFields['phone'] ? <Unlock size={12} /> : <Lock size={12} />}
                      <span>{unlockedFields['phone'] ? 'Unlocked' : 'Edit'}</span>
                    </button>
                  </div>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={editPhone} 
                    onChange={e => setEditPhone(e.target.value)} 
                    disabled={!unlockedFields['phone']}
                    style={{ backgroundColor: unlockedFields['phone'] ? '#FFF' : '#F9FAFB', cursor: unlockedFields['phone'] ? 'text' : 'not-allowed' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#252525' }}>Official Email</label>
                    <button type="button" onClick={() => toggleFieldUnlock('email')} className={`btn btn-xs ${unlockedFields['email'] ? 'btn-primary' : 'btn-outline'}`} style={{ gap: '4px', fontSize: '11px', padding: '2px 8px' }}>
                      {unlockedFields['email'] ? <Unlock size={12} /> : <Lock size={12} />}
                      <span>{unlockedFields['email'] ? 'Unlocked' : 'Edit'}</span>
                    </button>
                  </div>
                  <input 
                    type="email" 
                    className="input-field" 
                    value={editEmail} 
                    onChange={e => setEditEmail(e.target.value)} 
                    disabled={!unlockedFields['email']}
                    style={{ backgroundColor: unlockedFields['email'] ? '#FFF' : '#F9FAFB', cursor: unlockedFields['email'] ? 'text' : 'not-allowed' }}
                  />
                </div>
              </div>

              {/* ADDRESS */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#252525' }}>Madrasa Address</label>
                  <button type="button" onClick={() => toggleFieldUnlock('address')} className={`btn btn-xs ${unlockedFields['address'] ? 'btn-primary' : 'btn-outline'}`} style={{ gap: '4px', fontSize: '11px', padding: '2px 8px' }}>
                    {unlockedFields['address'] ? <Unlock size={12} /> : <Lock size={12} />}
                    <span>{unlockedFields['address'] ? 'Unlocked' : 'Edit'}</span>
                  </button>
                </div>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editAddress} 
                  onChange={e => setEditAddress(e.target.value)} 
                  disabled={!unlockedFields['address']}
                  style={{ backgroundColor: unlockedFields['address'] ? '#FFF' : '#F9FAFB', cursor: unlockedFields['address'] ? 'text' : 'not-allowed' }}
                  placeholder="City, Location, Address..." 
                />
              </div>

              {/* SUBSCRIPTION STATUS */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#252525' }}>Madrasa Subscription Status</label>
                  <button type="button" onClick={() => toggleFieldUnlock('status')} className={`btn btn-xs ${unlockedFields['status'] ? 'btn-primary' : 'btn-outline'}`} style={{ gap: '4px', fontSize: '11px', padding: '2px 8px' }}>
                    {unlockedFields['status'] ? <Unlock size={12} /> : <Lock size={12} />}
                    <span>{unlockedFields['status'] ? 'Unlocked' : 'Edit'}</span>
                  </button>
                </div>
                <select 
                  className="input-field" 
                  value={editStatus} 
                  onChange={e => setEditStatus(e.target.value as MadrasaStatus)}
                  disabled={!unlockedFields['status']}
                  style={{ backgroundColor: unlockedFields['status'] ? '#FFF' : '#F9FAFB', cursor: unlockedFields['status'] ? 'pointer' : 'not-allowed' }}
                >
                  <option value="active">Active (Paid Plan)</option>
                  <option value="trial">Trial Version (Time Limited)</option>
                  <option value="suspended">Suspended Access</option>
                  <option value="inactive">Inactive Account</option>
                </select>
              </div>

              {/* TRIAL EXPIRY DATE & TIME */}
              {editStatus === 'trial' && (
                <div style={{ backgroundColor: '#FFFBEB', border: '1.5px solid #FDE68A', padding: '14px 16px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                      ⏱️ Trial Expiry Date & Time (Auto-Suspend Cutoff) *
                    </label>
                    <button type="button" onClick={() => toggleFieldUnlock('trialEndsAt')} className={`btn btn-xs ${unlockedFields['trialEndsAt'] ? 'btn-primary' : 'btn-outline'}`} style={{ gap: '4px', fontSize: '11px', padding: '2px 8px' }}>
                      {unlockedFields['trialEndsAt'] ? <Unlock size={12} /> : <Lock size={12} />}
                      <span>{unlockedFields['trialEndsAt'] ? 'Unlocked' : 'Edit'}</span>
                    </button>
                  </div>
                  <input 
                    type="datetime-local" 
                    className="input-field" 
                    value={editTrialEndsAt} 
                    onChange={e => setEditTrialEndsAt(e.target.value)} 
                    disabled={!unlockedFields['trialEndsAt']}
                    style={{ backgroundColor: unlockedFields['trialEndsAt'] ? '#FFF' : '#FFFDF5', cursor: unlockedFields['trialEndsAt'] ? 'text' : 'not-allowed' }}
                    required={editStatus === 'trial'}
                  />
                  <div style={{ fontSize: '11px', color: '#B45309', marginTop: '6px', lineHeight: 1.4 }}>
                    ⚡ <strong>Auto-Suspend Rule:</strong> When this exact date & time passes, the system will automatically block and suspend this Madrasa's login portal until renewed!
                  </div>
                </div>
              )}

              {/* PRINCIPAL CREDENTIALS */}
              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '14px', marginTop: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#7B2525', marginBottom: '10px' }}>
                  🕌 Principal Administrative Credentials
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: '#252525' }}>Principal Name</label>
                      <button type="button" onClick={() => toggleFieldUnlock('principalName')} className={`btn btn-xs ${unlockedFields['principalName'] ? 'btn-primary' : 'btn-outline'}`} style={{ gap: '4px', fontSize: '11px', padding: '2px 8px' }}>
                        {unlockedFields['principalName'] ? <Unlock size={12} /> : <Lock size={12} />}
                        <span>{unlockedFields['principalName'] ? 'Unlocked' : 'Edit'}</span>
                      </button>
                    </div>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={editPrincipalName} 
                      onChange={e => setEditPrincipalName(e.target.value)} 
                      disabled={!unlockedFields['principalName']}
                      style={{ backgroundColor: unlockedFields['principalName'] ? '#FFF' : '#F9FAFB', cursor: unlockedFields['principalName'] ? 'text' : 'not-allowed' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: '#252525' }}>Principal Email</label>
                      <button type="button" onClick={() => toggleFieldUnlock('principalEmail')} className={`btn btn-xs ${unlockedFields['principalEmail'] ? 'btn-primary' : 'btn-outline'}`} style={{ gap: '4px', fontSize: '11px', padding: '2px 8px' }}>
                        {unlockedFields['principalEmail'] ? <Unlock size={12} /> : <Lock size={12} />}
                        <span>{unlockedFields['principalEmail'] ? 'Unlocked' : 'Edit'}</span>
                      </button>
                    </div>
                    <input 
                      type="email" 
                      className="input-field" 
                      value={editPrincipalEmail} 
                      onChange={e => setEditPrincipalEmail(e.target.value)} 
                      disabled={!unlockedFields['principalEmail']}
                      style={{ backgroundColor: unlockedFields['principalEmail'] ? '#FFF' : '#F9FAFB', cursor: unlockedFields['principalEmail'] ? 'text' : 'not-allowed' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#991B1B' }}>
                      Reset Principal Password (Optional)
                    </label>
                    <button type="button" onClick={() => toggleFieldUnlock('principalPassword')} className={`btn btn-xs ${unlockedFields['principalPassword'] ? 'btn-primary' : 'btn-outline'}`} style={{ gap: '4px', fontSize: '11px', padding: '2px 8px' }}>
                      {unlockedFields['principalPassword'] ? <Unlock size={12} /> : <Lock size={12} />}
                      <span>{unlockedFields['principalPassword'] ? 'Unlocked' : 'Edit'}</span>
                    </button>
                  </div>
                  <input 
                    type="password" 
                    className="input-field" 
                    placeholder="Enter new password to reset Principal login" 
                    value={editPrincipalPassword} 
                    onChange={e => setEditPrincipalPassword(e.target.value)} 
                    disabled={!unlockedFields['principalPassword']}
                    style={{ backgroundColor: unlockedFields['principalPassword'] ? '#FFF' : '#F9FAFB', cursor: unlockedFields['principalPassword'] ? 'text' : 'not-allowed' }}
                  />
                </div>
              </div>

              {/* MADRASA BRANDING & PWA APP ICON */}
              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '14px', marginTop: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#7B2525', marginBottom: '10px' }}>
                  🎨 Madrasa Branding & PWA App Icon
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#252525' }}>
                      Logo URL (Installed PWA App Icon & Favicon)
                    </label>
                    <button type="button" onClick={() => toggleFieldUnlock('logoUrl')} className={`btn btn-xs ${unlockedFields['logoUrl'] ? 'btn-primary' : 'btn-outline'}`} style={{ gap: '4px', fontSize: '11px', padding: '2px 8px' }}>
                      {unlockedFields['logoUrl'] ? <Unlock size={12} /> : <Lock size={12} />}
                      <span>{unlockedFields['logoUrl'] ? 'Unlocked' : 'Edit'}</span>
                    </button>
                  </div>
                  <input 
                    type="url" 
                    className="input-field" 
                    placeholder="https://example.com/logo.png (or SVG URL)" 
                    value={editLogoUrl} 
                    onChange={e => setEditLogoUrl(e.target.value)} 
                    disabled={!unlockedFields['logoUrl']}
                    style={{ backgroundColor: unlockedFields['logoUrl'] ? '#FFF' : '#F9FAFB', cursor: unlockedFields['logoUrl'] ? 'text' : 'not-allowed' }}
                  />
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                    💡 When uploaded, this logo will dynamically become the **installed PWA app icon** on phones and desktops!
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setEditingMadrasa(null)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={savingMadrasa} className="btn btn-primary">
                  {savingMadrasa ? 'Saving...' : 'Update Madrasa & Principal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module Edit Modal */}
      {selectedTenant && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="modal-card" style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '560px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
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
