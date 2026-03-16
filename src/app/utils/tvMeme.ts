import type { TvMemeClip, TvMemeSettings } from '../context/AppContext';

export const TV_MEME_VIDEO_ACCEPT = '.mp4,.webm';

const MEME_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
]);

const MEME_VIDEO_EXTENSIONS = ['.mp4', '.webm'];

const MAX_MEME_VIDEO_FILE_SIZE_BYTES = Math.floor(20 * 1024 * 1024);
const MAX_MEME_VIDEO_CLIPS = 80;
const MAX_MEME_VIDEO_STORAGE_BYTES = Math.floor(280 * 1024 * 1024);

function normalizeName(name: string) {
  return name.replace(/\.[^.]+$/, '').trim() || 'Meme Clip';
}

export function estimateMemeVideoStorageBytes(clips: TvMemeClip[]) {
  return clips.reduce((sum, clip) => sum + (clip.size || 0), 0);
}

export function validateMemeVideoFile(file: File, settings: TvMemeSettings): string | null {
  const fileName = file.name.toLowerCase();
  const extAllowed = MEME_VIDEO_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  const mimeAllowed = MEME_VIDEO_MIME_TYPES.has(file.type);

  if (!mimeAllowed && !extAllowed) {
    return 'Поддерживаются только MP4 и WEBM.';
  }

  if (file.size > MAX_MEME_VIDEO_FILE_SIZE_BYTES) {
    return 'Видео слишком большое. Максимум 20 МБ на один мем.';
  }

  if (settings.clips.length >= MAX_MEME_VIDEO_CLIPS) {
    return `Достигнут лимит видео-мемов (${MAX_MEME_VIDEO_CLIPS}). Удалите лишние.`;
  }

  const projectedStorage = estimateMemeVideoStorageBytes(settings.clips) + file.size;
  if (projectedStorage > MAX_MEME_VIDEO_STORAGE_BYTES) {
    return 'Недостаточно места для хранения видео. Удалите старые мемы или загрузите файл меньше.';
  }

  return null;
}

export function fileToVideoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Не удалось прочитать видео.'));
    };
    reader.onerror = () => reject(new Error('Ошибка чтения видео.'));
    reader.readAsDataURL(file);
  });
}

export function createMemeClip(file: File, options?: { dataUrl?: string; storageId?: string }): TvMemeClip {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: normalizeName(file.name),
    dataUrl: options?.dataUrl,
    storageId: options?.storageId,
    mimeType: file.type || 'video/mp4',
    size: file.size,
    createdAt: Date.now(),
  };
}

export function formatMediaFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${size} B`;
}
