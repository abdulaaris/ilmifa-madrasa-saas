import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { Shield, ArrowRight } from 'lucide-react';

export const SetupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Create initial Super Admin account
      await userService.createPrivilegedUser(
        email,
        password,
        name,
        'SUPER_ADMIN',
        null
      );

      // Authenticate as Super Admin
      await login(email, password);
      navigate('/core/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Setup failed';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F7F5F2',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '36px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            backgroundColor: '#7B2525',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            <Shield size={28} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#252525', margin: 0 }}>iLmiFa Initial Setup</h2>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
            Bootstrap the initial Platform Super Admin Account
          </p>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleCreateSuperAdmin} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Super Admin Name</label>
            <input 
              type="text"
              className="input-field"
              placeholder="System Administrator"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Admin Login Email</label>
            <input 
              type="email"
              className="input-field"
              placeholder="admin@ilmifa.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Secure Password</label>
            <input 
              type="password"
              className="input-field"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg" style={{ marginTop: '8px' }}>
            {loading ? 'Initializing Platform...' : 'Initialize iLmiFa Super Admin'}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
