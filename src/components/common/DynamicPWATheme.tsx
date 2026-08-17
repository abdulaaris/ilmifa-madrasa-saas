import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';

export const DynamicPWATheme: React.FC = () => {
  const { tenant } = useTenant();
  const location = useLocation();

  useEffect(() => {
    const isCoreAdmin = location.pathname.startsWith('/core');
    
    let appName = 'iLmiFa - Madrasa Management';
    let appShortName = 'iLmiFa';
    let startUrl = '/';
    let appScope = '/';
    let appId = 'ilmifa_portal_default';
    let primaryColor = '#7B2525';
    let logoUrl = '/pwa-192x192.png';
    let description = 'Multi-tenant Madrasa Management SaaS Platform';

    if (isCoreAdmin) {
      // 1. Super Admin Isolated PWA Profile
      appName = 'iLmiFa Core Admin';
      appShortName = 'iLmiFa Core';
      startUrl = '/core/login';
      appScope = '/core/';
      appId = 'ilmifa_core_super_admin';
      primaryColor = '#7B2525';
      logoUrl = '/pwa-192x192.png';
      description = 'iLmiFa Super Admin Master Management Platform';
      document.title = 'iLmiFa Core • Super Admin Platform';
    } else if (tenant) {
      // 2. Specific Customer Madrasa Tenant Isolated PWA Profile
      const tName = tenant.name || 'Madrasa Portal';
      appName = `${tName} App`;
      appShortName = tName.length > 12 ? tName.substring(0, 12) : tName;
      startUrl = `/m/${tenant.slug}/login`;
      appScope = `/m/${tenant.slug}/`;
      appId = `ilmifa_tenant_${tenant.slug}`;
      primaryColor = tenant.branding?.primaryColor || '#7B2525';
      logoUrl = tenant.branding?.logoUrl || '/pwa-192x192.png';
      description = `Official ${tName} Management Portal`;
      document.title = `${tName} • Madrasa Management Portal`;
    }

    // Update Meta Theme Color
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', primaryColor);

    // Update Favicon & Apple Touch Icon
    let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.setAttribute('rel', 'icon');
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = logoUrl;

    let appleTouchLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (!appleTouchLink) {
      appleTouchLink = document.createElement('link');
      appleTouchLink.setAttribute('rel', 'apple-touch-icon');
      document.head.appendChild(appleTouchLink);
    }
    appleTouchLink.href = logoUrl;

    // Dynamically generate W3C Isolated PWA Manifest per Tenant / Core Admin
    const dynamicManifest = {
      id: appId,
      name: appName,
      short_name: appShortName,
      start_url: startUrl,
      scope: appScope,
      display: "standalone",
      theme_color: primaryColor,
      background_color: "#F7F5F2",
      orientation: "any",
      description: description,
      icons: [
        {
          src: logoUrl,
          sizes: "192x192 512x512",
          type: logoUrl.endsWith('.svg') ? "image/svg+xml" : "image/png",
          purpose: "any maskable"
        },
        {
          src: "/pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        }
      ]
    };

    const stringManifest = JSON.stringify(dynamicManifest);
    const blob = new Blob([stringManifest], { type: 'application/manifest+json' });
    const manifestBlobUrl = URL.createObjectURL(blob);

    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.setAttribute('rel', 'manifest');
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = manifestBlobUrl;

    return () => {
      URL.revokeObjectURL(manifestBlobUrl);
    };
  }, [tenant, location.pathname]);

  return null;
};
