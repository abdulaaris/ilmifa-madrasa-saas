import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { studentService } from '../../services/studentService';
import { CLASS_OPTIONS } from '../../config/constants';
import { Student } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { EmptyState } from '../../components/common/EmptyState';
import { Plus, Trash2, Search, X, Edit2 } from 'lucide-react';

import { classService } from '../../services/classService';

export const StudentsPage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [students, setStudents] = useState<Student[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>(CLASS_OPTIONS);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Security Check: Only Super Admin and Principal can Edit/Create/Delete
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'PRINCIPAL';

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [name, setName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [selectedClass, setSelectedClass] = useState(CLASS_OPTIONS[0]);
  const [section, setSection] = useState('A');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    if (tenant?.id) {
      setLoading(true);
      const [sList, cList] = await Promise.all([
        studentService.getStudentsByTenant(tenant.id),
        classService.getClassesByTenant(tenant.id)
      ]);
      setStudents(sList);
      if (cList.length > 0) {
        const names = cList.map(c => c.name);
        setAvailableClasses(names);
        setSelectedClass(names[0]);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant]);

  const openCreateModal = () => {
    setEditingStudent(null);
    setName('');
    setStudentCode('');
    setSelectedClass(CLASS_OPTIONS[0]);
    setSection('A');
    setParentName('');
    setParentPhone('');
    setIsModalOpen(true);
  };

  const openEditModal = (st: Student) => {
    setEditingStudent(st);
    setName(st.name);
    setStudentCode(st.studentCode);
    setSelectedClass(st.classId);
    setSection(st.section || 'A');
    setParentName(st.parentName || '');
    setParentPhone(st.parentPhone || '');
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !name) return;
    setCreating(true);

    if (editingStudent) {
      // Edit existing student
      await studentService.updateStudent(tenant.id, editingStudent.id, {
        name,
        studentCode,
        classId: selectedClass,
        section,
        parentName,
        parentPhone
      });
    } else {
      // Create new student
      const generatedCode = studentCode || `STU-${Math.floor(1000 + Math.random() * 9000)}`;
      await studentService.createStudent(tenant.id, {
        name,
        studentCode: generatedCode,
        dob: '2015-05-15',
        gender: 'male',
        classId: selectedClass,
        section,
        parentName,
        parentPhone,
        admissionDate: new Date().toISOString().split('T')[0],
        status: 'active'
      });
    }

    setCreating(false);
    setIsModalOpen(false);
    await loadData();
  };

  const handleDelete = async (studentId: string) => {
    if (tenant?.id && window.confirm('Are you sure you want to delete this student record?')) {
      await studentService.deleteStudent(tenant.id, studentId);
      await loadData();
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.studentCode.toLowerCase().includes(search.toLowerCase()) ||
                          (s.parentName && s.parentName.toLowerCase().includes(search.toLowerCase()));
    const matchesClass = classFilter === 'all' || s.classId === classFilter;
    return matchesSearch && matchesClass;
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
                Student Management
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                Enrolled students directory for {tenant?.name}
              </p>
            </div>

            {canEdit && (
              <button onClick={openCreateModal} className="btn btn-primary">
                <Plus size={18} />
                <span>Add New Student</span>
              </button>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input 
                type="text"
                className="input-field"
                placeholder="Search student name, code, parent..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>

            <select className="input-field" value={classFilter} onChange={e => setClassFilter(e.target.value)} style={{ width: 'auto' }}>
              <option value="all">All Classes</option>
              {availableClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Students Table */}
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Loading students list...</div>
          ) : filteredStudents.length === 0 ? (
            <EmptyState 
              icon="🎓"
              title="No Students Found"
              description="Add your first student to begin managing attendance, fees, and academic report cards."
              actionLabel={canEdit ? "+ Add Student" : undefined}
              onAction={canEdit ? openCreateModal : undefined}
            />
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Student Code</th>
                      <th>Student Name</th>
                      <th>Class & Section</th>
                      <th>Parent Info</th>
                      <th>Admission Date</th>
                      <th>Status</th>
                      {canEdit && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#7B2525' }}>{s.studentCode}</td>
                        <td style={{ fontWeight: 600, color: '#252525' }}>{s.name}</td>
                        <td>{s.classId} (Sec {s.section})</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{s.parentName || 'Unlinked'}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{s.parentPhone}</div>
                        </td>
                        <td style={{ fontSize: '13px', color: '#6B7280' }}>{s.admissionDate}</td>
                        <td>
                          <span className="badge badge-active">Active</span>
                        </td>
                        {canEdit && (
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => openEditModal(s)} className="btn btn-outline btn-sm" title="Edit Student">
                                <Edit2 size={14} />
                                <span>Edit</span>
                              </button>
                              <button onClick={() => handleDelete(s.id)} className="btn btn-ghost btn-sm" style={{ color: '#DC2626' }} title="Delete Student">
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

      {/* Add / Edit Student Modal */}
      {isModalOpen && canEdit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                {editingStudent ? 'Edit Student Details' : 'Add New Student'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Student Name *</label>
                <input type="text" className="input-field" placeholder="e.g. Aisha Rahman" value={name} onChange={e => setName(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Student Code</label>
                  <input type="text" className="input-field" placeholder="Auto-generated if empty" value={studentCode} onChange={e => setStudentCode(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Section</label>
                  <input type="text" className="input-field" value={section} onChange={e => setSection(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Class Level *</label>
                <select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                  {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Parent Name</label>
                  <input type="text" className="input-field" placeholder="Abdul Rahman" value={parentName} onChange={e => setParentName(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Parent Phone</label>
                  <input type="text" className="input-field" placeholder="+91 98765 43210" value={parentPhone} onChange={e => setParentPhone(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={creating} className="btn btn-primary">
                  {creating ? 'Saving...' : editingStudent ? 'Update Student' : 'Create Student'}
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
