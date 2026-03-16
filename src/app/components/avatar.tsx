import { useMemo, useState } from 'react';
import { cn } from './ui/utils';

export const AVATAR_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif';

const AVATAR_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

const AVATAR_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

const MAX_STATIC_AVATAR_SIZE_BYTES = Math.floor(2.5 * 1024 * 1024);
const MAX_GIF_AVATAR_SIZE_BYTES = Math.floor(3.5 * 1024 * 1024);
const MAX_TOTAL_AVATAR_STORAGE_BYTES = Math.floor(4.8 * 1024 * 1024);

const IMAGE_PREFIXES = ['data:image/', 'http://', 'https://', 'blob:'];

export interface AvatarValidationOptions {
  currentStorageBytes?: number;
  replacingStorageBytes?: number;
}

function isGifFile(fileName: string, mimeType: string) {
  return mimeType === 'image/gif' || fileName.endsWith('.gif');
}

function estimateDataUrlSizeFromFile(file: File) {
  const encodedBodyLength = Math.ceil(file.size / 3) * 4;
  const prefixLength = 64;
  return encodedBodyLength + prefixLength;
}

function estimateStoredAvatarSize(avatar?: string) {
  if (!avatar || !avatar.startsWith('data:image/')) return 0;
  return avatar.length;
}

export function estimateAvatarStorageBytes(avatars: Array<string | undefined>) {
  return avatars.reduce((sum, avatar) => sum + estimateStoredAvatarSize(avatar), 0);
}

export function isImageAvatar(avatar?: string) {
  if (!avatar) return false;
  return IMAGE_PREFIXES.some((prefix) => avatar.startsWith(prefix));
}

export function validateAvatarFile(file: File, options?: AvatarValidationOptions): string | null {
  const fileName = file.name.toLowerCase();
  const extAllowed = AVATAR_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  const mimeAllowed = AVATAR_MIME_TYPES.has(file.type);

  if (!mimeAllowed && !extAllowed) {
    return 'Поддерживаются только PNG, JPG, JPEG, WEBP и GIF.';
  }

  const gif = isGifFile(fileName, file.type);
  const sizeLimit = gif ? MAX_GIF_AVATAR_SIZE_BYTES : MAX_STATIC_AVATAR_SIZE_BYTES;
  const sizeLabel = gif ? '3.5 МБ для GIF' : '2.5 МБ для статичных изображений';

  if (file.size > sizeLimit) {
    return `Файл слишком большой. Максимум ${sizeLabel}.`;
  }

  const currentStorageBytes = options?.currentStorageBytes ?? 0;
  const replacingStorageBytes = options?.replacingStorageBytes ?? 0;
  const projectedStorage =
    Math.max(0, currentStorageBytes - replacingStorageBytes) + estimateDataUrlSizeFromFile(file);

  if (projectedStorage > MAX_TOTAL_AVATAR_STORAGE_BYTES) {
    return 'Недостаточно места для сохранения аватарки. Удалите старые тяжелые GIF или выберите файл меньше.';
  }

  return null;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Не удалось прочитать файл.'));
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла.'));
    reader.readAsDataURL(file);
  });
}

function getFallbackText(name?: string) {
  const normalized = (name || '').trim();
  if (!normalized) return '👤';
  return normalized.charAt(0).toUpperCase();
}

interface AvatarProps {
  avatar?: string;
  name?: string;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
}

export function Avatar({
  avatar,
  name,
  className,
  imageClassName,
  textClassName,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const isImage = isImageAvatar(avatar) && !hasError;
  const fallbackText = useMemo(() => getFallbackText(name), [name]);
  const avatarText = (avatar || '').trim();

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-full bg-slate-200 text-slate-700',
        className
      )}
    >
      {isImage ? (
        <img
          src={avatar}
          alt={name ? `Аватар ${name}` : 'Аватар'}
          className={cn('h-full w-full object-cover', imageClassName)}
          onError={() => setHasError(true)}
        />
      ) : (
        <span className={cn('font-semibold leading-none', textClassName)}>
          {avatarText || fallbackText}
        </span>
      )}
    </div>
  );
}