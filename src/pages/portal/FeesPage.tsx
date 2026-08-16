import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { feeService } from '../../services/feeService';
import { studentService } from '../../services/studentService';
import { FeeRecord, Student } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { EmptyState } from '../../components/common/EmptyState';
import { CreditCard, Plus, Search, X } from 'lucide-react';

export const FeesPage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [month, setMonth] = useState('October 2026');
  const [feeAmount, setFeeAmount] = useState<number>(1500);
  const [paidAmount, setPaidAmount] = useState<number>(1500);
  const [dueDate, setDueDate] = useState('2026-10-10');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (tenant?.id) {
      setLoading(true);
      const [fList, sList] = await Promise.all([
        feeService.getFeesByTenant(tenant.id),
        studentService.getStudentsByTenant(tenant.id)
      ]);

      // If user is parent -> show ONLY linked children fees!
      if (user?.role === 'PARENT') {
        const parentChildIds = user.studentIds || [];
        setFees(fList.filter(f => parentChildIds.includes(f.studentId)));
      } else {
        setFees(fList);
      }

      setStudents(sList);
      if (sList.length > 0 && !selectedStudentId) {
        setSelectedStudentId(sList[0].id);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant, user]);

  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !selectedStudentId) return;
    setSaving(true);

    const st = students.find(s => s.id === selectedStudentId);

    await feeService.createFeeRecord(tenant.id, {
      studentId: selectedStudentId,
      studentName: st?.name || 'Student',
      classId: st?.classId || 'Hifz',
      month,
      feeAmount: Number(feeAmount),
      paidAmount: Number(paidAmount),
      dueDate,
      paymentDate: Number(paidAmount) > 0 ? new Date().toISOString().split('T')[0] : undefined
    });

    setSaving(false);
    setIsModalOpen(false);
    await loadData();
  };

  const filteredFees = fees.filter(f => 
    f.studentName.toLowerCase().includes(search.toLowerCase()) || 
    f.month.toLowerCase().includes(search.toLowerCase())
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
                Fee Management
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                Tuition fee records, dues, and payment statements
              </p>
            </div>

            {user?.role === 'PRINCIPAL' && (
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                <Plus size={18} />
                <span>Create Fee Invoice</span>
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
                placeholder="Search student name, month..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Loading fee records...</div>
          ) : filteredFees.length === 0 ? (
            <EmptyState 
              icon="💳"
              title="No Fee Records Found"
              description="No fee invoices or payment statements registered."
              actionLabel={user?.role === 'PRINCIPAL' ? "+ Create Fee Invoice" : undefined}
              onAction={user?.role === 'PRINCIPAL' ? () => setIsModalOpen(false) : undefined}
            />
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>Month</th>
                      <th>Fee Amount</th>
                      <th>Paid Amount</th>
                      <th>Balance Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFees.map(f => (
                      <tr key={f.id}>
                        <td style={{ fontWeight: 600, color: '#252525' }}>{f.studentName}</td>
                        <td>{f.classId}</td>
                        <td style={{ fontWeight: 500 }}>{f.month}</td>
                        <td style={{ fontWeight: 600 }}>₹{f.feeAmount.toLocaleString()}</td>
                        <td style={{ color: '#059669', fontWeight: 600 }}>₹{f.paidAmount.toLocaleString()}</td>
                        <td style={{ color: f.balance > 0 ? '#DC2626' : '#059669', fontWeight: 600 }}>₹{f.balance.toLocaleString()}</td>
                        <td>
                          <span className={`badge badge-${f.status === 'paid' ? 'active' : f.status === 'partial' ? 'trial' : 'suspended'}`}>
                            {f.status}
                          </span>
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

      {/* Add Fee Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                Create Fee Invoice
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateFee} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Select Student</label>
                <select className="input-field" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.classId})</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Month Period</label>
                <input type="text" className="input-field" value={month} onChange={e => setMonth(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Total Fee (₹)</label>
                  <input type="number" className="input-field" value={feeAmount} onChange={e => setFeeAmount(Number(e.target.value))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Paid Amount (₹)</label>
                  <input type="number" className="input-field" value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Due Date</label>
                <input type="date" className="input-field" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Creating...' : 'Create Invoice'}
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
