import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, CheckCircle, ShieldCheck, Zap } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner: React.FC = () => {
  const { tenant } = useTenant();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // Check if already running in standalone mode (PWA installed)
    const isInStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(isInStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // If running in PWA standalone mode, never show prompt
    if (isInStandalone) {
      setShowModal(false);
      return;
    }

    // Listen for native beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Auto show modal on first load if not dismissed
      const dismissed = localStorage.getItem('pwa_install_dismissed_session');
      if (!dismissed) {
        setShowModal(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS or browsers where prompt event fires early/differently
    const dismissed = localStorage.getItem('pwa_install_dismissed_session');
    if (!isInStandalone && !dismissed) {
      // Small delay for smooth entry presentation
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 600);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      }
      setDeferredPrompt(null);
    }
    // Mark dismissed and close modal -> Proceed to Login Page
    localStorage.setItem('pwa_install_dismissed_session', 'true');
    setShowModal(false);
  };

  const handleCancelClick = () => {
    // Dismiss modal and proceed to Login Page
    localStorage.setItem('pwa_install_dismissed_session', 'true');
    setShowModal(false);
  };

  if (!showModal || isStandalone) return null;

  const appName = tenant?.name || 'Ilmifa Madrasa';
  const primaryColor = tenant?.branding?.primaryColor || '#7B2525';

  return (
    <div 
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        className="modal-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          maxWidth: '460px',
          width: '100%',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          border: '1px solid #E5E7EB',
          animation: 'fadeInOverlay 0.25s ease-out'
        }}
      >
        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div 
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              backgroundColor: primaryColor,
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 10px 24px ${primaryColor}40`,
              marginBottom: '14px'
            }}
          >
            <Smartphone size={36} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: 0 }}>
            Install {appName} App
          </h2>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '6px', lineHeight: '1.5' }}>
            Install the official Madrasa PWA on your phone for fast 1-tap access, offline reports & smooth experience.
          </p>
        </div>

        {/* Key Features List */}
        <div style={{ backgroundColor: '#FAF9F7', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1px solid #E5E7EB', display: 'grid', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={16} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
              Instant 1-Tap Home Screen Access
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={16} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
              Secure & Fast App Performance
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle size={16} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
              Offline Attendance & Marks Reports
            </div>
          </div>
        </div>

        {/* iOS Manual Guidance if applicable */}
        {isIOS && !deferredPrompt && (
          <div style={{ padding: '12px 14px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', color: '#1E40AF', fontSize: '12px', marginBottom: '20px', lineHeight: '1.4' }}>
            💡 <strong>iOS Safari User:</strong> Tap the <strong>Share button (Square with arrow)</strong> in Safari navigation bar, then select <strong>'Add to Home Screen'</strong> to install!
          </div>
        )}

        {/* Mandatory Action Buttons: Install App & Cancel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            type="button"
            onClick={handleCancelClick}
            className="btn btn-outline"
            style={{
              padding: '12px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '12px',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={handleInstallClick}
            className="btn btn-primary"
            style={{
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              color: '#FFFFFF',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 700,
              borderRadius: '12px',
              justifyContent: 'center',
              boxShadow: `0 4px 14px ${primaryColor}40`
            }}
          >
            <Download size={18} />
            <span>Install App</span>
          </button>
        </div>
      </div>
    </div>
  );
};
