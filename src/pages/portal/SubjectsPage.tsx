import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { subjectService } from '../../services/subjectService';
import { classService } from '../../services/classService';
import { MadrasaSubject } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { EmptyState } from '../../components/common/EmptyState';
import { BookOpen, Plus, X, Edit2, Trash2 } from 'lucide-react';

export const SubjectsPage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [subjects, setSubjects] = useState<MadrasaSubject[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<MadrasaSubject | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [targetClass, setTargetClass] = useState('All Classes');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'PRINCIPAL';

  const loadData = async () => {
    if (tenant?.id) {
      setLoading(true);
      const [sList, cList] = await Promise.all([
        subjectService.getSubjectsByTenant(tenant.id),
        classService.getClassesByTenant(tenant.id)
      ]);
      setSubjects(sList);
      setAvailableClasses(cList.map(c => c.name));
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant]);

  const openCreateModal = () => {
    setEditingSubject(null);
    setName('');
    setCode('');
    setTargetClass('All Classes');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sub: MadrasaSubject) => {
    setEditingSubject(sub);
    setName(sub.name);
    setCode(sub.code || '');
    setTargetClass(sub.classId || 'All Classes');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !name.trim()) {
      setError('Please enter a subject name.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingSubject) {
        await subjectService.updateSubject(tenant.id, editingSubject.id, {
          name: name.trim(),
          code: code.trim(),
          classId: targetClass
        });
      } else {
        await subjectService.createSubject(tenant.id, {
          name: name.trim(),
          code: code.trim(),
          classId: targetClass
        });
      }

      setSaving(false);
      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save subject';
      setError(msg);
      setSaving(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    if (tenant?.id && window.confirm(`Are you sure you want to delete subject "${subjectName}"?`)) {
      await subjectService.deleteSubject(tenant.id, subjectId);
      await loadData();
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '28px 32px 80px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#252525', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={26} color="#7B2525" />
                <span>Madrasa Subjects</span>
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                Create and manage custom subjects taught in your Madrasa
              </p>
            </div>

            {canEdit && (
              <button onClick={openCreateModal} className="btn btn-primary">
                <Plus size={18} />
                <span>Add New Subject</span>
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Loading subjects...</div>
          ) : subjects.length === 0 ? (
            <EmptyState
              icon="📚"
              title="No Subjects Created Yet"
              description="Click '+ Add New Subject' to create custom subjects (e.g. Tajweed, Fiqh, Arabic) for your Madrasa."
              actionLabel={canEdit ? "+ Add New Subject" : undefined}
              onAction={canEdit ? openCreateModal : undefined}
            />
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FAF8F5', borderBottom: '1px solid #E5E7EB', textAlign: 'left' }}>
                    <th style={{ padding: '12px 18px', color: '#6B7280', fontWeight: 600 }}>Code</th>
                    <th style={{ padding: '12px 18px', color: '#252525', fontWeight: 600 }}>Subject Name</th>
                    <th style={{ padding: '12px 18px', color: '#252525', fontWeight: 600 }}>Assigned Class</th>
                    <th style={{ padding: '12px 18px', color: '#6B7280', fontWeight: 600 }}>Created Date</th>
                    {canEdit && <th style={{ padding: '12px 18px', textAlign: 'right', color: '#6B7280', fontWeight: 600 }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((sub, idx) => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <td style={{ padding: '12px 18px', color: '#6B7280', fontWeight: 600, fontSize: '12px' }}>
                        {sub.code || '—'}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#7B2525', fontSize: '14px' }}>
                        {sub.name}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span className="badge badge-trial">{sub.classId || 'All Classes'}</span>
                      </td>
                      <td style={{ padding: '12px 18px', color: '#6B7280', fontSize: '12px' }}>
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      {canEdit && (
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button onClick={() => openEditModal(sub)} className="btn btn-ghost btn-sm" title="Edit Subject">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDeleteSubject(sub.id, sub.name)} className="btn btn-ghost btn-sm" style={{ color: '#DC2626' }} title="Delete Subject">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit Subject Modal */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="modal-card" style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '13px', marginBottom: '14px' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSaveSubject} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Subject Name *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Tajweed-ul-Quran, Fiqh, Arabic" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Subject Code</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. SUB-01" 
                    value={code} 
                    onChange={e => setCode(e.target.value)} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Assigned Class</label>
                  <select className="input-field" value={targetClass} onChange={e => setTargetClass(e.target.value)}>
                    <option value="All Classes">All Classes</option>
                    {availableClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
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
