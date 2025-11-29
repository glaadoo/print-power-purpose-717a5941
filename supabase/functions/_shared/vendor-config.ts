/**
 * Vendor Configuration Module
 * Centralizes vendor settings and mode management
 */

export type VendorFulfillmentMode = 'AUTO_API' | 'EMAIL_VENDOR' | 'MANUAL_EXPORT';

export interface VendorConfig {
  key: string;
  name: string;
  email?: string;
  apiBaseUrl?: string;
  apiKey?: string;
}

/**
 * Get fulfillment mode from environment
 * Defaults to AUTO_API if not set
 */
export function getVendorFulfillmentMode(): VendorFulfillmentMode {
  const mode = Deno.env.get('VENDOR_FULFILLMENT_MODE') as VendorFulfillmentMode;
  if (mode && ['AUTO_API', 'EMAIL_VENDOR', 'MANUAL_EXPORT'].includes(mode)) {
    return mode;
  }
  console.log('[VENDOR-CONFIG] No valid mode set, defaulting to AUTO_API');
  return 'AUTO_API';
}

/**
 * Get vendor config by key
 */
export function getVendorConfig(vendorKey: string): VendorConfig | null {
  const configs: Record<string, VendorConfig> = {
    sinalite: {
      key: 'sinalite',
      name: 'SinaLite',
      email: Deno.env.get('SINALITE_VENDOR_EMAIL') || Deno.env.get('VENDOR_NOTIFICATION_EMAIL'),
      apiBaseUrl: Deno.env.get('SINALITE_API_URL') || 'https://api.sinaliteuppy.com',
      apiKey: Deno.env.get('SINALITE_API_KEY'), // For consistency, though we use OAuth
    },
    scalablepress: {
      key: 'scalablepress',
      name: 'Scalable Press',
      email: Deno.env.get('SCALABLEPRESS_VENDOR_EMAIL') || Deno.env.get('VENDOR_NOTIFICATION_EMAIL'),
      apiBaseUrl: Deno.env.get('SCALABLEPRESS_API_BASE_URL') || 'https://api.scalablepress.com/v2',
      apiKey: Deno.env.get('SCALABLEPRESS_API_KEY'),
    },
    psrestful: {
      key: 'psrestful',
      name: 'PSRestful',
      email: Deno.env.get('PSRESTFUL_VENDOR_EMAIL') || Deno.env.get('VENDOR_NOTIFICATION_EMAIL'),
      apiBaseUrl: Deno.env.get('PSRESTFUL_API_BASE_URL'),
      apiKey: Deno.env.get('PSRESTFUL_API_KEY'),
    },
  };

  return configs[vendorKey] || null;
}

/**
 * Get default fallback vendor email
 */
export function getDefaultVendorEmail(): string {
  return Deno.env.get('VENDOR_NOTIFICATION_EMAIL') || 'orders@printpowerpurpose.com';
}