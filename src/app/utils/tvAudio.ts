import type { TvAudioSettings, TvAudioTrack, TvEventSoundType } from '../context/AppContext';

export const TV_AUDIO_ACCEPT = '.mp3,.wav,.ogg,.m4a,.aac,.webm,.mp4';

const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/aac',
  'audio/mp4',
  'audio/webm',
  'video/mp4',
]);

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm', '.mp4'];

const MAX_AUDIO_FILE_SIZE_BYTES = Math.floor(20 * 1024 * 1024);
const MAX_AUDIO_TRACKS = 16;
const MAX_AUDIO_STORAGE_BYTES = Math.floor(280 * 1024 * 1024);

export const TV_EVENT_SOUND_LABELS: Record<TvEventSoundType, string> = {
  leaderChange: 'Новый лидер',
  mvpChange: 'Новый MVP',
  bigPoints: 'Крупные баллы',
  topEntry: 'Выход в топ',
  bottomDrop: 'Последнее место',
};

function normalizeName(name: string) {
  return name.replace(/\.[^.]+$/, '').trim() || 'Audio Track';
}

function estimateIncomingDataUrlSize(file: File) {
  const encodedBodyLength = Math.ceil(file.size / 3) * 4;
  const prefixLength = 64;
  return encodedBodyLength + prefixLength;
}

export function estimateAudioStorageBytes(tracks: TvAudioTrack[]) {
  return tracks.reduce((sum, track) => sum + (track.size || track.dataUrl?.length || 0), 0);
}

export function validateAudioFile(file: File, settings: TvAudioSettings): string | null {
  const fileName = file.name.toLowerCase();
  const extAllowed = AUDIO_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  const mimeAllowed = AUDIO_MIME_TYPES.has(file.type);

  if (!mimeAllowed && !extAllowed) {
    return 'Поддерживаются только MP3, WAV, OGG, M4A, AAC, WEBM и MP4.';
  }

  if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
    return 'Файл слишком большой. Максимум 20 МБ на один трек.';
  }

  if (settings.tracks.length >= MAX_AUDIO_TRACKS) {
    return `Достигнут лимит треков (${MAX_AUDIO_TRACKS}). Удалите лишние.`;
  }

  const projectedStorage = estimateAudioStorageBytes(settings.tracks) + estimateIncomingDataUrlSize(file);
  if (projectedStorage > MAX_AUDIO_STORAGE_BYTES) {
    return 'Недостаточно места для хранения аудио. Удалите старые треки или загрузите более легкий файл.';
  }

  return null;
}

export function fileToAudioDataUrl(file: File): Promise<string> {
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

export function createAudioTrack(file: File, dataUrl: string): TvAudioTrack {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: normalizeName(file.name),
    dataUrl,
    mimeType: file.type || 'audio/mpeg',
    size: file.size,
    createdAt: Date.now(),
  };
}

export function createStoredAudioTrack(file: File, storageId: string): TvAudioTrack {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: normalizeName(file.name),
    storageId,
    mimeType: file.type || 'audio/mpeg',
    size: file.size,
    createdAt: Date.now(),
  };
}

export function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${size} B`;
}

export function formatMediaDuration(seconds?: number | null) {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) {
    return '--:--';
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
