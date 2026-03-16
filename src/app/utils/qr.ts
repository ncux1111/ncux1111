import QRCode from 'qrcode';

export type PublicQrDisplayMode = 'none' | 'whatsapp' | 'telegram' | 'both';

export async function generateQrDataUrl(link: string) {
  const normalized = link.trim();
  if (!normalized) return null;

  try {
    return await QRCode.toDataURL(normalized, {
      margin: 1,
      width: 220,
      color: {
        dark: '#0f172a',
        light: '#0000',
      },
    });
  } catch {
    return null;
  }
}

export function buildMapLink(
  latitude?: string,
  longitude?: string,
  address?: string
) {
  const lat = latitude?.trim();
  const lng = longitude?.trim();

  if (lat && lng) {
    return `https://maps.google.com/?q=${encodeURIComponent(`${lat},${lng}`)}`;
  }

  if (address?.trim()) {
    return `https://maps.google.com/?q=${encodeURIComponent(address.trim())}`;
  }

  return null;
}
