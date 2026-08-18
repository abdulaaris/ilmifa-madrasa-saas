import React, { useEffect, useState } from 'react';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { auditService } from '../../services/auditService';
import { tenantService } from '../../services/tenantService';
import { AuditLog, MadrasaTenant, AuditCategory } from '../../types';
import { 
  History, 
  Search, 
  Building2, 
  Filter, 
  Download, 
  RefreshCw, 
  Shield, 
  User, 
  Calendar, 
  Clock, 
  Key, 
  BookOpen, 
  CreditCard, 
  Settings, 
  Building,
  CheckCircle2,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';

export const CoreHistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [tenants, setTenants] = useState<MadrasaTenant[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadHistoryData = async () => {
    setLoading(true);
    const [fetchedLogs, fetchedTenants] = await Promise.all([
      auditService.getAllAuditLogs(),
      tenantService.getAllTenants()
    ]);
    setLogs(fetchedLogs);
    setTenants(fetchedTenants);
    setLoading(false);
  };

  useEffect(() => {
    loadHistoryData();
  }, []);

  const getCategoryIcon = (category: AuditCategory) => {
    switch (category) {
      case 'AUTHENTICATION': return <Key size={14} className="text-amber-600" />;
      case 'ACADEMIC': return <BookOpen size={14} className="text-blue-600" />;
      case 'FINANCE': return <CreditCard size={14} className="text-emerald-600" />;
      case 'ADMINISTRATION': return <Building size={14} className="text-purple-600" />;
      case 'SETTINGS': return <Settings size={14} className="text-rose-600" />;
      default: return <History size={14} />;
    }
  };

  const getCategoryBadgeStyle = (category: AuditCategory) => {
    switch (category) {
      case 'AUTHENTICATION': return { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' };
      case 'ACADEMIC': return { bg: '#DBEAFE', color: '#1E40AF', border: '#BFDBFE' };
      case 'FINANCE': return { bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0' };
      case 'ADMINISTRATION': return { bg: '#F3E8FF', color: '#6B21A8', border: '#E9D5FF' };
      case 'SETTINGS': return { bg: '#FFE4E6', color: '#9F1239', border: '#FECDD3' };
      default: return { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return { bg: '#7B2525', color: '#FFFFFF' };
      case 'PRINCIPAL': return { bg: '#059669', color: '#FFFFFF' };
      case 'TEACHER': return { bg: '#1E40AF', color: '#FFFFFF' };
      case 'PARENT': return { bg: '#7C3AED', color: '#FFFFFF' };
      default: return { bg: '#6B7280', color: '#FFFFFF' };
    }
  };

  const filteredLogs = logs.filter(log => {
    // 1. Madrasa Filter
    const matchesTenant = selectedTenantId === 'ALL' || log.tenantId === selectedTenantId;

    // 2. Category Filter
    const matchesCategory = selectedCategory === 'ALL' || log.actionCategory === selectedCategory;

    // 3. Search Query Filter
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      log.userName.toLowerCase().includes(q) ||
      log.userEmail.toLowerCase().includes(q) ||
      log.userRole.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      (log.tenantName && log.tenantName.toLowerCase().includes(q));

    return matchesTenant && matchesCategory && matchesSearch;
  });

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Log ID', 'Date & Time', 'Madrasa Tenant', 'User Name', 'Role', 'Email', 'Category', 'Action', 'Pin-to-Pin Details', 'IP Address'];
    const rows = filteredLogs.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString(),
      `"${l.tenantName || 'Core Platform'}"`,
      `"${l.userName}"`,
      l.userRole,
      l.userEmail,
      l.actionCategory,
      l.action,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress || 'Local Network'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `iLmiFa_Audit_History_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all history logs? Old demo data will be permanently wiped.')) {
      auditService.clearLocalHistory();
      setLogs([]);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '20px 16px 80px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {/* Header Title Section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ minWidth: 0, flex: '1 1 280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(123, 37, 37, 0.1)', color: '#7B2525', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <History size={22} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#252525', margin: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    Platform History & Audit Trail
                  </h1>
                  <p style={{ fontSize: '13px', color: '#666666', marginTop: '2px' }}>
                    Pin-to-pin details of all system activities, authentication, financial entries & Madrasa updates
                  </p>
                </div>
              </div>
            </div>

            {/* TOP ACTION BUTTONS - SMOOTH HORIZONTAL SLIDE ON MOBILE */}
            <div 
              className="no-scrollbar"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                overflowX: 'auto', 
                maxWidth: '100%', 
                WebkitOverflowScrolling: 'touch',
                paddingBottom: '4px',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
                flexShrink: 0
              }}
            >
              <button 
                onClick={handleClearLogs}
                className="btn btn-outline" 
                style={{ gap: '6px', fontSize: '13px', color: '#DC2626', borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', flexShrink: 0, whiteSpace: 'nowrap' }}
                title="Clear all local history logs"
              >
                <Trash2 size={15} />
                <span>Clear History</span>
              </button>

              <button 
                onClick={loadHistoryData} 
                className="btn btn-outline" 
                style={{ gap: '6px', fontSize: '13px', flexShrink: 0, whiteSpace: 'nowrap' }}
                title="Refresh Audit Logs"
              >
                <RefreshCw size={15} className={loading ? 'spin' : ''} />
                <span>Refresh</span>
              </button>

              <button 
                onClick={exportToCSV} 
                disabled={filteredLogs.length === 0}
                className="btn btn-primary" 
                style={{ gap: '8px', backgroundColor: '#059669', borderColor: '#059669', fontSize: '13px', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                <Download size={16} />
                <span>Export CSV Report</span>
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '16px 18px', backgroundColor: '#FFF', borderRadius: '14px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Logged Events</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', marginTop: '4px' }}>{logs.length}</div>
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '4px' }}>⚡ Real-time Tracking</div>
            </div>

            <div className="card" style={{ padding: '16px 18px', backgroundColor: '#FFF', borderRadius: '14px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Madrasas Monitored</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#7B2525', marginTop: '4px' }}>{tenants.length}</div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>Multi-Tenant Coverage</div>
            </div>

            <div className="card" style={{ padding: '16px 18px', backgroundColor: '#FFF', borderRadius: '14px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filtered Events</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>{filteredLogs.length}</div>
              <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600, marginTop: '4px' }}>Matching Filters</div>
            </div>

            <div className="card" style={{ padding: '16px 18px', backgroundColor: '#FFF', borderRadius: '14px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Status</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#059669', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} />
                <span>100% Encrypted</span>
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>Role-based Access</div>
            </div>
          </div>

          {/* Controls Bar: Stylish Madrasa Dropdown + Category Tabs + Search */}
          <div className="card" style={{ backgroundColor: '#FFF', borderRadius: '16px', padding: '18px 16px', border: '1px solid #E5E7EB', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
              
              {/* STYLISH MADRASA DROPDOWN SELECTOR */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px', minWidth: 0, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#7B2525', flexShrink: 0 }}>
                  <Building2 size={18} />
                  <span>Madrasa:</span>
                </div>
                <select
                  value={selectedTenantId}
                  onChange={e => setSelectedTenantId(e.target.value)}
                  className="input-field"
                  style={{
                    fontWeight: 600,
                    fontSize: '13px',
                    borderColor: '#7B2525',
                    backgroundColor: '#FAF9F7',
                    color: '#252525',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    cursor: 'pointer',
                    width: '100%',
                    minWidth: 0
                  }}
                >
                  <option value="ALL">🌐 All Madrasas (Global Core Platform)</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      🕌 {t.name} ({t.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* SEARCH INPUT */}
              <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 0, width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search by User, Email, Action, or Pin Details..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '36px', borderRadius: '10px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* CATEGORY FILTER PILL TABS - SMOOTH HORIZONTAL SLIDE ON MOBILE */}
            <div 
              className="no-scrollbar"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                overflowX: 'auto', 
                maxWidth: '100%',
                WebkitOverflowScrolling: 'touch',
                marginTop: '16px', 
                paddingTop: '14px', 
                borderTop: '1px solid #F3F4F6',
                paddingBottom: '4px',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginRight: '4px', flexShrink: 0 }}>Category:</span>
              {[
                { id: 'ALL', label: 'All History' },
                { id: 'AUTHENTICATION', label: '🔑 Auth & Logins' },
                { id: 'ACADEMIC', label: '📚 Academic & Attendance' },
                { id: 'FINANCE', label: '💳 Fee Transactions' },
                { id: 'ADMINISTRATION', label: '🏢 Madrasa Management' },
                { id: 'SETTINGS', label: '🎨 App Branding & Settings' }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: selectedCategory === cat.id ? 700 : 500,
                    backgroundColor: selectedCategory === cat.id ? '#7B2525' : '#F3F4F6',
                    color: selectedCategory === cat.id ? '#FFFFFF' : '#4B5563',
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* AUDIT LOG TABLE */}
          <div className="card" style={{ backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
                <div>Loading Pin-to-Pin History Audit Logs...</div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <History size={40} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151' }}>No History Logs Found</h3>
                <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>
                  No activity events match your selected Madrasa or category filters.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#FAF9F7', borderBottom: '1px solid #E5E7EB', textAlign: 'left', color: '#6B7280' }}>
                      <th style={{ padding: '14px 16px', fontWeight: 600 }}>Date & Time</th>
                      <th style={{ padding: '14px 16px', fontWeight: 600 }}>User & Role</th>
                      <th style={{ padding: '14px 16px', fontWeight: 600 }}>Madrasa Tenant</th>
                      <th style={{ padding: '14px 16px', fontWeight: 600 }}>Category & Action</th>
                      <th style={{ padding: '14px 16px', fontWeight: 600 }}>What Changed (Pin-to-Pin Details)</th>
                      <th style={{ padding: '14px 16px', fontWeight: 600 }}>IP & System</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, idx) => {
                      const badgeStyle = getCategoryBadgeStyle(log.actionCategory);
                      const roleStyle = getRoleBadgeStyle(log.userRole);
                      const isEven = idx % 2 === 0;

                      // Live lookup of real Madrasa Name from tenants state
                      const tenantObj = tenants.find(t => t.id === log.tenantId);
                      const realMadrasaName = tenantObj 
                        ? tenantObj.name 
                        : (log.tenantName && !log.tenantName.startsWith('MAD-') 
                            ? log.tenantName 
                            : (log.tenantId === 'CORE' || !log.tenantId ? 'iLmiFa Core Platform' : 'Madrasa Tenant'));

                      return (
                        <tr 
                          key={log.id} 
                          style={{ 
                            borderBottom: '1px solid #F3F4F6', 
                            backgroundColor: isEven ? '#FFFFFF' : '#FAFAFA',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          {/* Date & Time */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>
                              {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Clock size={12} />
                              <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>

                          {/* User & Role */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{log.userName}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>{log.userEmail}</div>
                            <span 
                              style={{ 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontSize: '10px', 
                                fontWeight: 700, 
                                backgroundColor: roleStyle.bg, 
                                color: roleStyle.color 
                              }}
                            >
                              {log.userRole}
                            </span>
                          </td>

                          {/* Madrasa Tenant */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#111827', fontSize: '13px' }}>
                              <Building2 size={15} style={{ color: '#7B2525' }} />
                              <span>{realMadrasaName}</span>
                            </div>
                            <div style={{ marginTop: '4px' }}>
                              <span 
                                style={{ 
                                  fontSize: '11px', 
                                  fontFamily: 'monospace', 
                                  fontWeight: 700, 
                                  color: '#7B2525', 
                                  backgroundColor: 'rgba(123, 37, 37, 0.08)', 
                                  padding: '2px 8px', 
                                  borderRadius: '6px',
                                  border: '1px solid rgba(123, 37, 37, 0.15)',
                                  display: 'inline-block'
                                }}
                              >
                                ID: {log.tenantId || 'CORE'}
                              </span>
                            </div>
                          </td>

                          {/* Category & Action */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                            <div 
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                padding: '4px 10px', 
                                borderRadius: '8px', 
                                backgroundColor: badgeStyle.bg, 
                                color: badgeStyle.color, 
                                border: `1px solid ${badgeStyle.border}`,
                                fontSize: '11px',
                                fontWeight: 700,
                                marginBottom: '4px'
                              }}
                            >
                              {getCategoryIcon(log.actionCategory)}
                              <span>{log.actionCategory}</span>
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563' }}>
                              {log.action}
                            </div>
                          </td>

                          {/* What Changed (Pin-to-Pin Details) */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'top', maxWidth: '400px' }}>
                            <div style={{ fontSize: '13px', color: '#1F2937', fontWeight: 500, lineHeight: 1.45, backgroundColor: '#FAF9F7', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                              📝 {log.details}
                            </div>
                          </td>

                          {/* IP Address */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', verticalAlign: 'top', fontSize: '11px', color: '#6B7280' }}>
                            <div>{log.ipAddress || '157.34.22.109'}</div>
                            <div style={{ color: '#9CA3AF', marginTop: '2px' }}>Verified Session</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
