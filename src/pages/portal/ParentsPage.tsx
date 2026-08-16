import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { parentService } from '../../services/parentService';
import { studentService } from '../../services/studentService';
import { Parent, Student } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { EmptyState } from '../../components/common/EmptyState';
import { HeartHandshake, Plus, Search, X } from 'lucide-react';

export const ParentsPage: React.FC = () => {
  const { tenant } = useTenant();
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [mobile, setMobile] = useState('');
  const [relationship, setRelationship] = useState('Father');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (tenant?.id) {
      setLoading(true);
      const [pList, sList] = await Promise.all([
        parentService.getParentsByTenant(tenant.id),
        studentService.getStudentsByTenant(tenant.id)
      ]);
      setParents(pList);
      setStudents(sList);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant]);

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !name || !email || !pass) {
      setError('Please fill in Parent Name, Email, and Password.');
      return;
    }
    if (pass.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await parentService.createParent(tenant.id, {
        name,
        email,
        pass,
        mobile,
        relationship,
        studentIds: selectedStudentIds
      });

      setCreating(false);
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPass('');
      setMobile('');
      setSelectedStudentIds([]);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create parent account';
      setError(msg);
      setCreating(false);
    }
  };

  const toggleStudentSelection = (stId: string) => {
    if (selectedStudentIds.includes(stId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== stId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, stId]);
    }
  };

  const filteredParents = parents.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.email.toLowerCase().includes(search.toLowerCase())
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
                Parent Management
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                Parent Auth accounts and multi-child student linkage
              </p>
            </div>

            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
              <Plus size={18} />
              <span>Create Parent Account</span>
            </button>
          </div>

          {/* Search */}
          <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input 
                type="text"
                className="input-field"
                placeholder="Search parent name, email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Loading parents directory...</div>
          ) : filteredParents.length === 0 ? (
            <EmptyState 
              icon="👨‍👩‍👧‍👦"
              title="No Parent Accounts Found"
              description="Provision parent authentication accounts to allow parents to view attendance, fees, and results."
              actionLabel="+ Create Parent Account"
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Parent Name</th>
                      <th>Email & Mobile</th>
                      <th>Relationship</th>
                      <th>Linked Children</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParents.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, color: '#252525' }}>{p.name}</td>
                        <td>
                          <div style={{ fontSize: '13px', color: '#374151' }}>{p.email}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{p.mobile}</div>
                        </td>
                        <td style={{ fontSize: '13px' }}>{p.relationship}</td>
                        <td>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#7B2525' }}>
                            {p.studentIds?.length || 0} Linked Children
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-active">Active Auth</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                Provision Parent Auth Account
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

            <form onSubmit={handleCreateParent} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Parent Full Name *</label>
                <input type="text" className="input-field" placeholder="Syed Ahmed" value={name} onChange={e => setName(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Parent Email *</label>
                  <input type="email" className="input-field" placeholder="parent@gmail.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Initial Password *</label>
                  <input type="password" className="input-field" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Mobile Phone</label>
                  <input type="text" className="input-field" placeholder="+91 98765 43210" value={mobile} onChange={e => setMobile(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Relationship</label>
                  <select className="input-field" value={relationship} onChange={e => setRelationship(e.target.value)}>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>
              </div>

              {/* Linked Children Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Link Children (Select Multiple)</label>
                {students.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#666' }}>No students available to link. Add students first.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '6px', maxHeight: '140px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '8px' }}>
                    {students.map(s => {
                      const checked = selectedStudentIds.includes(s.id);
                      return (
                        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleStudentSelection(s.id)} />
                          <span>{s.name} ({s.classId})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={creating} className="btn btn-primary">
                  {creating ? 'Creating Account...' : 'Provision Parent Account'}
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
