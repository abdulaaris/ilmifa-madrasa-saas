import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { noticeService } from '../../services/noticeService';
import { Notice } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { EmptyState } from '../../components/common/EmptyState';
import { Bell, Plus, X } from 'lucide-react';

export const NoticesPage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'teachers' | 'parents'>('all');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (tenant?.id && user) {
      setLoading(true);
      const list = await noticeService.getNoticesByRole(tenant.id, user.role);
      setNotices(list);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant, user]);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !user || !title || !content) return;
    setSaving(true);

    await noticeService.createNotice(tenant.id, {
      title,
      content,
      targetAudience,
      createdBy: user.uid,
      createdByName: user.displayName || user.email
    });

    setSaving(false);
    setIsModalOpen(false);
    setTitle('');
    setContent('');
    await loadData();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '28px 32px 80px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#252525', margin: 0 }}>
                Madrasa Notice Board
              </h1>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
                Official announcements and circulars
              </p>
            </div>

            {user?.role === 'PRINCIPAL' && (
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                <Plus size={18} />
                <span>Post New Notice</span>
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Loading notice board...</div>
          ) : notices.length === 0 ? (
            <EmptyState 
              icon="📢"
              title="No Notices Posted"
              description="No announcements or circulars posted on the notice board yet."
              actionLabel={user?.role === 'PRINCIPAL' ? "+ Post Notice" : undefined}
              onAction={user?.role === 'PRINCIPAL' ? () => setIsModalOpen(true) : undefined}
            />
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {notices.map(n => (
                <div key={n.id} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>{n.title}</h3>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        Posted by {n.createdByName} • {new Date(n.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="badge badge-trial" style={{ textTransform: 'capitalize' }}>
                      Audience: {n.targetAudience}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-line' }}>
                    {n.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Post Notice Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#252525', margin: 0 }}>
                Post Official Notice
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNotice} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Notice Title *</label>
                <input type="text" className="input-field" placeholder="e.g. Eid-ul-Fitr Holiday Announcement" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Target Audience</label>
                <select className="input-field" value={targetAudience} onChange={e => setTargetAudience(e.target.value as 'all' | 'teachers' | 'parents')}>
                  <option value="all">Everyone (All Users)</option>
                  <option value="teachers">Teachers Only</option>
                  <option value="parents">Parents Only</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Notice Content *</label>
                <textarea className="input-field" rows={4} placeholder="Enter full announcement body text..." value={content} onChange={e => setContent(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Posting...' : 'Post Notice'}
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
