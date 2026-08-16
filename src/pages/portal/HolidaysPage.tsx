import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { holidayService } from '../../services/holidayService';
import { MadrasaHoliday } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { EmptyState } from '../../components/common/EmptyState';
import { Calendar, Plus, Search, X, Trash2, CheckCircle2 } from 'lucide-react';

export const HolidaysPage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [holidays, setHolidays] = useState<MadrasaHoliday[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Permission Check: Super Admin and Principal can manage holidays
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'PRINCIPAL';

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (tenant?.id) {
      setLoading(true);
      const list = await holidayService.getHolidaysByTenant(tenant.id);
      setHolidays(list);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant]);

  const openCreateModal = () => {
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setIsModalOpen(true);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !title || !date) return;
    setSaving(true);

    await holidayService.createHoliday(tenant.id, {
      title,
      date,
      description
    });

    setSaving(false);
    setIsModalOpen(false);
    await loadData();
  };

  const handleDeleteHoliday = async (holidayId: string, holidayTitle: string) => {
    if (tenant?.id && window.confirm(`Are you sure you want to delete holiday "${holidayTitle}"?`)) {
      await holidayService.deleteHoliday(tenant.id, holidayId);
      await loadData();
    }
  };

  const filteredHolidays = holidays.filter(h => 
    h.title.toLowerCase().includes(search.toLowerCase()) || 
    h.date.includes(search)
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '28px 32px 80px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#252525', margin: 0 }}>
                Madrasa Holiday Calendar
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                Manage weekly Friday holidays and custom Islamic / National holiday calendar for {tenant?.name}
              </p>
            </div>

            {canEdit && (
              <button onClick={openCreateModal} className="btn btn-primary">
                <Plus size={18} />
                <span>Add Custom Holiday</span>
              </button>
            )}
          </div>

          {/* Automatic Friday Rule Spotlight Banner */}
          <div className="card" style={{ padding: '20px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#059669', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                🕌
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#065F46', margin: 0 }}>
                  Automatic Rule: Every Friday (Jummah) is a Weekly Holiday
                </h3>
                <div style={{ fontSize: '13px', color: '#047857', marginTop: '2px' }}>
                  System automatically excuses all students on Fridays — Friday absences do not penalize student attendance percentage.
                </div>
              </div>
            </div>

            <span className="badge badge-active" style={{ fontSize: '12px', padding: '6px 12px' }}>
              <CheckCircle2 size={14} style={{ marginRight: '4px' }} /> Active System Rule
            </span>
          </div>

          {/* Search */}
          <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input 
                type="text"
                className="input-field"
                placeholder="Search holiday title or date (YYYY-MM-DD)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Loading holiday calendar...</div>
          ) : filteredHolidays.length === 0 ? (
            <EmptyState 
              icon="🗓️"
              title="No Custom Holidays Declared"
              description="Every Friday is already configured as an automatic weekly holiday. Click '+ Add Custom Holiday' for Eid, Independence Day, etc."
              actionLabel={canEdit ? "+ Add Custom Holiday" : undefined}
              onAction={canEdit ? openCreateModal : undefined}
            />
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Holiday Title</th>
                      <th>Date</th>
                      <th>Day of Week</th>
                      <th>Description / Notes</th>
                      {canEdit && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHolidays.map(h => {
                      const d = new Date(`${h.date}T00:00:00`);
                      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
                      return (
                        <tr key={h.id}>
                          <td style={{ fontWeight: 700, color: '#252525' }}>🎉 {h.title}</td>
                          <td style={{ fontWeight: 600, fontFamily: 'monospace', color: '#7B2525' }}>{h.date}</td>
                          <td>
                            <span className="badge badge-trial">{dayName}</span>
                          </td>
                          <td style={{ fontSize: '13px', color: '#666' }}>{h.description || 'Declared Madrasa Holiday'}</td>
                          {canEdit && (
                            <td>
                              <button onClick={() => handleDeleteHoliday(h.id, h.title)} className="btn btn-ghost btn-sm" style={{ color: '#DC2626' }} title="Delete Holiday">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Holiday Modal */}
      {isModalOpen && canEdit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                Add Custom Madrasa Holiday
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Holiday Title *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Eid-ul-Fitr, Independence Day" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Holiday Date *</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  required 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Description / Notes</label>
                <textarea 
                  className="input-field" 
                  rows={3} 
                  placeholder="e.g. Madrasa closed for Eid celebration..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : 'Add Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
};
