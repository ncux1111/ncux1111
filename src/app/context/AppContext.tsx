import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useCrossWindowSync } from '../hooks/useCrossWindowSync';
import {
  createPasswordSecret,
  migrateLegacyPassword,
  resolvePasswordUpdate,
  type PasswordCredential,
} from '../utils/credentials';
import { isApiPersistenceEnabled } from '../services/api-client';
import { clearBootstrapCache, loadBootstrapCache } from '../services/bootstrap-cache';
import { logoutSession, restoreAuthSession } from '../services/auth-service';
import { saveAppStateApi, saveDirectoryStateApi } from '../services/server-api';

export interface Employee extends PasswordCredential {
  id: string;
  name: string;
  position: string;
  teamId: string;
  totalPoints: number;
  weeklyPoints: number;
  avatar?: string;
  salary?: number;
  login: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
}

export interface Admin extends PasswordCredential {
  id: string;
  name: string;
  login: string;
  isSuperAdmin?: boolean;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  category: string;
}

export type PointsOperationType = 'award' | 'penalty';

export interface PointsHistory {
  id: string;
  employeeId: string;
  employeeName: string;
  points: number;
  operationType: PointsOperationType;
  adminId?: string;
  adminLogin?: string;
  adminName: string;
  timestamp: Date;
  reason?: string;
}

export interface VisibilitySettings {
  showSalaries: boolean;
  showSalarySection: boolean;
  showServices: boolean;
  showPrizePool: boolean;
  showOtherEmployeesPoints: boolean;
  showMVP: boolean;
  showTeamRanking: boolean;
}

export type TvEventSoundType =
  | 'leaderChange'
  | 'mvpChange'
  | 'bigPoints'
  | 'topEntry'
  | 'bottomDrop';

export interface TvAudioTrack {
  id: string;
  name: string;
  dataUrl?: string;
  storageId?: string;
  mimeType: string;
  size: number;
  createdAt: number;
}

export interface TvAudioSettings {
  musicEnabled: boolean;
  eventSoundsEnabled: boolean;
  backgroundVolume: number;
  eventVolume: number;
  activeTrackId: string | null;
  playlistTrackIds: string[];
  eventSoundMap: Partial<Record<TvEventSoundType, string>>;
  tracks: TvAudioTrack[];
}

export interface TvMemeClip {
  id: string;
  name: string;
  dataUrl?: string;
  storageId?: string;
  mimeType: string;
  size: number;
  createdAt: number;
}

export interface TvMemeSettings {
  enabled: boolean;
  memeSoundEnabled: boolean;
  autoPlayEnabled: boolean;
  autoPlayRandom: boolean;
  autoPlayMinPoints: number;
  memeVolume: number;
  selectedClipId: string | null;
  selectedAudioTrackId: string | null;
  clips: TvMemeClip[];
}

export interface TvMemeTrigger {
  id: string;
  clipId: string;
  audioTrackId?: string | null;
  source: 'manual' | 'autoPoints';
  points?: number;
  operationType?: PointsOperationType;
  employeeId?: string;
  employeeName?: string;
  adminName?: string;
  reason?: string;
  createdAt: number;
}

export interface TriggerTvMemeOptions {
  audioTrackId?: string | null;
  source?: TvMemeTrigger['source'];
  points?: number;
  operationType?: PointsOperationType;
  employeeId?: string;
  employeeName?: string;
  adminName?: string;
  reason?: string;
}

export interface PointsActor {
  id?: string;
  name: string;
  login?: string;
}

export type CurrentUser = {
  id: string;
  name: string;
  role: 'admin' | 'employee';
  login?: string;
  mustChangePassword?: boolean;
};

interface AppContextType {
  employees: Employee[];
  admins: Admin[];
  teams: Team[];
  currentUser: CurrentUser | null;
  authReady: boolean;
  prizePool: number;
  soundEnabled: boolean;
  tvAudioSettings: TvAudioSettings;
  tvMemeSettings: TvMemeSettings;
  tvMemeTrigger: TvMemeTrigger | null;
  services: Service[];
  pointsHistory: PointsHistory[];
  visibilitySettings: VisibilitySettings;
  setEmployees: (employees: Employee[] | ((prev: Employee[]) => Employee[])) => void;
  setAdmins: (admins: Admin[] | ((prev: Admin[]) => Admin[])) => void;
  setTeams: (teams: Team[] | ((prev: Team[]) => Team[])) => void;
  setCurrentUser: (user: CurrentUser | null) => void;
  reloadFromServer: () => Promise<void>;
  setPrizePool: (amount: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setTvAudioSettings: (
    settings: TvAudioSettings | ((prev: TvAudioSettings) => TvAudioSettings)
  ) => void;
  setTvMemeSettings: (
    settings: TvMemeSettings | ((prev: TvMemeSettings) => TvMemeSettings)
  ) => void;
  setServices: (services: Service[] | ((prev: Service[]) => Service[])) => void;
  setPointsHistory: (history: PointsHistory[] | ((prev: PointsHistory[]) => PointsHistory[])) => void;
  setVisibilitySettings: (settings: VisibilitySettings) => void;
  handleAddPoints: (
    employeeId: string,
    points: number,
    admin: PointsActor,
    reason?: string
  ) => void;
  handleUpdateEmployee: (
    employeeId: string,
    newName: string,
    newAvatar?: string,
    newSalary?: number,
    newLogin?: string,
    newPassword?: string
  ) => Promise<void>;
  handleUpdateTeam: (teamId: string, newName: string) => void;
  handleAddEmployee: (
    name: string,
    position: string,
    teamId: string,
    avatar?: string,
    salary?: number,
    login?: string,
    password?: string
  ) => Promise<void>;
  handleDeleteEmployee: (employeeId: string) => void;
  triggerTvMeme: (clipId: string, options?: TriggerTvMemeOptions) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const EMPLOYEES_KEY = 'law-firm-employees';
const ADMINS_KEY = 'law-firm-admins';
const TEAMS_KEY = 'law-firm-teams';
const PRIZE_POOL_KEY = 'law-firm-prizePool';
const SERVICES_KEY = 'law-firm-services';
const HISTORY_KEY = 'law-firm-pointsHistory';
const VISIBILITY_KEY = 'law-firm-visibilitySettings';
const RATING_SYNC_KEY = 'law-firm-rating-data';
const CURRENT_USER_KEY = 'law-firm-current-user';
const TV_AUDIO_SETTINGS_KEY = 'law-firm-tv-audio-settings';
const TV_MEME_SETTINGS_KEY = 'law-firm-tv-meme-settings';

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

let windows1251CharToByteCache: Map<string, number> | null | undefined;

function getWindows1251CharToByteMap() {
  if (windows1251CharToByteCache !== undefined) {
    return windows1251CharToByteCache;
  }

  if (typeof TextDecoder === 'undefined') {
    windows1251CharToByteCache = null;
    return windows1251CharToByteCache;
  }

  try {
    const decoder = new TextDecoder('windows-1251');
    const map = new Map<string, number>();

    for (let byte = 0; byte < 256; byte += 1) {
      const char = decoder.decode(Uint8Array.of(byte));
      map.set(char, byte);
    }

    windows1251CharToByteCache = map;
    return windows1251CharToByteCache;
  } catch {
    windows1251CharToByteCache = null;
    return windows1251CharToByteCache;
  }
}

function looksLikeBrokenEncoding(value: string) {
  if (!value) return false;

  if (value.includes('\uFFFD')) return true;
  if (/(?:Р.|С.){2,}/.test(value)) return true;

  return false;
}

function decodeWindows1251Mojibake(value: string) {
  const map = getWindows1251CharToByteMap();
  if (!map) return null;

  const bytes: number[] = [];
  for (const char of value) {
    const byte = map.get(char);
    if (byte === undefined) {
      return null;
    }
    bytes.push(byte);
  }

  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
    return decoded;
  } catch {
    return null;
  }
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return '';

  const normalized = value.trim();
  if (!looksLikeBrokenEncoding(normalized)) {
    return normalized;
  }

  const decoded = decodeWindows1251Mojibake(normalized);
  if (decoded) {
    return decoded.trim();
  }

  return normalized.replace(/\uFFFD+/g, '').trim();
}

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseStorage<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Failed to save storage key: ${key}`, error);
    return false;
  }
}

function createBaseLogin(name: string, id: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14);
  if (normalized.length > 0) {
    return normalized;
  }

  return `user${id.replace(/[^a-z0-9]/gi, '').slice(-6) || '000001'}`;
}

function makeUniqueLogin(candidate: string, used: Set<string>) {
  const base = candidate.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  let next = base;
  let index = 1;

  while (used.has(next)) {
    next = `${base}${index}`;
    index += 1;
  }

  used.add(next);
  return next;
}

const initialTeams: Team[] = [
  { id: 'team1', name: '\u041a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u043e\u0435 \u043f\u0440\u0430\u0432\u043e', color: '#3b82f6' },
  { id: 'team2', name: '\u0413\u0440\u0430\u0436\u0434\u0430\u043d\u0441\u043a\u043e\u0435 \u043f\u0440\u0430\u0432\u043e', color: '#8b5cf6' },
];

const initialAdmins: Admin[] = [
  {
    id: 'admin1',
    name: '\u041e\u043b\u0435\u0433',
    login: 'oleg',
    passwordHash: 'zanqdm-sha256-v1:b3d588d2d57fe61ed0bf2db230066feba7126b836c43d71b9d6bc442fcd6d776',
    passwordSalt: 'zanqdm-admin1-seed',
    isSuperAdmin: true,
  },
  {
    id: 'admin2',
    name: '\u0410\u0439\u0431\u0430\u0440\u044b\u0441',
    login: 'aibarys',
    passwordHash: 'zanqdm-sha256-v1:1cc584dadcdba4df1d93802448cf5671daa593fa84991614715d5f13411d9ab5',
    passwordSalt: 'zanqdm-admin2-seed',
  },
];

const initialEmployees: Employee[] = [];

const initialServices: Service[] = [
  { id: 's1', name: '\u041a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u043e\u0435 \u043f\u0440\u0430\u0432\u043e', price: 150000, category: '\u041a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u043e\u0435 \u043f\u0440\u0430\u0432\u043e' },
  { id: 's2', name: '\u041a\u043e\u043d\u0441\u0443\u043b\u044c\u0442\u0430\u0446\u0438\u044f \u043f\u043e \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0443', price: 50000, category: '\u0413\u0440\u0430\u0436\u0434\u0430\u043d\u0441\u043a\u043e\u0435 \u043f\u0440\u0430\u0432\u043e' },
  { id: 's3', name: '\u0421\u0443\u0434\u0435\u0431\u043d\u043e\u0435 \u043f\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u0438\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e', price: 80000, category: '\u0413\u0440\u0430\u0436\u0434\u0430\u043d\u0441\u043a\u043e\u0435 \u043f\u0440\u0430\u0432\u043e' },
  { id: 's4', name: '\u041f\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u0438\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e \u0432 \u0441\u0443\u0434\u0435', price: 250000, category: '\u0421\u0443\u0434\u0435\u0431\u043d\u0430\u044f \u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0430' },
  { id: 's5', name: '\u0410\u0443\u0434\u0438\u0442 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432', price: 120000, category: '\u041a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u043e\u0435 \u043f\u0440\u0430\u0432\u043e' },
  { id: 's6', name: '\u041a\u043e\u043c\u043f\u043b\u0435\u043a\u0441\u043d\u043e\u0435 \u0441\u043e\u043f\u0440\u043e\u0432\u043e\u0436\u0434\u0435\u043d\u0438\u0435 \u0431\u0438\u0437\u043d\u0435\u0441\u0430', price: 300000, category: '\u041a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u043e\u0435 \u043f\u0440\u0430\u0432\u043e' },
];

const defaultVisibilitySettings: VisibilitySettings = {
  showSalaries: false,
  showSalarySection: false,
  showServices: false,
  showPrizePool: true,
  showOtherEmployeesPoints: true,
  showMVP: true,
  showTeamRanking: true,
};

function normalizeVisibility(raw: Partial<VisibilitySettings> | null | undefined): VisibilitySettings {
  return {
    showSalaries: raw?.showSalaries ?? defaultVisibilitySettings.showSalaries,
    showSalarySection: raw?.showSalarySection ?? defaultVisibilitySettings.showSalarySection,
    showServices: raw?.showServices ?? defaultVisibilitySettings.showServices,
    showPrizePool: raw?.showPrizePool ?? defaultVisibilitySettings.showPrizePool,
    showOtherEmployeesPoints:
      raw?.showOtherEmployeesPoints ?? defaultVisibilitySettings.showOtherEmployeesPoints,
    showMVP: raw?.showMVP ?? defaultVisibilitySettings.showMVP,
    showTeamRanking: raw?.showTeamRanking ?? defaultVisibilitySettings.showTeamRanking,
  };
}

const TV_EVENT_SOUND_TYPES: TvEventSoundType[] = [
  'leaderChange',
  'mvpChange',
  'bigPoints',
  'topEntry',
  'bottomDrop',
];

function clampVolume(value: unknown, fallback: number) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(1, Math.max(0, next));
}

function normalizeTvTrack(raw: unknown, index: number): TvAudioTrack | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<TvAudioTrack>;

  const id = normalizeString(candidate.id) || createId();
  const name = normalizeString(candidate.name) || `Track ${index + 1}`;
  const dataUrl = normalizeString(candidate.dataUrl);
  const storageId = normalizeString(candidate.storageId);
  const hasInlineData = dataUrl.startsWith('data:audio/') || dataUrl.startsWith('data:video/mp4');
  const hasStorage = storageId.length > 0;

  if (!hasInlineData && !hasStorage) {
    return null;
  }

  return {
    id,
    name,
    dataUrl: hasInlineData ? dataUrl : undefined,
    storageId: hasStorage ? storageId : undefined,
    mimeType: normalizeString(candidate.mimeType) || 'audio/mpeg',
    size: Math.max(0, toSafeNumber(candidate.size, hasInlineData ? dataUrl.length : 0)),
    createdAt: Math.max(0, toSafeNumber(candidate.createdAt, Date.now())),
  };
}

export const defaultTvAudioSettings: TvAudioSettings = {
  musicEnabled: true,
  eventSoundsEnabled: true,
  backgroundVolume: 0.38,
  eventVolume: 0.75,
  activeTrackId: null,
  playlistTrackIds: [],
  eventSoundMap: {},
  tracks: [],
};

export function normalizeTvAudioSettings(raw: unknown): TvAudioSettings {
  const source = raw && typeof raw === 'object' ? (raw as Partial<TvAudioSettings>) : {};

  const tracksSource = Array.isArray(source.tracks) ? source.tracks : [];
  const tracks = tracksSource
    .map((track, index) => normalizeTvTrack(track, index))
    .filter((track): track is TvAudioTrack => Boolean(track));

  const validTrackIds = new Set(tracks.map((track) => track.id));

  const playlistRaw = Array.isArray(source.playlistTrackIds) ? source.playlistTrackIds : [];
  const playlistTrackIds = playlistRaw
    .map((trackId) => normalizeString(trackId))
    .filter((trackId) => validTrackIds.has(trackId));

  const activeTrackCandidate = normalizeString(source.activeTrackId || '');
  const activeTrackId =
    activeTrackCandidate && validTrackIds.has(activeTrackCandidate)
      ? activeTrackCandidate
      : playlistTrackIds[0] || tracks[0]?.id || null;

  const eventSoundMap: Partial<Record<TvEventSoundType, string>> = {};
  const incomingMap =
    source.eventSoundMap && typeof source.eventSoundMap === 'object'
      ? (source.eventSoundMap as Record<string, unknown>)
      : {};

  TV_EVENT_SOUND_TYPES.forEach((eventType) => {
    const candidate = normalizeString(incomingMap[eventType]);
    if (candidate && validTrackIds.has(candidate)) {
      eventSoundMap[eventType] = candidate;
    }
  });

  return {
    musicEnabled: source.musicEnabled ?? defaultTvAudioSettings.musicEnabled,
    eventSoundsEnabled: source.eventSoundsEnabled ?? defaultTvAudioSettings.eventSoundsEnabled,
    backgroundVolume: clampVolume(source.backgroundVolume, defaultTvAudioSettings.backgroundVolume),
    eventVolume: clampVolume(source.eventVolume, defaultTvAudioSettings.eventVolume),
    activeTrackId,
    playlistTrackIds,
    eventSoundMap,
    tracks,
  };
}

function normalizeTvMemeClip(raw: unknown, index: number): TvMemeClip | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<TvMemeClip>;

  const id = normalizeString(candidate.id) || createId();
  const name = normalizeString(candidate.name) || `Meme ${index + 1}`;
  const dataUrl = normalizeString(candidate.dataUrl);
  const storageId = normalizeString(candidate.storageId);
  const hasInlineData = dataUrl.startsWith('data:video/');
  const hasStorage = storageId.length > 0;

  if (!hasInlineData && !hasStorage) {
    return null;
  }

  return {
    id,
    name,
    dataUrl: hasInlineData ? dataUrl : undefined,
    storageId: hasStorage ? storageId : undefined,
    mimeType: normalizeString(candidate.mimeType) || 'video/mp4',
    size: Math.max(0, toSafeNumber(candidate.size, hasInlineData ? dataUrl.length : 0)),
    createdAt: Math.max(0, toSafeNumber(candidate.createdAt, Date.now())),
  };
}

function clampPointsThreshold(value: unknown, fallback: number) {
  const next = Math.round(toSafeNumber(value, fallback));
  return Math.max(1, Math.min(1000, next));
}

export const defaultTvMemeSettings: TvMemeSettings = {
  enabled: true,
  memeSoundEnabled: true,
  autoPlayEnabled: false,
  autoPlayRandom: true,
  autoPlayMinPoints: 8,
  memeVolume: 0.8,
  selectedClipId: null,
  selectedAudioTrackId: null,
  clips: [],
};

export function normalizeTvMemeSettings(raw: unknown): TvMemeSettings {
  const source = raw && typeof raw === 'object' ? (raw as Partial<TvMemeSettings>) : {};

  const clipsSource = Array.isArray(source.clips) ? source.clips : [];
  const clips = clipsSource
    .map((clip, index) => normalizeTvMemeClip(clip, index))
    .filter((clip): clip is TvMemeClip => Boolean(clip));

  const validClipIds = new Set(clips.map((clip) => clip.id));
  const selectedClipCandidate = normalizeString(source.selectedClipId || '');
  const selectedClipId =
    selectedClipCandidate && validClipIds.has(selectedClipCandidate)
      ? selectedClipCandidate
      : clips[0]?.id || null;

  const selectedAudioTrackId = normalizeString(source.selectedAudioTrackId || '') || null;

  return {
    enabled: source.enabled ?? defaultTvMemeSettings.enabled,
    memeSoundEnabled: source.memeSoundEnabled ?? defaultTvMemeSettings.memeSoundEnabled,
    autoPlayEnabled: source.autoPlayEnabled ?? defaultTvMemeSettings.autoPlayEnabled,
    autoPlayRandom: source.autoPlayRandom ?? defaultTvMemeSettings.autoPlayRandom,
    autoPlayMinPoints: clampPointsThreshold(
      source.autoPlayMinPoints,
      defaultTvMemeSettings.autoPlayMinPoints
    ),
    memeVolume: clampVolume(source.memeVolume, defaultTvMemeSettings.memeVolume),
    selectedClipId,
    selectedAudioTrackId,
    clips,
  };
}

function normalizeAdmins(rawAdmins: unknown): Admin[] {
  const source = Array.isArray(rawAdmins) ? rawAdmins : [];
  const usedLogins = new Set<string>();

  const normalized = source.map((raw, index) => {
    const item = (raw || {}) as Partial<Admin> & Record<string, unknown>;

    const id = normalizeString(item.id) || `admin-${index + 1}`;
    const name = normalizeString(item.name) || `\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440 ${index + 1}`;
    const requestedLogin = normalizeString(item.login).toLowerCase();
    const login = makeUniqueLogin(requestedLogin || createBaseLogin(name, id), usedLogins);
    const passwordHash = normalizeString(item.passwordHash);
    const passwordSalt = normalizeString(item.passwordSalt);
    const legacyPassword =
      passwordHash && passwordSalt ? undefined : normalizeString(item.password) || '1234';

    return {
      id,
      name,
      login,
      password: legacyPassword,
      passwordHash: passwordHash || undefined,
      passwordSalt: passwordSalt || undefined,
      isSuperAdmin: Boolean(item.isSuperAdmin),
    } satisfies Admin;
  });

  if (normalized.length === 0) {
    return initialAdmins.map((admin) => ({ ...admin }));
  }

  if (!normalized.some((admin) => admin.isSuperAdmin)) {
    normalized[0] = { ...normalized[0], isSuperAdmin: true };
  }

  return normalized;
}

function normalizeEmployees(rawEmployees: unknown, teams: Team[]): Employee[] {
  const source = Array.isArray(rawEmployees) ? rawEmployees : [];
  const fallbackTeamId = teams[0]?.id || 'team1';
  const usedLogins = new Set<string>();

  return source.map((raw, index) => {
    const item = (raw || {}) as Partial<Employee> & Record<string, unknown>;

    const id = normalizeString(item.id) || createId();
    const name = normalizeString(item.name) || `Сотрудник ${index + 1}`;

    const requestedLogin = normalizeString(item.login).toLowerCase();
    const generatedLogin = createBaseLogin(name, id);
    const login = makeUniqueLogin(requestedLogin || generatedLogin, usedLogins);

    const passwordHash = normalizeString(item.passwordHash);
    const passwordSalt = normalizeString(item.passwordSalt);
    const legacyPassword =
      passwordHash && passwordSalt ? undefined : normalizeString(item.password) || '1234';
    const teamId = normalizeString(item.teamId) || fallbackTeamId;
    const avatar = normalizeString(item.avatar) || undefined;
    const salaryValue = toSafeNumber(item.salary, -1);

    return {
      id,
      name,
      position: normalizeString(item.position) || 'Сотрудник',
      teamId,
      totalPoints: toSafeNumber(item.totalPoints, 0),
      weeklyPoints: toSafeNumber(item.weeklyPoints, 0),
      avatar,
      salary: salaryValue >= 0 ? salaryValue : undefined,
      login,
      password: legacyPassword,
      passwordHash: passwordHash || undefined,
      passwordSalt: passwordSalt || undefined,
    };
  });
}

function normalizePointsOperationType(
  operationType: unknown,
  points: number
): PointsOperationType {
  const normalizedType = normalizeString(operationType).toLowerCase();
  if (normalizedType === 'penalty') return 'penalty';
  if (normalizedType === 'award') return 'award';
  return points < 0 ? 'penalty' : 'award';
}

function normalizeHistory(rawHistory: unknown): PointsHistory[] {
  const source = Array.isArray(rawHistory) ? rawHistory : [];

  return source
    .map((item: any) => {
      const points = toSafeNumber(item?.points, 0);
      if (!Number.isFinite(points) || points === 0) {
        return null;
      }

      const operationType = normalizePointsOperationType(item?.operationType, points);
      const signedPoints =
        operationType === 'penalty' ? -Math.abs(points) : Math.abs(points);

      return {
        id: normalizeString(item?.id) || createId(),
        employeeId: normalizeString(item?.employeeId),
        employeeName: normalizeString(item?.employeeName) || 'Unknown',
        points: signedPoints,
        operationType,
        adminId: normalizeString(item?.adminId) || undefined,
        adminLogin: normalizeString(item?.adminLogin) || undefined,
        adminName: normalizeString(item?.adminName) || 'Admin',
        timestamp: new Date(item?.timestamp || Date.now()),
        reason: normalizeString(item?.reason) || undefined,
      } satisfies PointsHistory;
    })
    .filter((item): item is PointsHistory => Boolean(item));
}

function normalizeCurrentUser(raw: unknown): CurrentUser | null {
  if (!raw || typeof raw !== 'object') return null;

  const candidate = raw as Partial<CurrentUser>;
  if (candidate.role !== 'admin' && candidate.role !== 'employee') return null;

  const id = normalizeString(candidate.id);
  const name = normalizeString(candidate.name);
  if (!id || !name) return null;

  const login = normalizeString(candidate.login) || undefined;

  return {
    id,
    name,
    role: candidate.role,
    login,
    mustChangePassword: Boolean(candidate.mustChangePassword),
  };
}

function createEmployeeLogin(name: string, id: string, currentEmployees: Employee[]) {
  const used = new Set(currentEmployees.map((employee) => employee.login.toLowerCase()));
  const base = createBaseLogin(name, id);
  return makeUniqueLogin(base, used);
}

function pickRandomMemeClipId(clips: TvMemeClip[], lastClipId?: string | null) {
  if (clips.length === 0) return null;
  if (clips.length === 1) return clips[0].id;

  const candidates = clips.filter((clip) => clip.id !== lastClipId);
  const pool = candidates.length > 0 ? candidates : clips;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index]?.id || clips[0].id;
}

export function getRank(points: number): { name: string; color: string } {
  if (points >= 50) return { name: '\u0422\u0438\u0442\u0430\u043d', color: '#FFD700' };
  if (points >= 40) return { name: '\u041b\u0435\u0433\u0435\u043d\u0434\u0430', color: '#9370DB' };
  if (points >= 30) return { name: '\u0420\u044b\u0446\u0430\u0440\u044c', color: '#4169E1' };
  if (points >= 20) return { name: '\u0413\u0435\u0440\u043e\u0439', color: '#32CD32' };
  if (points >= 10) return { name: '\u0421\u043e\u043b\u0434\u0430\u0442', color: '#FF8C00' };
  return { name: '\u0420\u0435\u043a\u0440\u0443\u0442', color: '#808080' };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const apiPersistenceEnabled = isApiPersistenceEnabled();
  const [teams, setTeams] = useState<Team[]>(() => {
    if (apiPersistenceEnabled) {
      return initialTeams;
    }
    const saved = parseStorage<Team[]>(TEAMS_KEY, initialTeams);
    return Array.isArray(saved) && saved.length > 0 ? saved : initialTeams;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (apiPersistenceEnabled) {
      return normalizeEmployees(initialEmployees, initialTeams);
    }
    const saved = parseStorage<unknown[]>(EMPLOYEES_KEY, initialEmployees);
    return normalizeEmployees(saved, initialTeams);
  });

  const [admins, setAdmins] = useState<Admin[]>(() => {
    if (apiPersistenceEnabled) {
      return normalizeAdmins(initialAdmins);
    }
    const saved = parseStorage<unknown[]>(ADMINS_KEY, initialAdmins);
    return normalizeAdmins(saved);
  });

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    if (apiPersistenceEnabled) {
      return null;
    }
    const saved = parseStorage<unknown>(CURRENT_USER_KEY, null);
    return normalizeCurrentUser(saved);
  });
  const [authReady, setAuthReady] = useState(() => !apiPersistenceEnabled);
  const [remoteStateReady, setRemoteStateReady] = useState(() => !apiPersistenceEnabled);

  const [prizePool, setPrizePool] = useState<number>(() => {
    if (apiPersistenceEnabled) {
      return 50000;
    }
    const saved = parseStorage<number>(PRIZE_POOL_KEY, 50000);
    return toSafeNumber(saved, 50000);
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [tvAudioSettings, setTvAudioSettings] = useState<TvAudioSettings>(() => {
    if (apiPersistenceEnabled) {
      return defaultTvAudioSettings;
    }
    const saved = parseStorage<unknown>(TV_AUDIO_SETTINGS_KEY, defaultTvAudioSettings);
    return normalizeTvAudioSettings(saved);
  });
  const [tvMemeSettings, setTvMemeSettings] = useState<TvMemeSettings>(() => {
    if (apiPersistenceEnabled) {
      return defaultTvMemeSettings;
    }
    const saved = parseStorage<unknown>(TV_MEME_SETTINGS_KEY, defaultTvMemeSettings);
    return normalizeTvMemeSettings(saved);
  });
  const [tvMemeTrigger, setTvMemeTrigger] = useState<TvMemeTrigger | null>(null);
  const lastAutoMemeClipIdRef = useRef<string | null>(null);

  const [services, setServices] = useState<Service[]>(() => {
    if (apiPersistenceEnabled) {
      return initialServices;
    }
    const saved = parseStorage<Service[]>(SERVICES_KEY, initialServices);
    return Array.isArray(saved) ? saved : initialServices;
  });

  const [pointsHistory, setPointsHistory] = useState<PointsHistory[]>(() => {
    if (apiPersistenceEnabled) {
      return [];
    }
    const saved = parseStorage<unknown[]>(HISTORY_KEY, []);
    return normalizeHistory(saved);
  });

  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>(() => {
    if (apiPersistenceEnabled) {
      return defaultVisibilitySettings;
    }
    const saved = parseStorage<Partial<VisibilitySettings>>(VISIBILITY_KEY, defaultVisibilitySettings);
    return normalizeVisibility(saved);
  });

  const hydrateFromServer = useCallback(async () => {
    if (!apiPersistenceEnabled) {
      setRemoteStateReady(true);
      setAuthReady(true);
      return;
    }

    let remoteLoaded = false;

    try {
      const bootstrap = await loadBootstrapCache();
      setEmployees(normalizeEmployees(bootstrap.directory.employees, bootstrap.directory.teams as Team[]));
      setAdmins(normalizeAdmins(bootstrap.directory.admins));
      setTeams(Array.isArray(bootstrap.directory.teams) ? (bootstrap.directory.teams as Team[]) : initialTeams);
      setCurrentUser(bootstrap.currentUser ? normalizeCurrentUser(bootstrap.currentUser) : null);
      setPrizePool(toSafeNumber(bootstrap.app.prizePool, 50000));
      setSoundEnabled(Boolean(bootstrap.app.soundEnabled));
      setServices(Array.isArray(bootstrap.app.services) ? (bootstrap.app.services as Service[]) : initialServices);
      setPointsHistory(normalizeHistory(Array.isArray(bootstrap.app.pointsHistory) ? bootstrap.app.pointsHistory : []));
      setVisibilitySettings(normalizeVisibility(bootstrap.app.visibilitySettings as Partial<VisibilitySettings>));
      setTvAudioSettings(normalizeTvAudioSettings(bootstrap.app.tvAudioSettings));
      setTvMemeSettings(normalizeTvMemeSettings(bootstrap.app.tvMemeSettings));
      remoteLoaded = true;
    } catch {
      const restoredUser = await restoreAuthSession();
      setCurrentUser(restoredUser);
    } finally {
      setRemoteStateReady(remoteLoaded);
      setAuthReady(true);
    }
  }, [apiPersistenceEnabled]);

  useEffect(() => {
    void hydrateFromServer();
  }, [hydrateFromServer]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'employee') return;
    const exists = employees.some((employee) => employee.id === currentUser.id);
    if (!exists) {
      setCurrentUser(null);
    }
  }, [currentUser, employees]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;

    const currentAdmin = admins.find((admin) => admin.id === currentUser.id);
    if (!currentAdmin) {
      setCurrentUser(null);
      return;
    }

    if (
      currentUser.login !== currentAdmin.login ||
      currentUser.name !== currentAdmin.name
    ) {
      setCurrentUser({
        id: currentAdmin.id,
        name: currentAdmin.name,
        role: 'admin',
        login: currentAdmin.login,
      });
    }
  }, [currentUser, admins]);

  useEffect(() => {
    let cancelled = false;

    const migrateAdmins = async () => {
      const nextAdmins = await Promise.all(admins.map((admin) => migrateLegacyPassword(admin)));
      const changed = nextAdmins.some((admin, index) => admin !== admins[index]);
      if (!cancelled && changed) {
        setAdmins(nextAdmins);
      }
    };

    void migrateAdmins();

    return () => {
      cancelled = true;
    };
  }, [admins]);

  useEffect(() => {
    let cancelled = false;

    const migrateEmployees = async () => {
      const nextEmployees = await Promise.all(
        employees.map((employee) => migrateLegacyPassword(employee))
      );
      const changed = nextEmployees.some((employee, index) => employee !== employees[index]);
      if (!cancelled && changed) {
        setEmployees(nextEmployees);
      }
    };

    void migrateEmployees();

    return () => {
      cancelled = true;
    };
  }, [employees]);

  useEffect(() => {
    // Keep employees valid if teams were changed.
    setEmployees((prev) => normalizeEmployees(prev, teams));
  }, [teams]);

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    safeStorageSet(EMPLOYEES_KEY, JSON.stringify(employees));
    safeStorageSet(TEAMS_KEY, JSON.stringify(teams));
    safeStorageSet(PRIZE_POOL_KEY, JSON.stringify(prizePool));

    const syncData = {
      employees,
      teams,
      prizePool,
      tvAudioSettings,
      tvMemeSettings,
      tvMemeTrigger,
      timestamp: Date.now(),
    };
    safeStorageSet(RATING_SYNC_KEY, JSON.stringify(syncData));
  }, [apiPersistenceEnabled, employees, prizePool, remoteStateReady, teams, tvAudioSettings, tvMemeSettings, tvMemeTrigger]);

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    safeStorageSet(SERVICES_KEY, JSON.stringify(services));
  }, [apiPersistenceEnabled, remoteStateReady, services]);

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    safeStorageSet(ADMINS_KEY, JSON.stringify(admins));
  }, [admins, apiPersistenceEnabled, remoteStateReady]);

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    safeStorageSet(HISTORY_KEY, JSON.stringify(pointsHistory));
  }, [apiPersistenceEnabled, pointsHistory, remoteStateReady]);

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    safeStorageSet(VISIBILITY_KEY, JSON.stringify(visibilitySettings));
  }, [apiPersistenceEnabled, remoteStateReady, visibilitySettings]);

  useEffect(() => {
    if (!apiPersistenceEnabled || !remoteStateReady || !authReady || !currentUser) return;

    const timeout = window.setTimeout(() => {
      if (currentUser.role === 'admin') {
        void saveDirectoryStateApi({ employees, admins, teams });
      } else {
        void saveDirectoryStateApi({
          employees: employees.filter((employee) => employee.id === currentUser.id),
          admins: [],
          teams: [],
        });
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [admins, apiPersistenceEnabled, authReady, currentUser, employees, remoteStateReady, teams]);

  useEffect(() => {
    if (!apiPersistenceEnabled || !remoteStateReady || !authReady || currentUser?.role !== 'admin') return;

    const timeout = window.setTimeout(() => {
      void saveAppStateApi({
        prizePool,
        soundEnabled,
        services,
        pointsHistory,
        visibilitySettings,
        tvAudioSettings,
        tvMemeSettings,
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [
    authReady,
    currentUser?.role,
    pointsHistory,
    prizePool,
    services,
    soundEnabled,
    tvAudioSettings,
    tvMemeSettings,
    visibilitySettings,
    apiPersistenceEnabled,
    remoteStateReady,
  ]);

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    safeStorageSet(TV_AUDIO_SETTINGS_KEY, JSON.stringify(tvAudioSettings));
  }, [apiPersistenceEnabled, remoteStateReady, tvAudioSettings]);

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    safeStorageSet(TV_MEME_SETTINGS_KEY, JSON.stringify(tvMemeSettings));
  }, [apiPersistenceEnabled, remoteStateReady, tvMemeSettings]);

  useEffect(() => {
    if (!lastAutoMemeClipIdRef.current) return;
    const exists = tvMemeSettings.clips.some((clip) => clip.id === lastAutoMemeClipIdRef.current);
    if (!exists) {
      lastAutoMemeClipIdRef.current = null;
    }
  }, [tvMemeSettings.clips]);

  useEffect(() => {
    if (!currentUser) {
      localStorage.removeItem(CURRENT_USER_KEY);
      return;
    }
    safeStorageSet(CURRENT_USER_KEY, JSON.stringify(currentUser));
  }, [currentUser]);

  useCrossWindowSync({ employees, teams, prizePool, tvAudioSettings, tvMemeSettings, tvMemeTrigger });

  const handleAddPoints = useCallback(
    (employeeId: string, points: number, admin: PointsActor, reason?: string) => {
      const normalizedPoints = Math.trunc(points);
      if (!employeeId || !Number.isFinite(normalizedPoints) || normalizedPoints === 0) return;

      const targetEmployee = employees.find((employee) => employee.id === employeeId);
      if (!targetEmployee) return;

      const normalizedAdminName = normalizeString(admin?.name) || 'Admin';
      const normalizedAdminId = normalizeString(admin?.id) || undefined;
      const normalizedAdminLogin = normalizeString(admin?.login).toLowerCase() || undefined;
      const operationType = normalizePointsOperationType(undefined, normalizedPoints);
      const normalizedReason = normalizeString(reason) || undefined;
      const employeeName = targetEmployee.name;

      setEmployees((prev) => {
        const next = prev.map((employee) => {
          if (employee.id !== employeeId) return employee;

          return {
            ...employee,
            totalPoints: employee.totalPoints + normalizedPoints,
            weeklyPoints: employee.weeklyPoints + normalizedPoints,
          };
        });

        setPointsHistory((historyPrev) => [
          ...historyPrev,
          {
            id: createId(),
            employeeId,
            employeeName,
            points: normalizedPoints,
            operationType,
            adminId: normalizedAdminId,
            adminLogin: normalizedAdminLogin,
            adminName: normalizedAdminName,
            timestamp: new Date(),
            reason: normalizedReason,
          },
        ]);

        return next;
      });

      if (normalizedPoints > 0 && soundEnabled) {
        const audio = new Audio(
          'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE'
        );
        audio.play().catch(() => {});
      }

      if (
        normalizedPoints > 0 &&
        tvMemeSettings.enabled &&
        tvMemeSettings.autoPlayEnabled &&
        tvMemeSettings.clips.length > 0 &&
        normalizedPoints >= tvMemeSettings.autoPlayMinPoints
      ) {
        const clipId = tvMemeSettings.autoPlayRandom
          ? pickRandomMemeClipId(tvMemeSettings.clips, lastAutoMemeClipIdRef.current)
          : tvMemeSettings.selectedClipId || tvMemeSettings.clips[0]?.id || null;

        if (clipId) {
          lastAutoMemeClipIdRef.current = clipId;
          setTvMemeTrigger({
            id: createId(),
            clipId,
            audioTrackId: tvMemeSettings.selectedAudioTrackId || null,
            source: 'autoPoints',
            points: normalizedPoints,
            operationType,
            employeeId,
            employeeName,
            adminName: normalizedAdminName,
            reason: normalizedReason,
            createdAt: Date.now(),
          });
        }
      }
    },
    [employees, soundEnabled, tvMemeSettings]
  );

  const triggerTvMeme = useCallback(
    (clipId: string, options?: TriggerTvMemeOptions) => {
      if (!clipId) return;

      setTvMemeTrigger({
        id: createId(),
        clipId,
        audioTrackId: options?.audioTrackId ?? tvMemeSettings.selectedAudioTrackId ?? null,
        source: options?.source || 'manual',
        points: options?.points,
        operationType: options?.operationType,
        employeeId: options?.employeeId,
        employeeName: options?.employeeName,
        adminName: options?.adminName,
        reason: options?.reason,
        createdAt: Date.now(),
      });
    },
    [tvMemeSettings.selectedAudioTrackId]
  );

  const handleUpdateEmployee = useCallback(
    (
      employeeId: string,
      newName: string,
      newAvatar?: string,
      newSalary?: number,
      newLogin?: string,
      newPassword?: string
    ) => {
      const applyUpdate = async () => {
        const usedLogins = new Set(
          employees
            .filter((candidate) => candidate.id !== employeeId)
            .map((candidate) => candidate.login.toLowerCase())
        );

        const nextEmployees = await Promise.all(
          employees.map(async (employee) => {
            if (employee.id !== employeeId) return employee;

            const requestedLogin = normalizeString(newLogin).toLowerCase();
            const login = requestedLogin
              ? makeUniqueLogin(requestedLogin, usedLogins)
              : employee.login;
            const nextCredentials = await resolvePasswordUpdate(employee, newPassword);

            return {
              ...employee,
              name: normalizeString(newName) || employee.name,
              avatar: normalizeString(newAvatar) || undefined,
              salary:
                typeof newSalary === 'number' && Number.isFinite(newSalary) && newSalary >= 0
                  ? newSalary
                  : employee.salary,
              login,
              password: nextCredentials.password,
              passwordHash: nextCredentials.passwordHash,
              passwordSalt: nextCredentials.passwordSalt,
            };
          })
        );

        setEmployees(nextEmployees);
      };

      return applyUpdate();
    },
    [employees]
  );

  const handleUpdateTeam = useCallback((teamId: string, newName: string) => {
    const normalized = normalizeString(newName);
    if (!normalized) return;

    setTeams((prev) =>
      prev.map((team) => (team.id === teamId ? { ...team, name: normalized } : team))
    );
  }, []);

  const handleAddEmployee = useCallback(
    (
      name: string,
      position: string,
      teamId: string,
      avatar?: string,
      salary?: number,
      login?: string,
      password?: string
    ) => {
      const applyAdd = async () => {
        const normalizedName = normalizeString(name);
        const normalizedPosition = normalizeString(position);
        if (!normalizedName || !normalizedPosition || !teamId) return;

        const passwordSecret = await createPasswordSecret(normalizeString(password) || '1234');

        setEmployees((prev) => {
          const id = createId();

          const requestedLogin = normalizeString(login).toLowerCase();
          const normalizedLogin = requestedLogin || createEmployeeLogin(normalizedName, id, prev);

          const used = new Set(prev.map((employee) => employee.login.toLowerCase()));
          const uniqueLogin = makeUniqueLogin(normalizedLogin, used);

          const newEmployee: Employee = {
            id,
            name: normalizedName,
            position: normalizedPosition,
            teamId,
            totalPoints: 0,
            weeklyPoints: 0,
            avatar: normalizeString(avatar) || undefined,
            salary:
              typeof salary === 'number' && Number.isFinite(salary) && salary >= 0
                ? salary
                : undefined,
            login: uniqueLogin,
            passwordHash: passwordSecret.passwordHash,
            passwordSalt: passwordSecret.passwordSalt,
          };

          return [...prev, newEmployee];
        });
      };

      return applyAdd();
    },
    []
  );

  const handleDeleteEmployee = useCallback((employeeId: string) => {
    setEmployees((prev) => prev.filter((employee) => employee.id !== employeeId));
  }, []);

  const logout = useCallback(() => {
    if (isApiPersistenceEnabled()) {
      void logoutSession();
      clearBootstrapCache();
    }
    setCurrentUser(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        employees,
        admins,
        teams,
        currentUser,
        authReady,
        prizePool,
        soundEnabled,
        tvAudioSettings,
        tvMemeSettings,
        tvMemeTrigger,
        services,
        pointsHistory,
        visibilitySettings,
        setEmployees,
        setAdmins,
        setTeams,
        setCurrentUser,
        reloadFromServer: hydrateFromServer,
        setPrizePool,
        setSoundEnabled,
        setTvAudioSettings,
        setTvMemeSettings,
        setServices,
        setPointsHistory,
        setVisibilitySettings,
        handleAddPoints,
        handleUpdateEmployee,
        handleUpdateTeam,
        handleAddEmployee,
        handleDeleteEmployee,
        triggerTvMeme,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
