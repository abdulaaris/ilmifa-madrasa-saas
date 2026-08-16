import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { timetableService } from '../../services/timetableService';
import { CLASS_OPTIONS } from '../../config/constants';
import { TimetableSlot } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { Clock, Plus, X } from 'lucide-react';

export const TimetablePage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [selectedClass, setSelectedClass] = useState(CLASS_OPTIONS[0]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState<TimetableSlot['dayOfWeek']>('Monday');
  const [startTime, setStartTime] = useState('08:00 AM');
  const [endTime, setEndTime] = useState('09:00 AM');
  const [subject, setSubject] = useState('Quran Recitation');
  const [teacherName, setTeacherName] = useState('Maulana Ibrahim');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (tenant?.id) {
      setLoading(true);
      const list = await timetableService.getTimetableByClass(tenant.id, selectedClass);
      setSlots(list);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant, selectedClass]);

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;
    setSaving(true);

    await timetableService.saveSlot(tenant.id, {
      classId: selectedClass,
      dayOfWeek,
      startTime,
      endTime,
      subject,
      teacherName
    });

    setSaving(false);
    setIsModalOpen(false);
    await loadData();
  };

  const days: TimetableSlot['dayOfWeek'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '28px 32px 80px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#252525', margin: 0 }}>
                Class Timetable Schedule
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                Weekly class periods & teacher schedules
              </p>
            </div>

            {user?.role === 'PRINCIPAL' && (
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                <Plus size={18} />
                <span>Add Timetable Slot</span>
              </button>
            )}
          </div>

          {/* Class Select Controls */}
          <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '4px' }}>Select Class Schedule</label>
            <select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ maxWidth: '300px' }}>
              {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Timetable Grid */}
          <div style={{ display: 'grid', gap: '16px' }}>
            {days.map(day => {
              const daySlots = slots.filter(s => s.dayOfWeek === day);
              return (
                <div key={day} className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#7B2525', marginBottom: '12px', borderBottom: '1px solid #ECE8E1', paddingBottom: '6px' }}>
                    {day}
                  </div>

                  {daySlots.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#9CA3AF', padding: '4px 0' }}>No periods scheduled</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                      {daySlots.map(slot => (
                        <div key={slot.id} style={{ padding: '10px 12px', backgroundColor: '#FAF9F7', border: '1px solid #E2DDD5', borderRadius: '8px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            <span>{slot.startTime} - {slot.endTime}</span>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#252525', marginTop: '2px' }}>{slot.subject}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>Teacher: {slot.teacherName}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Add Slot Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                Add Timetable Slot
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Day of Week</label>
                <select className="input-field" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value as TimetableSlot['dayOfWeek'])}>
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Start Time</label>
                  <input type="text" className="input-field" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>End Time</label>
                  <input type="text" className="input-field" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Subject Name</label>
                <input type="text" className="input-field" value={subject} onChange={e => setSubject(e.target.value)} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Assigned Teacher</label>
                <input type="text" className="input-field" value={teacherName} onChange={e => setTeacherName(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : 'Add Slot'}
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
