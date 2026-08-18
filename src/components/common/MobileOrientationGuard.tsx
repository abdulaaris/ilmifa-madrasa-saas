import React, { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

export const MobileOrientationGuard: React.FC = () => {
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobileWidth = window.innerWidth <= 900;
      const isLandscape = window.innerWidth > window.innerHeight;
      setIsLandscapeMobile(isMobileWidth && isLandscape);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isLandscapeMobile) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#111827',
        color: '#FFFFFF',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center'
      }}
    >
      <div 
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          color: '#F87171',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          animation: 'bounce 2s infinite'
        }}
      >
        <Smartphone size={40} style={{ transform: 'rotate(90deg)' }} />
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#F9FAFB', marginBottom: '8px' }}>
        Please Rotate Your Device Vertically
      </h2>
      <p style={{ fontSize: '14px', color: '#9CA3AF', maxWidth: '360px', lineHeight: 1.5 }}>
        iLmiFa Portal is locked to <strong>Vertical Portrait Mode</strong> for the best mobile experience. Please turn your phone upright.
      </p>

      <div style={{ marginTop: '24px', padding: '8px 16px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.08)', fontSize: '12px', color: '#D1D5DB' }}>
        📱 Locked to Portrait Orientation
      </div>
    </div>
  );
};
