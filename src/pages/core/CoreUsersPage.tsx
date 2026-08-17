import React, { useEffect, useState } from 'react';
import { userService } from '../../services/userService';
import { UserProfile, UserStatus } from '../../types';
import { Header } from '../../components/common/Header';
import { Sidebar } from '../../components/common/Sidebar';
import { MobileNav } from '../../components/common/MobileNav';
import { Users, Search, Shield, User, GraduationCap, HeartHandshake } from 'lucide-react';

export const CoreUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const list = await userService.getAllUsers();
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (uid: string, status: UserStatus) => {
    await userService.updateUserStatus(uid, status);
    await loadData();
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName.toLowerCase().includes(search.toLowerCase()) ||
                          u.email.toLowerCase().includes(search.toLowerCase()) ||
                          (u.tenantId && u.tenantId.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F5F2' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '28px 32px 80px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#252525', margin: 0 }}>
              Platform Users Directory
            </h1>
            <p style={{ fontSize: '14px', color: '#666666', marginTop: '4px' }}>
              All Firebase Authenticated platform users across all Madrasa tenants
            </p>
          </div>

          {/* Search & Role Filter */}
          <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input 
                type="text"
                className="input-field"
                placeholder="Search user name, email, tenantId..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>

            <div className="action-bar-scrollable">
              {['all', 'SUPER_ADMIN', 'PRINCIPAL', 'TEACHER', 'PARENT'].map(role => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`btn btn-sm ${roleFilter === role ? 'btn-primary' : 'btn-outline'}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  {role.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#666' }}>Loading users database...</div>
            ) : (
              <div className="table-container" style={{ border: 'none', WebkitOverflowScrolling: 'touch' }}>
                <table className="custom-table" style={{ minWidth: '600px' }}>
                  <thead>
                    <tr>
                      <th>User Name & Email</th>
                      <th>Role</th>
                      <th>Tenant ID</th>
                      <th>Created Date</th>
                      <th>Account Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.uid}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#252525' }}>{u.displayName}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{u.email}</div>
                        </td>
                        <td>
                          <span style={{ 
                            padding: '3px 10px', 
                            borderRadius: '999px', 
                            fontSize: '12px', 
                            fontWeight: 600,
                            backgroundColor: u.role === 'SUPER_ADMIN' ? '#FEE2E2' : u.role === 'PRINCIPAL' ? '#FEF3C7' : u.role === 'TEACHER' ? '#E0E7FF' : '#ECFDF5',
                            color: u.role === 'SUPER_ADMIN' ? '#991B1B' : u.role === 'PRINCIPAL' ? '#92400E' : u.role === 'TEACHER' ? '#3730A3' : '#065F46'
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: u.tenantId ? '#7B2525' : '#9CA3AF' }}>
                          {u.tenantId || 'GLOBAL'}
                        </td>
                        <td style={{ fontSize: '13px', color: '#6B7280' }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <select 
                            value={u.status}
                            onChange={e => handleStatusChange(u.uid, e.target.value as UserStatus)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              border: '1px solid #E5E7EB',
                              backgroundColor: u.status === 'active' ? '#ECFDF5' : '#FEF2F2',
                              color: u.status === 'active' ? '#047857' : '#B91C1C',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
};
