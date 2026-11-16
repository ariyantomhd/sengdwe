// src/utils/clientTelemetry.ts
import { Request } from 'express';

export interface ClientTelemetryData {
  ip: string;
  device: string;
  country: string | null;
  isVpn: boolean;
}

export function extractClientIp(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim();
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  const rawIp = req.socket?.remoteAddress || req.ip || '127.0.0.1';
  return rawIp.replace(/^::ffff:/, '');
}

export function parseUserAgentDevice(userAgentRaw?: string): string {
  const ua = userAgentRaw || '';
  if (!ua) return 'Unknown Device';

  let os = 'Unknown OS';
  if (/Windows NT 10\.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

  const deviceType = /Mobile|Android|iPhone|iPad/i.test(ua) ? 'Mobile' : 'Desktop';
  return `${deviceType} · ${os} (${browser})`;
}

export async function inspectClientTelemetry(req: Request): Promise<ClientTelemetryData> {
  const ip = extractClientIp(req);
  const device = parseUserAgentDevice(req.headers['user-agent']);

  // Skip lookup eksternal untuk localhost / private network
  if (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.')
  ) {
    return {
      ip,
      device,
      country: 'LOCAL',
      isVpn: false,
    };
  }

  try {
    // Menggunakan ip-api.com fields proxy & hosting (gratis tanpa API key untuk deteksi VPN/Datacenter)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,proxy,hosting`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (response.ok) {
      const json = (await response.json()) as {
        status?: string;
        countryCode?: string;
        proxy?: boolean;
        hosting?: boolean;
      };

      if (json.status === 'success') {
        return {
          ip,
          device,
          country: json.countryCode || null,
          isVpn: Boolean(json.proxy || json.hosting),
        };
      }
    }
  } catch {
    // Fallback aman jika timeout jaringan agar proses login/checkout tidak terblokir
  }

  return {
    ip,
    device,
    country: null,
    isVpn: false,
  };
}