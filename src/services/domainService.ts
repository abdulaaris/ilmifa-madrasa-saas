import { PLATFORM_DOMAIN, DEV_PORTAL_PREFIX } from '../config/constants';
import { MadrasaTenant } from '../types';
import { tenantService } from './tenantService';

export const domainService = {
  /**
   * Generates a URL-safe slug from a Madrasa name.
   * Example: "Noorul Hayath Madrasa" -> "noorul-hayath"
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/madrasa|madrasah/gi, '') // clean common suffix if desired
      .trim()
      .replace(/[^\w\s-]/g, '') // remove special chars
      .replace(/[\s_-]+/g, '-') // spaces & underscores to single hyphen
      .replace(/^-+|-+$/g, ''); // strip leading/trailing hyphens
  },

  /**
   * Generates customer portal URL
   */
  generatePortalUrl(slug: string): string {
    // In local dev / standard mode, use relative dev route /m/slug
    return `${DEV_PORTAL_PREFIX}${slug}`;
  },

  /**
   * Generates future production subdomain URL
   */
  generateSubdomainUrl(slug: string): string {
    return `https://${slug}.${PLATFORM_DOMAIN}`;
  },

  /**
   * Resolves tenant from current browser hostname or path
   */
  async resolveTenantFromSlug(slug: string): Promise<MadrasaTenant | null> {
    if (!slug) return null;
    return await tenantService.getTenantBySlug(slug);
  },

  /**
   * Resolves tenant from hostname (for future subdomains or custom domains)
   */
  async resolveTenantFromHost(host: string): Promise<MadrasaTenant | null> {
    const cleanHost = host.split(':')[0].toLowerCase();
    
    // Check if host is custom domain (e.g. noorulhayath.com)
    if (!cleanHost.endsWith(PLATFORM_DOMAIN) && cleanHost !== 'localhost' && cleanHost !== '127.0.0.1') {
      return await tenantService.getTenantByCustomDomain(cleanHost);
    }
    
    // Check if host is subdomain (e.g. noorul-hayath.ilmifa.com)
    if (cleanHost.endsWith(`.${PLATFORM_DOMAIN}`)) {
      const slug = cleanHost.replace(`.${PLATFORM_DOMAIN}`, '');
      return await tenantService.getTenantBySlug(slug);
    }

    return null;
  }
};
