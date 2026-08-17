import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { classService } from '../../services/classService';
import { studentService } from '../../services/studentService';
import { subjectService } from '../../services/subjectService';
import { MadrasaClass, Student, MadrasaSubject } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { EmptyState } from '../../components/common/EmptyState';
import { BookOpen, Plus, Search, X, Edit2, Trash2, Users, Check, Book, Eye } from 'lucide-react';

export const ClassesPage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [classes, setClasses] = useState<MadrasaClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<MadrasaSubject[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Permission Check: Super Admin and Principal can manage classes
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'PRINCIPAL';

  // Class Details & Student Roster Modal State
  const [viewingClassDetails, setViewingClassDetails] = useState<MadrasaClass | null>(null);
  const [rosterSearch, setRosterSearch] = useState('');

  // Create / Edit Class Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<MadrasaClass | null>(null);
  const [name, setName] = useState('');
  const [section, setSection] = useState('A');
  const [medium, setMedium] = useState('Arabic / English');
  const [classTeacherName, setClassTeacherName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (tenant?.id) {
      setLoading(true);
      const [cList, sList, subList] = await Promise.all([
        classService.getClassesByTenant(tenant.id),
        studentService.getStudentsByTenant(tenant.id),
        subjectService.getSubjectsByTenant(tenant.id)
      ]);
      setClasses(cList);
      setStudents(sList);
      setAvailableSubjects(subList);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant]);

  const openCreateModal = () => {
    setEditingClass(null);
    setName('');
    setSection('A');
    setMedium('Arabic / English');
    setClassTeacherName('');
    setDescription('');
    setSelectedSubjects([]);
    setCustomSubjectInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: MadrasaClass) => {
    setEditingClass(c);
    setName(c.name);
    setSection(c.section || 'A');
    setMedium(c.medium || 'Arabic / English');
    setClassTeacherName(c.classTeacherName || '');
    setDescription(c.description || '');
    setSelectedSubjects(c.subjects || []);
    setCustomSubjectInput('');
    setIsModalOpen(true);
  };

  const toggleSubjectSelect = (subName: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subName) ? prev.filter(s => s !== subName) : [...prev, subName]
    );
  };

  const handleAddCustomSubject = () => {
    if (customSubjectInput.trim() && !selectedSubjects.includes(customSubjectInput.trim())) {
      setSelectedSubjects(prev => [...prev, customSubjectInput.trim()]);
      setCustomSubjectInput('');
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !name) return;
    setSaving(true);

    if (editingClass) {
      // Edit class
      await classService.updateClass(tenant.id, editingClass.id, {
        name,
        section,
        medium,
        classTeacherName,
        description,
        subjects: selectedSubjects
      });
    } else {
      // Create new class
      await classService.createClass(tenant.id, {
        name,
        section,
        medium,
        classTeacherName,
        description,
        subjects: selectedSubjects
      });
    }

    setSaving(false);
    setIsModalOpen(false);
    await loadData();
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (tenant?.id && window.confirm(`Are you sure you want to delete class "${className}"?`)) {
      await classService.deleteClass(tenant.id, classId);
      await loadData();
    }
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.classTeacherName && c.classTeacherName.toLowerCase().includes(search.toLowerCase()))
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
                Class Levels Directory
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                Manage custom academic classes and sections for {tenant?.name}
              </p>
            </div>

            {canEdit && (
              <button onClick={openCreateModal} className="btn btn-primary">
                <Plus size={18} />
                <span>Add New Class</span>
              </button>
            )}
          </div>

          {/* Search */}
          <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input 
                type="text"
                className="input-field"
                placeholder="Search class name, teacher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Loading classes directory...</div>
          ) : filteredClasses.length === 0 ? (
            <EmptyState 
              icon="📚"
              title="No Custom Classes Created"
              description="Click '+ Add New Class' to create custom classes (e.g. Hifz A, Class 1, Nazira, Aalimiyyah) for your Madrasa."
              actionLabel={canEdit ? "+ Add New Class" : undefined}
              onAction={canEdit ? openCreateModal : undefined}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {filteredClasses.map(c => {
                const classStudentCount = students.filter(s => s.classId === c.name || s.classId === c.id).length;
                return (
                  <div 
                    key={c.id} 
                    className="card" 
                    onClick={() => { setViewingClassDetails(c); setRosterSearch(''); }}
                    style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', border: '1px solid #E5E7EB', transition: 'all 0.2s ease' }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <span className="badge badge-active">Section {c.section || 'A'}</span>
                        {canEdit && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); openEditModal(c); }} 
                              className="btn btn-ghost btn-sm" 
                              style={{ padding: '4px' }} 
                              title="Edit Class"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id, c.name); }} 
                              className="btn btn-ghost btn-sm" 
                              style={{ padding: '4px', color: '#DC2626' }} 
                              title="Delete Class"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#252525', margin: '0 0 6px 0' }}>
                        {c.name}
                      </h3>

                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                        Medium: <strong>{c.medium || 'Arabic / English'}</strong>
                      </div>

                      {c.classTeacherName && (
                        <div style={{ fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
                          Class Teacher: <strong>{c.classTeacherName}</strong>
                        </div>
                      )}

                      {c.subjects && c.subjects.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Book size={12} />
                            <span>Assigned Subjects:</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {c.subjects.map(s => (
                              <span key={s} style={{ padding: '2px 8px', backgroundColor: '#F3F4F6', color: '#374151', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {c.description && (
                        <p style={{ fontSize: '12px', color: '#666', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                          {c.description}
                        </p>
                      )}
                    </div>

                    <div style={{ paddingTop: '12px', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#7B2525', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={16} />
                        <span>{classStudentCount} Enrolled Students</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={14} /> View Roster →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Full Class Details & Student Roster Modal */}
      {viewingClassDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '20px', maxWidth: '850px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAF9F7', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#252525', margin: 0 }}>
                    {viewingClassDetails.name}
                  </h3>
                  <span className="badge badge-active">Section {viewingClassDetails.section || 'A'}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  Class Details & Enrolled Students Roster
                </div>
              </div>
              <button onClick={() => setViewingClassDetails(null)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
              
              {/* Class Summary Box */}
              <div style={{ padding: '16px', backgroundColor: '#FAF8F5', borderRadius: '12px', border: '1px solid #EEE0CC', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', fontSize: '13px' }}>
                  <div>
                    <div style={{ color: '#6B7280', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Class Teacher</div>
                    <div style={{ fontWeight: 700, color: '#252525', marginTop: '2px' }}>
                      {viewingClassDetails.classTeacherName || 'Not Assigned'}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#6B7280', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Medium</div>
                    <div style={{ fontWeight: 600, color: '#374151', marginTop: '2px' }}>
                      {viewingClassDetails.medium || 'Arabic / English'}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#6B7280', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Enrolled Students</div>
                    <div style={{ fontWeight: 700, color: '#7B2525', marginTop: '2px' }}>
                      {students.filter(s => s.classId === viewingClassDetails.name || s.classId === viewingClassDetails.id).length} Students
                    </div>
                  </div>
                </div>

                {/* Assigned Subjects */}
                {viewingClassDetails.subjects && viewingClassDetails.subjects.length > 0 && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                      Assigned Subjects ({viewingClassDetails.subjects.length}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {viewingClassDetails.subjects.map(sub => (
                        <span key={sub} style={{ padding: '3px 10px', backgroundColor: '#7B2525', color: '#FFFFFF', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Class Notes */}
                {viewingClassDetails.description && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#4B5563', fontStyle: 'italic' }}>
                    📝 {viewingClassDetails.description}
                  </div>
                )}
              </div>

              {/* Student Roster Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#252525', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="#7B2525" />
                  <span>Enrolled Student Roster</span>
                </h4>

                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search student in class..."
                    value={rosterSearch}
                    onChange={e => setRosterSearch(e.target.value)}
                    style={{ paddingLeft: '32px', fontSize: '12px', padding: '6px 10px 6px 32px' }}
                  />
                </div>
              </div>

              {/* Students Table */}
              {(() => {
                const classStudents = students.filter(s => 
                  (s.classId === viewingClassDetails.name || s.classId === viewingClassDetails.id) &&
                  (s.name.toLowerCase().includes(rosterSearch.toLowerCase()) || 
                   (s.studentCode && s.studentCode.toLowerCase().includes(rosterSearch.toLowerCase())) ||
                   (s.parentName && s.parentName.toLowerCase().includes(rosterSearch.toLowerCase())))
                );

                if (classStudents.length === 0) {
                  return (
                    <div style={{ padding: '36px', textAlign: 'center', color: '#666', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                      No students enrolled in <strong>{viewingClassDetails.name}</strong>.
                    </div>
                  );
                }

                return (
                  <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#FAF8F5', borderBottom: '1px solid #E5E7EB', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px', width: '90px', color: '#6B7280', fontWeight: 600 }}>Code</th>
                          <th style={{ padding: '10px 14px', color: '#252525', fontWeight: 600 }}>Student Name</th>
                          <th style={{ padding: '10px 14px', color: '#6B7280', fontWeight: 600 }}>Gender</th>
                          <th style={{ padding: '10px 14px', color: '#252525', fontWeight: 600 }}>Guardian / Parent</th>
                          <th style={{ padding: '10px 14px', color: '#6B7280', fontWeight: 600 }}>Parent Contact</th>
                          <th style={{ padding: '10px 14px', color: '#6B7280', fontWeight: 600 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map((st, idx) => (
                          <tr key={st.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                            <td style={{ padding: '10px 14px', color: '#6B7280', fontWeight: 600, fontSize: '12px' }}>
                              {st.studentCode || '—'}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#7B2525' }}>
                              {st.name}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#4B5563', fontSize: '12px', textTransform: 'capitalize' }}>
                              {st.gender || 'male'}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#374151' }}>
                              {st.parentName || '—'}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#6B7280', fontSize: '12px' }}>
                              {st.parentPhone ? `📞 ${st.parentPhone}` : '—'}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span className={`badge badge-${st.status === 'active' ? 'active' : 'trial'}`} style={{ fontSize: '11px' }}>
                                {st.status || 'Active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                {canEdit && (
                  <button 
                    type="button" 
                    onClick={() => { const target = viewingClassDetails; setViewingClassDetails(null); openEditModal(target); }} 
                    className="btn btn-outline"
                  >
                    ✏️ Edit Class Details
                  </button>
                )}
                <button type="button" onClick={() => setViewingClassDetails(null)} className="btn btn-primary">
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Add / Edit Class Modal */}
      {isModalOpen && canEdit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                {editingClass ? 'Edit Class Level' : 'Add New Class Level'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveClass} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Class Name *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Hifz, Class 1, Nazira, Aalimiyyah" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Section</label>
                  <input type="text" className="input-field" placeholder="A, B, C" value={section} onChange={e => setSection(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Medium</label>
                  <input type="text" className="input-field" placeholder="Arabic / English" value={medium} onChange={e => setMedium(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Class Teacher Name</label>
                <input type="text" className="input-field" placeholder="e.g. Maulana Ibrahim" value={classTeacherName} onChange={e => setClassTeacherName(e.target.value)} />
              </div>

              {/* Select Subjects Taught in Class */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#252525' }}>
                  Assign Subjects Taught in this Class
                </label>
                
                {availableSubjects.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', backgroundColor: '#FAF9F7', borderRadius: '10px', border: '1px solid #E5E7EB', maxHeight: '130px', overflowY: 'auto' }}>
                    {availableSubjects.map(sub => {
                      const isSelected = selectedSubjects.includes(sub.name);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => toggleSubjectSelect(sub.name)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: isSelected ? '1.5px solid #7B2525' : '1px solid #D1D5DB',
                            backgroundColor: isSelected ? '#7B2525' : '#FFFFFF',
                            color: isSelected ? '#FFFFFF' : '#374151',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSelected && <Check size={13} />}
                          <span>{sub.name}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
                    No pre-created subjects found in Subjects Directory. Add subjects manually below:
                  </div>
                )}

                {/* Custom subject manual add */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Add custom subject (e.g. Tajweed)..."
                    value={customSubjectInput}
                    onChange={e => setCustomSubjectInput(e.target.value)}
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSubject}
                    className="btn btn-outline btn-sm"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    + Add
                  </button>
                </div>

                {selectedSubjects.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#6B7280', alignSelf: 'center' }}>Selected:</span>
                    {selectedSubjects.map(s => (
                      <span key={s} style={{ padding: '2px 8px', backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: '12px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {s}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => toggleSubjectSelect(s)} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Description / Notes</label>
                <textarea className="input-field" rows={2} placeholder="Optional syllabus or room details..." value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : editingClass ? 'Update Class' : 'Create Class'}
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
