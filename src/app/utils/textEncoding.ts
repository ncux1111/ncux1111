const windows1251CharToByteCache = new Map<string, number>();

function buildWindows1251Map() {
  if (windows1251CharToByteCache.size > 0 || typeof TextDecoder === 'undefined') {
    return windows1251CharToByteCache;
  }

  try {
    const decoder = new TextDecoder('windows-1251');

    for (let byte = 0; byte < 256; byte += 1) {
      windows1251CharToByteCache.set(decoder.decode(Uint8Array.of(byte)), byte);
    }
  } catch {
    windows1251CharToByteCache.clear();
  }

  return windows1251CharToByteCache;
}

export function looksLikeBrokenEncoding(value: string) {
  if (!value) return false;
  if (value.includes('\uFFFD')) return true;

  return /(Р.|С.|Ѓ.|ё|ї|вЂ|в„–|™|љ|ћ|ќ){2,}/.test(value);
}

export function decodeWindows1251Mojibake(value: string) {
  const map = buildWindows1251Map();
  if (map.size === 0) return null;

  const bytes: number[] = [];
  for (const char of value) {
    const byte = map.get(char);
    if (byte === undefined) {
      return null;
    }
    bytes.push(byte);
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    return null;
  }
}

export function normalizeUiText(value: string) {
  if (!looksLikeBrokenEncoding(value)) {
    return value;
  }

  const decoded = decodeWindows1251Mojibake(value);
  if (!decoded) {
    return value.replace(/\uFFFD+/g, '').trim() || value;
  }

  return decoded;
}
