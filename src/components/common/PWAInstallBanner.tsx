import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, CheckCircle, ShieldCheck, Zap, ArrowRight, Share, MoreVertical, Compass } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner: React.FC = () => {
  const { tenant } = useTenant();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
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

    if (isInStandalone) {
      setShowModal(false);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowModal(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show modal on portal arrival if not running as standalone
    const timer = setTimeout(() => {
      setShowModal(true);
    }, 400);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
          setShowModal(false);
          return;
        }
      } catch (err) {
        console.log('Error triggering PWA prompt:', err);
      }
    }
    
    // If native prompt wasn't triggered or failed, show interactive installation guide!
    setShowGuide(true);
  };

  const handleCancelClick = () => {
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
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
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          position: 'relative',
          border: '1px solid #E5E7EB',
          animation: 'fadeInOverlay 0.25s ease-out'
        }}
      >
        {!showGuide ? (
          <>
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
                Install official Madrasa App on your device for fast 1-tap launch, offline access & full-screen portal.
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
          </>
        ) : (
          /* Step-by-Step Interactive Installation Guide */
          <>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div 
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}
              >
                <Compass size={28} />
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>
                Easy 2-Step Installation Guide
              </h3>
              <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                Follow these simple steps in your browser to add {appName} to your home screen:
              </p>
            </div>

            {isIOS ? (
              /* iOS Safari Instructions */
              <div style={{ backgroundColor: '#FAF9F7', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1px solid #E5E7EB', display: 'grid', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: primaryColor, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Tap the <strong>Share Button</strong> <Share size={15} style={{ display: 'inline', verticalAlign: 'middle', color: '#2563EB' }} /> in Safari bottom toolbar.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: primaryColor, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Scroll down and tap <strong>'Add to Home Screen'</strong> <Download size={15} style={{ display: 'inline', verticalAlign: 'middle', color: '#059669' }} />.
                  </div>
                </div>
              </div>
            ) : (
              /* Android Chrome & Desktop Instructions */
              <div style={{ backgroundColor: '#FAF9F7', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1px solid #E5E7EB', display: 'grid', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: primaryColor, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Tap top-right <strong>Browser Menu (⋮)</strong> <MoreVertical size={16} style={{ display: 'inline', verticalAlign: 'middle', color: '#4B5563' }} /> or address bar install icon.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: primaryColor, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Select <strong>'Add to Home screen'</strong> or <strong>'Install App'</strong>.
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleCancelClick}
              className="btn btn-primary"
              style={{
                width: '100%',
                backgroundColor: primaryColor,
                borderColor: primaryColor,
                color: '#FFFFFF',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 700,
                borderRadius: '12px',
                justifyContent: 'center',
                boxShadow: `0 4px 14px ${primaryColor}40`
              }}
            >
              <span>Continue to Login Page</span>
              <ArrowRight size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
