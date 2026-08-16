import React, { useEffect, useState } from 'react';
import { pwaService } from '../../services/pwaService';

export const InstallPwaCard: React.FC = () => {
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSInstruction, setShowIOSInstruction] = useState<boolean>(false);

  useEffect(() => {
    pwaService.init();
    setIsInstalled(pwaService.isStandalone());

    const checkInstallable = () => {
      setCanInstall(pwaService.isInstallable());
    };

    checkInstallable();
    window.addEventListener('ilmifa_pwa_installable', checkInstallable);

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIpadOrIphone = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    if (isIpadOrIphone && !pwaService.isStandalone()) {
      setIsIOS(true);
    }

    return () => {
      window.removeEventListener('ilmifa_pwa_installable', checkInstallable);
    };
  }, []);

  const handleInstallClick = async () => {
    if (canInstall) {
      const installed = await pwaService.triggerInstall();
      if (installed) {
        setIsInstalled(true);
        setCanInstall(false);
      }
    } else if (isIOS) {
      setShowIOSInstruction(!showIOSInstruction);
    }
  };

  if (isInstalled) {
    return (
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        borderRadius: '10px',
        backgroundColor: '#ECFDF5',
        border: '1px solid #A7F3D0',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        color: '#065F46'
      }}>
        <span>📱</span>
        <span><strong>App Installed</strong> — Accessing in Standalone PWA Mode</span>
      </div>
    );
  }

  if (!canInstall && !isIOS) {
    return null;
  }

  return (
    <div style={{
      marginTop: '20px',
      padding: '16px',
      borderRadius: '12px',
      backgroundColor: '#FAF8F5',
      border: '1px solid #EEE0CC',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#7B2525',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            flexShrink: 0
          }}>
            📱
          </div>
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#252525', margin: 0 }}>Install iLmiFa</h4>
            <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Fast home screen access</p>
          </div>
        </div>
        <button
          onClick={handleInstallClick}
          className="btn btn-primary btn-sm"
          style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px' }}
        >
          {canInstall ? 'Install App' : 'How to Install'}
        </button>
      </div>

      {isIOS && showIOSInstruction && (
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #E2DDD5', fontSize: '12px', color: '#4B5563', lineHeight: '1.4' }}>
          Tap <strong>Share</strong> (bottom bar) → select <strong>"Add to Home Screen"</strong>.
        </div>
      )}
    </div>
  );
};
