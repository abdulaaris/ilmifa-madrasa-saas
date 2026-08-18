import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { academicYearService } from '../../services/academicYearService';
import { studentService } from '../../services/studentService';
import { AcademicYear, Student } from '../../types';
import { 
  CalendarRange, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  X, 
  Edit3, 
  Plus, 
  Trash2, 
  Info,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

export const PrincipalAcademicYearPage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const params = useParams();
  const tenantSlug = params.tenantSlug || tenant?.slug || '';

  // Academic Year States
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formData, setFormData] = useState({
    name: '2026–2027',
    startDate: '2026-06-01',
    endDate: '2027-05-31',
    status: 'active' as 'active' | 'upcoming' | 'completed',
    description: 'Academic Session 2026–27'
  });
  const [saving, setSaving] = useState(false);

  // 1-Click Transition / Rollover Wizard States
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [rolloverTargetYearId, setRolloverTargetYearId] = useState('');
  const [promoteStudents, setPromoteStudents] = useState(true);
  const [graduateFinalYear, setGraduateFinalYear] = useState(true);
  const [carryForwardFees, setCarryForwardFees] = useState(true);
  const [executingRollover, setExecutingRollover] = useState(false);

  // Feedback Notification
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Initial Academic Year & Student Data
  const loadData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [yearsList, active, stuList] = await Promise.all([
        academicYearService.getAcademicYears(tenant.id),
        academicYearService.getActiveAcademicYear(tenant.id),
        studentService.getStudentsByTenant(tenant.id)
      ]);
      setAcademicYears(yearsList);
      setActiveYear(active);
      setStudents(stuList);

      // Default rollover target to first upcoming or next year
      const upcoming = yearsList.find(y => y.id !== active?.id && y.status === 'upcoming');
      if (upcoming) {
        setRolloverTargetYearId(upcoming.id);
      } else if (yearsList.length > 1) {
        const other = yearsList.find(y => y.id !== active?.id);
        if (other) setRolloverTargetYearId(other.id);
      }
    } catch (err) {
      console.error('Failed to load academic year data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant?.id]);

  const handleOpenAddModal = () => {
    setEditingYear(null);
    const nextYear = new Date().getFullYear();
    setFormData({
      name: `${nextYear}–${nextYear + 1}`,
      startDate: `${nextYear}-06-01`,
      endDate: `${nextYear + 1}-05-31`,
      status: academicYears.length === 0 ? 'active' : 'upcoming',
      description: `Academic Session ${nextYear}–${nextYear + 1}`
    });
    setIsModalOpen(true);
    setFeedbackMsg(null);
  };

  const handleOpenEditModal = (year: AcademicYear) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      startDate: year.startDate,
      endDate: year.endDate,
      status: year.status,
      description: year.description || ''
    });
    setIsModalOpen(true);
    setFeedbackMsg(null);
  };

  const handleSaveAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;

    if (!formData.name.trim() || !formData.startDate || !formData.endDate) {
      setFeedbackMsg({ type: 'error', text: 'Please fill in all required date fields.' });
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setFeedbackMsg({ type: 'error', text: 'To Date must be after From Date.' });
      return;
    }

    setSaving(true);
    try {
      await academicYearService.saveAcademicYear(tenant.id, {
        id: editingYear?.id,
        name: formData.name.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
        description: formData.description
      });
      await loadData();
      setIsModalOpen(false);
      setFeedbackMsg({ type: 'success', text: `Academic Year ${formData.name} saved successfully!` });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: 'Failed to save academic year. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRolloverModal = () => {
    if (!activeYear) return;
    
    // Check if target year exists
    let target = academicYears.find(y => y.id !== activeYear.id && y.status !== 'completed');
    if (!target) {
      target = academicYears.find(y => y.id !== activeYear.id);
    }
    if (target) {
      setRolloverTargetYearId(target.id);
    }
    setIsRolloverModalOpen(true);
    setFeedbackMsg(null);
  };

  const handleExecuteRollover = async () => {
    if (!tenant?.id || !activeYear) return;

    let targetId = rolloverTargetYearId;

    // If no target session exists, auto create the subsequent one
    if (!targetId || targetId === activeYear.id) {
      const matchYear = activeYear.name.match(/\d{4}/);
      const startYr = matchYear ? parseInt(matchYear[0], 10) + 1 : new Date().getFullYear() + 1;
      const created = await academicYearService.saveAcademicYear(tenant.id, {
        name: `${startYr}–${startYr + 1}`,
        startDate: `${startYr}-06-01`,
        endDate: `${startYr + 1}-05-31`,
        status: 'upcoming',
        description: `Academic Session ${startYr}–${startYr + 1}`
      });
      targetId = created.id;
    }

    setExecutingRollover(true);
    try {
      const res = await academicYearService.rolloverAcademicYear(tenant.id, {
        fromYearId: activeYear.id,
        toYearId: targetId,
        promoteStudents,
        graduateFinalYear,
        carryForwardFees
      });

      await loadData();
      setIsRolloverModalOpen(false);
      setFeedbackMsg({
        type: 'success',
        text: `🎉 Session Rollover Complete! ${res.promotedCount} students upgraded, ${res.graduatedCount} graduated, and new session calendar activated!`
      });
      setTimeout(() => setFeedbackMsg(null), 6000);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: 'Rollover operation failed. Please try again.' });
    } finally {
      setExecutingRollover(false);
    }
  };

  const handleSetActive = async (yearId: string) => {
    if (!tenant?.id) return;
    try {
      await academicYearService.setActiveAcademicYear(tenant.id, yearId);
      await loadData();
      setFeedbackMsg({ type: 'success', text: 'Active Academic Session updated successfully.' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteYear = async (yearId: string) => {
    if (!tenant?.id) return;
    if (academicYears.length <= 1) {
      alert('You must retain at least one academic year record.');
      return;
    }
    if (!window.confirm('Are you sure you want to remove this academic year record?')) return;

    try {
      await academicYearService.deleteAcademicYear(tenant.id, yearId);
      await loadData();
      setFeedbackMsg({ type: 'success', text: 'Academic session removed.' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const activeStudentCount = students.filter(s => s.status === 'active').length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '24px 16px 80px', maxWidth: '900px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          
          {/* TOP BACK LINK & HEADER */}
          <div style={{ marginBottom: '20px' }}>
            <Link 
              to={`/m/${tenantSlug}/principal/more`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#7B2525', marginBottom: '8px', textDecoration: 'none' }}
            >
              <ArrowLeft size={16} />
              <span>Back to More</span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarRange size={24} style={{ color: '#7B2525' }} />
                  <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#252525', margin: 0 }}>
                    Academic Year Management
                  </h1>
                </div>
                <p style={{ fontSize: '13px', color: '#666666', marginTop: '2px' }}>
                  {tenant?.name} • Session Dates, 1-Click Rollover & Class Promotion Wizard
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleOpenRolloverModal}
                  className="btn btn-outline"
                  style={{ fontSize: '13px', gap: '6px', borderColor: '#7B2525', color: '#7B2525', backgroundColor: 'rgba(123, 37, 37, 0.04)' }}
                >
                  <RefreshCw size={15} />
                  <span>Roll Over to Next Session</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="btn btn-primary"
                  style={{ fontSize: '13px', gap: '6px' }}
                >
                  <Plus size={16} />
                  <span>New Academic Year</span>
                </button>
              </div>
            </div>
          </div>

          {/* TOAST FEEDBACK NOTIFICATION */}
          {feedbackMsg && (
            <div 
              style={{ 
                marginBottom: '18px', 
                padding: '12px 16px', 
                borderRadius: '10px', 
                backgroundColor: feedbackMsg.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                border: `1px solid ${feedbackMsg.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
                color: feedbackMsg.type === 'success' ? '#065F46' : '#991B1B',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {feedbackMsg.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
                <span>{feedbackMsg.text}</span>
              </div>
              <button 
                type="button"
                onClick={() => setFeedbackMsg(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* ACTIVE ACADEMIC YEAR HERO CARD */}
          <div 
            className="card" 
            style={{ 
              padding: '22px', 
              backgroundColor: '#FFFFFF', 
              borderRadius: '18px', 
              border: '2px solid #7B2525', 
              boxShadow: '0 6px 20px rgba(123, 37, 37, 0.08)',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div 
                  style={{ 
                    width: '52px', 
                    height: '52px', 
                    borderRadius: '14px', 
                    backgroundColor: '#7B2525', 
                    color: '#FFFFFF', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(123, 37, 37, 0.25)'
                  }}
                >
                  <CalendarRange size={26} />
                </div>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(123, 37, 37, 0.08)', color: '#7B2525', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                    <Sparkles size={12} />
                    <span>CURRENT ACTIVE RUNNING SESSION</span>
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>
                    Academic Year {activeYear?.name || '2026–2027'}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0 0' }}>
                    {activeYear?.description || 'Standard Academic Session'} • ({activeStudentCount} Enrolled Students)
                  </p>
                </div>
              </div>

              <span className="badge badge-active" style={{ fontSize: '12px', padding: '6px 12px' }}>
                ✓ Running Active
              </span>
            </div>

            {/* Date Span Box */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', backgroundColor: '#FAF9F7', padding: '16px 18px', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Session From Date:</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} style={{ color: '#7B2525' }} />
                  <span>{activeYear ? activeYear.startDate : '2026-06-01'}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Session To Date:</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} style={{ color: '#7B2525' }} />
                  <span>{activeYear ? activeYear.endDate : '2027-05-31'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '14px', borderTop: '1px solid #F3F4F6' }}>
              <button
                type="button"
                onClick={handleOpenRolloverModal}
                className="btn btn-secondary"
                style={{ fontSize: '13px', padding: '8px 16px', gap: '6px' }}
              >
                <RefreshCw size={14} />
                <span>End Session & Roll Over</span>
              </button>

              <button
                type="button"
                onClick={activeYear ? () => handleOpenEditModal(activeYear) : handleOpenAddModal}
                className="btn btn-primary"
                style={{ fontSize: '13px', padding: '8px 18px', gap: '6px' }}
              >
                <Edit3 size={14} />
                <span>Set / Edit Dates (Date Picker)</span>
              </button>
            </div>
          </div>

          {/* ALL CONFIGURED SESSIONS LIST */}
          <div className="card" style={{ padding: '22px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  All Academic Sessions ({academicYears.length})
                </h3>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                  Switch active session or edit calendar date ranges
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#7B2525',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={14} />
                <span>New Session</span>
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>Loading academic sessions...</div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {academicYears.map((ay) => {
                  const isActive = ay.status === 'active';
                  return (
                    <div 
                      key={ay.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '14px 16px', 
                        backgroundColor: isActive ? 'rgba(123, 37, 37, 0.04)' : '#FAF9F7', 
                        borderRadius: '12px', 
                        border: `1px solid ${isActive ? 'rgba(123, 37, 37, 0.3)' : '#E5E7EB'}`,
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>{ay.name}</span>
                          {isActive ? (
                            <span style={{ fontSize: '10px', backgroundColor: '#ECFDF5', color: '#065F46', padding: '2px 6px', borderRadius: '4px', border: '1px solid #A7F3D0', fontWeight: 700 }}>
                              CURRENT ACTIVE
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', backgroundColor: '#F3F4F6', color: '#4B5563', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E5E7EB', fontWeight: 600, textTransform: 'uppercase' }}>
                              {ay.status}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '3px', fontFamily: 'monospace' }}>
                          📅 From: <strong>{ay.startDate}</strong> ➔ To: <strong>{ay.endDate}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => handleSetActive(ay.id)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#ECFDF5',
                              color: '#065F46',
                              border: '1px solid #A7F3D0',
                              cursor: 'pointer'
                            }}
                          >
                            Set as Active
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(ay)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#FFFFFF',
                            color: '#374151',
                            border: '1px solid #D1D5DB',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Edit3 size={12} />
                          <span>Edit Dates</span>
                        </button>

                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => handleDeleteYear(ay.id)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FCA5A5',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 1-CLICK ANNUAL ROLLOVER & PROMOTION WIZARD MODAL (SLIDE-UP)                */}
          {/* ========================================================================= */}
          {isRolloverModalOpen && (
            <div 
              className="modal-overlay" 
              onClick={e => { if (e.target === e.currentTarget) setIsRolloverModalOpen(false); }}
            >
              <div 
                className="modal-card" 
                style={{ maxWidth: '580px', padding: '24px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(123, 37, 37, 0.08)', color: '#7B2525', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RefreshCw size={18} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                      Annual Session Rollover Wizard
                    </h3>
                  </div>
                  <button onClick={() => setIsRolloverModalOpen(false)} className="btn btn-ghost btn-sm">
                    <X size={20} />
                  </button>
                </div>

                <div style={{ backgroundColor: '#FAF9F7', padding: '14px 16px', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>Session Transition:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#7B2525' }}>
                      {activeYear?.name || '2026–2027'} (Ending)
                    </span>
                    <ArrowRight size={16} style={{ color: '#9CA3AF' }} />
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#047857' }}>
                      {academicYears.find(y => y.id === rolloverTargetYearId)?.name || 'Next Academic Session (2027–2028)'}
                    </span>
                  </div>
                </div>

                {/* Target Session Selector */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                    Select / Confirm Target New Academic Year:
                  </label>
                  <select 
                    className="input-field"
                    value={rolloverTargetYearId}
                    onChange={e => setRolloverTargetYearId(e.target.value)}
                  >
                    {academicYears.filter(y => y.id !== activeYear?.id).map(y => (
                      <option key={y.id} value={y.id}>
                        {y.name} ({y.startDate} to {y.endDate}) — {y.status.toUpperCase()}
                      </option>
                    ))}
                    <option value="">+ Auto-Create Subsequent Academic Session</option>
                  </select>
                </div>

                {/* Automated Action Checkboxes */}
                <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                    Automated Rollover Actions:
                  </div>

                  {/* 1. Student Promotion */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={promoteStudents} 
                      onChange={e => setPromoteStudents(e.target.checked)} 
                      style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#7B2525' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                        🎓 Promote Students to Next Class Level ({activeStudentCount} Students)
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        Automatically upgrades Class 1 ➔ Class 2, Class 2 ➔ Class 3, Nazira ➔ Hifz A, etc.
                      </div>
                    </div>
                  </label>

                  {/* 2. Graduate Final Year */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={graduateFinalYear} 
                      onChange={e => setGraduateFinalYear(e.target.checked)} 
                      style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#7B2525' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                        🏆 Graduate Highest Class / Completed Students
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        Marks final terminal class / Hifz complete students as 'Graduated / Alumni'.
                      </div>
                    </div>
                  </label>

                  {/* 3. Fee Carryover */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={carryForwardFees} 
                      onChange={e => setCarryForwardFees(e.target.checked)} 
                      style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#7B2525' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                        💳 Carry Forward Pending Fee Arrears
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        Preserves unpaid fee records as starting balance in new academic ledger.
                      </div>
                    </div>
                  </label>

                  {/* 4. Safe Archiving */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#ECFDF5', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                    <ShieldCheck size={16} style={{ color: '#047857' }} />
                    <span style={{ fontSize: '12px', color: '#065F46', fontWeight: 600 }}>
                      Past exam report cards & attendance logs are safely locked & permanently archived.
                    </span>
                  </div>
                </div>

                {/* Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '14px', borderTop: '1px solid #E5E7EB' }}>
                  <button type="button" onClick={() => setIsRolloverModalOpen(false)} className="btn btn-outline">
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleExecuteRollover} 
                    disabled={executingRollover} 
                    className="btn btn-primary"
                    style={{ gap: '6px', padding: '10px 20px' }}
                  >
                    {executingRollover ? (
                      <span>Rolling Over Session...</span>
                    ) : (
                      <>
                        <RefreshCw size={15} />
                        <span>🚀 Execute Rollover & Promotion</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SLIDE-UP MODAL (IDENTICAL TO STUDENTS PAGE)                               */}
          {/* ========================================================================= */}
          {isModalOpen && (
            <div 
              className="modal-overlay" 
              onClick={e => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
            >
              <div 
                className="modal-card" 
                style={{ maxWidth: '520px', padding: '24px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                    {editingYear ? 'Edit Academic Year Details' : 'Add New Academic Year'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost btn-sm">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSaveAcademicYear} style={{ display: 'grid', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                      Academic Year Name *
                    </label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. 2026–2027" 
                      value={formData.name} 
                      onChange={e => setFormData({ ...formData, name: e.target.value })} 
                      required 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                        From Date *
                      </label>
                      <input 
                        type="date" 
                        className="input-field" 
                        value={formData.startDate} 
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })} 
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                        To Date *
                      </label>
                      <input 
                        type="date" 
                        className="input-field" 
                        value={formData.endDate} 
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })} 
                        required 
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                      Session Status
                    </label>
                    <select 
                      className="input-field" 
                      value={formData.status} 
                      onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="active">Active (Current Running Session)</option>
                      <option value="upcoming">Upcoming Session</option>
                      <option value="completed">Completed (Archived)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                      Description / Remarks
                    </label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Standard Madrasa Academic Session" 
                      value={formData.description} 
                      onChange={e => setFormData({ ...formData, description: e.target.value })} 
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving} className="btn btn-primary">
                      {saving ? 'Saving...' : editingYear ? 'Update Academic Year' : 'Save Academic Year'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>

      <MobileNav />
    </div>
  );
};
