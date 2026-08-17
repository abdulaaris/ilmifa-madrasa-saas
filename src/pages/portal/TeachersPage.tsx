import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { teacherService } from '../../services/teacherService';
import { classService } from '../../services/classService';
import { CLASS_OPTIONS } from '../../config/constants';
import { Teacher } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { EmptyState } from '../../components/common/EmptyState';
import { Plus, Search, X, Edit2, Trash2 } from 'lucide-react';

export const TeachersPage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Security Check: Only Super Admin and Principal can Edit/Create
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'PRINCIPAL';

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [mobile, setMobile] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [subjectsStr, setSubjectsStr] = useState('Arabic, Tajweed, Quran');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (tenant?.id) {
      setLoading(true);
      const [tList, cList] = await Promise.all([
        teacherService.getTeachersByTenant(tenant.id),
        classService.getClassesByTenant(tenant.id)
      ]);
      setTeachers(tList);
      if (cList.length > 0) {
        const names = cList.map(c => c.name);
        setAvailableClasses(names);
        setSelectedClasses([names[0]]);
      } else {
        setAvailableClasses([]);
        setSelectedClasses([]);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant]);

  const openCreateModal = () => {
    setEditingTeacher(null);
    setName('');
    setEmail('');
    setPass('');
    setMobile('');
    setSelectedClasses(availableClasses.length > 0 ? [availableClasses[0]] : []);
    setSubjectsStr('Arabic, Tajweed, Quran');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setName(t.name);
    setEmail(t.email);
    setPass(''); // Leave password blank unless updating
    setMobile(t.mobile || '');
    setSelectedClasses(t.assignedClasses || [CLASS_OPTIONS[0]]);
    setSubjectsStr(t.subjects?.join(', ') || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !name || (!editingTeacher && (!email || !pass))) {
      setError('Please fill in required fields.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const subjects = subjectsStr.split(',').map(s => s.trim()).filter(Boolean);

      if (editingTeacher) {
        // Edit existing teacher profile
        await teacherService.updateTeacher(tenant.id, editingTeacher.id, {
          name,
          mobile,
          assignedClasses: selectedClasses,
          subjects,
          ...(pass.trim() ? { password: pass.trim() } : {})
        });
      } else {
        // Create new teacher account
        await teacherService.createTeacher(tenant.id, {
          name,
          email,
          pass,
          mobile,
          assignedClasses: selectedClasses,
          subjects
        });
      }

      setCreating(false);
      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save teacher details';
      setError(msg);
      setCreating(false);
    }
  };

  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (tenant?.id && window.confirm(`Are you sure you want to delete teacher account "${teacherName}"?`)) {
      await teacherService.deleteTeacher(tenant.id, teacherId);
      setIsModalOpen(false);
      await loadData();
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.email.toLowerCase().includes(search.toLowerCase())
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
                Teacher Management
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                Provision Firebase Auth accounts & class assignments for teachers
              </p>
            </div>

            {canEdit && (
              <button onClick={openCreateModal} className="btn btn-primary">
                <Plus size={18} />
                <span>Create Teacher Account</span>
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input 
                type="text"
                className="input-field"
                placeholder="Search teacher name, email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Loading teachers list...</div>
          ) : filteredTeachers.length === 0 ? (
            <EmptyState 
              icon="👨‍🏫"
              title="No Teachers Registered"
              description="Provision your first teacher account to assign classes and enable attendance tracking."
              actionLabel={canEdit ? "+ Create Teacher Account" : undefined}
              onAction={canEdit ? openCreateModal : undefined}
            />
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Teacher Name</th>
                      <th>Login Email</th>
                      <th>Mobile Number</th>
                      <th>Assigned Classes</th>
                      <th>Subjects</th>
                      <th>Account Status</th>
                      {canEdit && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600, color: '#252525' }}>{t.name}</td>
                        <td style={{ fontSize: '13px', color: '#374151' }}>{t.email}</td>
                        <td style={{ fontSize: '13px', color: '#6B7280' }}>{t.mobile}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {t.assignedClasses?.map(c => (
                              <span key={c} style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: '#F3F4F6', borderRadius: '4px', border: '1px solid #E5E7EB' }}>
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontSize: '12px', color: '#6B7280' }}>{t.subjects?.join(', ')}</td>
                        <td>
                          <span className="badge badge-active">Active Auth</span>
                        </td>
                        {canEdit && (
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => openEditModal(t)} className="btn btn-outline btn-sm">
                                <Edit2 size={14} />
                                <span>Edit</span>
                              </button>
                              <button onClick={() => handleDeleteTeacher(t.id, t.name)} className="btn btn-ghost btn-sm" style={{ color: '#DC2626' }} title="Delete Teacher">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit Teacher Modal */}
      {isModalOpen && canEdit && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="modal-card" style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                {editingTeacher ? 'Edit Teacher Details' : 'Provision Teacher Auth Account'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '12px', marginBottom: '12px' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSaveTeacher} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Full Name *</label>
                <input type="text" className="input-field" placeholder="Maulana Ibrahim" value={name} onChange={e => setName(e.target.value)} required />
              </div>

              {!editingTeacher ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Login Email *</label>
                    <input type="email" className="input-field" placeholder="teacher@madrasa.org" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Initial Password *</label>
                    <input type="password" className="input-field" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} required />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Login Email</label>
                    <input type="email" className="input-field" value={email} disabled style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Reset Password (Optional)</label>
                    <input type="password" className="input-field" placeholder="Enter new password to reset" value={pass} onChange={e => setPass(e.target.value)} />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Mobile Phone</label>
                <input type="text" className="input-field" placeholder="+91 98765 43210" value={mobile} onChange={e => setMobile(e.target.value)} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#252525', marginBottom: '6px' }}>
                  Assigned Classes (Select all classes this teacher handles) *
                </label>
                {availableClasses.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#6B7280', padding: '10px 12px', backgroundColor: '#F3F4F6', borderRadius: '8px' }}>
                    No custom classes created yet. Please create classes first in the Classes tab.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', maxHeight: '140px', overflowY: 'auto', padding: '10px', backgroundColor: '#FAF9F7', border: '1px solid #E5E7EB', borderRadius: '10px' }}>
                    {availableClasses.map(c => {
                      const isChecked = selectedClasses.includes(c);
                      return (
                        <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: isChecked ? 'rgba(123, 37, 37, 0.08)' : '#FFF', border: isChecked ? '1px solid #7B2525' : '1px solid #E5E7EB', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: isChecked ? 600 : 400, color: isChecked ? '#7B2525' : '#374151' }}>
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedClasses([...selectedClasses, c]);
                              } else {
                                setSelectedClasses(selectedClasses.filter(sc => sc !== c));
                              }
                            }}
                            style={{ accentColor: '#7B2525' }}
                          />
                          <span>{c}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Subjects (Comma separated)</label>
                <input type="text" className="input-field" value={subjectsStr} onChange={e => setSubjectsStr(e.target.value)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                {editingTeacher ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteTeacher(editingTeacher.id, editingTeacher.name)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#DC2626', gap: '6px' }}
                  >
                    <Trash2 size={16} />
                    <span>Delete Teacher</span>
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
                  <button type="submit" disabled={creating} className="btn btn-primary">
                    {creating ? 'Saving...' : editingTeacher ? 'Update Teacher' : 'Provision Account'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
};
