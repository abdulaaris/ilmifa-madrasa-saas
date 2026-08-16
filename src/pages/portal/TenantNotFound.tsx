import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowLeft } from 'lucide-react';

export const TenantNotFound: React.FC<{ slug?: string }> = ({ slug }) => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F7F5F2',
      padding: '24px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '40px 32px',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
        border: '1px solid #E2DDD5'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          backgroundColor: '#FEF2F2',
          color: '#DC2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: '28px'
        }}>
          <Building2 size={32} />
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#252525', marginBottom: '8px' }}>
          Madrasa Portal Not Found
        </h2>
        <p style={{ fontSize: '14px', color: '#666666', lineHeight: '1.6', marginBottom: '24px' }}>
          The Madrasa portal <strong>"{slug}"</strong> is not registered on the iLmiFa SaaS platform. Please verify the portal URL provided by your Madrasa administration.
        </p>
        <Link to="/core/login" className="btn btn-outline" style={{ display: 'inline-flex', gap: '8px', textDecoration: 'none' }}>
          <ArrowLeft size={16} />
          <span>Go to iLmiFa Platform Login</span>
        </Link>
      </div>
    </div>
  );
};
