import React from 'react';

export const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Loading iLmiFa Platform...' }) => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F7F5F2',
      color: '#252525',
      fontFamily: "'Inter', sans-serif",
      padding: '24px'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '16px',
        backgroundColor: '#7B2525',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        fontWeight: 'bold',
        marginBottom: '20px',
        boxShadow: '0 8px 24px rgba(123, 37, 37, 0.2)',
        animation: 'pulse 1.8s infinite ease-in-out'
      }}>
        iF
      </div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', color: '#7B2525', marginBottom: '8px' }}>
        iLmiFa
      </h2>
      <p style={{ fontSize: '14px', color: '#666', fontWeight: 400 }}>
        {message}
      </p>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.85; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
