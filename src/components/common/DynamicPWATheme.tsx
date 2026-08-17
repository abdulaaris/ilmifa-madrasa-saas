import React, { useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';

export const DynamicPWATheme: React.FC = () => {
  const { tenant } = useTenant();

  useEffect(() => {
    if (!tenant) return;

    const tenantName = tenant.name || 'Ilmifa Madrasa';
    const primaryColor = tenant.branding?.primaryColor || '#7B2525';
    const logoUrl = tenant.branding?.logoUrl || '/favicon.svg';
    const startUrl = tenant.slug ? `/m/${tenant.slug}` : '/';

    // 1. Update Document Title
    document.title = `${tenantName} • Ilmifa Madrasa Portal`;

    // 2. Update Meta Theme Color
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', primaryColor);

    // 3. Update Favicon & Apple Touch Icon
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

    // 4. Dynamically generate and inject Tenant-specific PWA Manifest
    const dynamicManifest = {
      name: `${tenantName} - Madrasa Portal`,
      short_name: tenantName.length > 12 ? tenantName.substring(0, 12) : tenantName,
      start_url: startUrl,
      display: "standalone",
      theme_color: primaryColor,
      background_color: "#F7F5F2",
      orientation: "any",
      description: `Official ${tenantName} Madrasa Management Portal`,
      icons: [
        {
          src: logoUrl,
          sizes: "192x192 512x512",
          type: logoUrl.endsWith('.svg') ? "image/svg+xml" : "image/png",
          purpose: "any maskable"
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
  }, [tenant]);

  return null;
};
