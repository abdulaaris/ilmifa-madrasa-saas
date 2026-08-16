import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { Shield, ArrowRight, KeyRound } from 'lucide-react';

export const CoreLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both Email and Password.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const userProfile = await login(email, password);
      if (userProfile.role !== 'SUPER_ADMIN') {
        await authService.logout();
        setError('Access Restricted. Only Super Admin accounts can sign in to iLmiFa Core.');
        setLoading(false);
        return;
      }
      navigate('/core/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid login credentials.';
      setError(msg);
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your Super Admin email address above first.');
      return;
    }
    try {
      await authService.sendPasswordReset(email);
      setResetSent(true);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send password reset email.';
      setError(msg);
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
        maxWidth: '420px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '36px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
        border: '1px solid #E2DDD5'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
            fontWeight: 'bold',
            boxShadow: '0 6px 18px rgba(123, 37, 37, 0.2)'
          }}>
            iF
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#7B2525', margin: 0, letterSpacing: '-0.02em' }}>
            iLmiFa Core
          </h1>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
            Super Admin Platform Management
          </p>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '13px', marginBottom: '18px' }}>
            ⚠️ {error}
          </div>
        )}

        {resetSent && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', marginBottom: '18px' }}>
            ✓ Password reset email sent. Please check your inbox.
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#252525' }}>
              Super Admin Email
            </label>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#252525' }}>
                Password
              </label>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="btn btn-ghost btn-sm"
                style={{ padding: 0, color: '#7B2525', fontSize: '12px' }}
              >
                Forgot Password?
              </button>
            </div>
            <input 
              type="password"
              className="input-field"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg" style={{ marginTop: '8px' }}>
            {loading ? 'Authenticating...' : 'Sign In to iLmiFa Core'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #ECE8E1', textAlign: 'center', fontSize: '12px', color: '#9CA3AF' }}>
          Initial platform setup? <Link to="/setup" style={{ color: '#7B2525', fontWeight: 600 }}>Create First Admin Account</Link>
        </div>
      </div>
    </div>
  );
};
