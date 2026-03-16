import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Volume2 } from 'lucide-react';
import { MemeCelebration } from '../components/meme-celebration';
import { TVDisplay } from '../components/tv-display';
import { TvMemeOverlay } from '../components/tv-meme-overlay';
import {
  defaultTvAudioSettings,
  defaultTvMemeSettings,
  normalizeTvAudioSettings,
  normalizeTvMemeSettings,
  type Employee,
  type Team,
  type TvAudioSettings,
  type TvAudioTrack,
  type TvEventSoundType,
  type TvMemeSettings,
  type TvMemeTrigger,
} from '../context/AppContext';
import {
  createRatingSnapshot,
  detectRatingEvents,
  type RatingSnapshot,
  type TvRuntimeEvent,
} from '../utils/tvEvents';
import { loadTvAudioObjectUrl } from '../utils/tvAudioLibrary';
import { loadMemeVideoObjectUrl } from '../utils/tvMemeLibrary';

interface SyncPayload {
  employees?: Employee[];
  teams?: Team[];
  prizePool?: number;
  tvAudioSettings?: TvAudioSettings;
  tvMemeSettings?: TvMemeSettings;
  tvMemeTrigger?: TvMemeTrigger | null;
  timestamp?: number;
}

const STORAGE_KEY = 'law-firm-rating-data';
const TV_AUDIO_SETTINGS_KEY = 'law-firm-tv-audio-settings';
const TV_MEME_SETTINGS_KEY = 'law-firm-tv-meme-settings';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readInitialData() {
  const fallbackEmployees: Employee[] = [];
  const fallbackTeams: Team[] = [];

  const payload = safeParse<SyncPayload | null>(localStorage.getItem(STORAGE_KEY), null);
  const storedAudio = safeParse<unknown>(
    localStorage.getItem(TV_AUDIO_SETTINGS_KEY),
    defaultTvAudioSettings
  );
  const storedMeme = safeParse<unknown>(
    localStorage.getItem(TV_MEME_SETTINGS_KEY),
    defaultTvMemeSettings
  );
  const payloadMemeTrigger =
    payload?.tvMemeTrigger && typeof payload.tvMemeTrigger === 'object'
      ? (payload.tvMemeTrigger as TvMemeTrigger)
      : null;

  return {
    employees: payload?.employees || fallbackEmployees,
    teams: payload?.teams || fallbackTeams,
    prizePool: typeof payload?.prizePool === 'number' ? payload.prizePool : 50000,
    tvAudioSettings: normalizeTvAudioSettings(payload?.tvAudioSettings || storedAudio),
    tvMemeSettings: normalizeTvMemeSettings(payload?.tvMemeSettings || storedMeme),
    tvMemeTrigger: payloadMemeTrigger,
    timestamp: typeof payload?.timestamp === 'number' ? payload.timestamp : 0,
  };
}

function areEmployeesEqual(a: Employee[], b: Employee[]) {
  if (a.length !== b.length) return false;

  return a.every((employee, index) => {
    const other = b[index];
    if (!other) return false;

    return (
      employee.id === other.id &&
      employee.name === other.name &&
      employee.position === other.position &&
      employee.teamId === other.teamId &&
      employee.totalPoints === other.totalPoints &&
      employee.weeklyPoints === other.weeklyPoints &&
      employee.avatar === other.avatar
    );
  });
}

function areTeamsEqual(a: Team[], b: Team[]) {
  if (a.length !== b.length) return false;
  return a.every((team, index) => {
    const other = b[index];
    if (!other) return false;
    return team.id === other.id && team.name === other.name && team.color === other.color;
  });
}

function areTvAudioSettingsEqual(a: TvAudioSettings, b: TvAudioSettings) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function areTvMemeSettingsEqual(a: TvMemeSettings, b: TvMemeSettings) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeIncomingMemeTrigger(raw: unknown): TvMemeTrigger | null {
  if (!raw || typeof raw !== 'object') return null;

  const candidate = raw as Partial<TvMemeTrigger>;
  if (!candidate.id || !candidate.clipId) return null;

  return {
    id: String(candidate.id),
    clipId: String(candidate.clipId),
    audioTrackId:
      typeof candidate.audioTrackId === 'string' ? candidate.audioTrackId : candidate.audioTrackId || null,
    source: candidate.source === 'autoPoints' ? 'autoPoints' : 'manual',
    points: typeof candidate.points === 'number' ? candidate.points : undefined,
    operationType: candidate.operationType === 'penalty' ? 'penalty' : 'award',
    employeeId: typeof candidate.employeeId === 'string' ? candidate.employeeId : undefined,
    employeeName: typeof candidate.employeeName === 'string' ? candidate.employeeName : undefined,
    adminName: typeof candidate.adminName === 'string' ? candidate.adminName : undefined,
    reason: typeof candidate.reason === 'string' ? candidate.reason : undefined,
    createdAt: typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now(),
  };
}

function nextPlaylistTrack(currentTrackId: string | null, playlistTrackIds: string[]) {
  if (!playlistTrackIds.length) return null;

  if (!currentTrackId) return playlistTrackIds[0];

  const currentIndex = playlistTrackIds.indexOf(currentTrackId);
  if (currentIndex < 0) return playlistTrackIds[0];

  const nextIndex = (currentIndex + 1) % playlistTrackIds.length;
  return playlistTrackIds[nextIndex];
}

function getFallbackToneFrequency(eventType: TvEventSoundType) {
  switch (eventType) {
    case 'leaderChange':
      return 880;
    case 'mvpChange':
      return 784;
    case 'bigPoints':
      return 660;
    case 'topEntry':
      return 720;
    case 'bottomDrop':
      return 240;
    default:
      return 520;
  }
}

function playFallbackEventTone(eventType: TvEventSoundType, volume: number) {
  if (typeof window === 'undefined') return;

  const Context = window.AudioContext || (window as any).webkitAudioContext;
  if (!Context) return;

  const context = new Context();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = eventType === 'bottomDrop' ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(getFallbackToneFrequency(eventType), context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    eventType === 'bottomDrop' ? 160 : getFallbackToneFrequency(eventType) * 1.28,
    context.currentTime + 0.24
  );

  gainNode.gain.setValueAtTime(0.0001, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.02, volume * 0.45), context.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 0.3);
  oscillator.onended = () => {
    context.close().catch(() => {});
  };
}

export function TVPage() {
  const navigate = useNavigate();
  const initialData = useMemo(() => readInitialData(), []);

  const [employees, setEmployees] = useState<Employee[]>(initialData.employees);
  const [teams, setTeams] = useState<Team[]>(initialData.teams);
  const [prizePool, setPrizePool] = useState<number>(initialData.prizePool);
  const [tvAudioSettings, setTvAudioSettings] = useState<TvAudioSettings>(initialData.tvAudioSettings);
  const [tvMemeSettings, setTvMemeSettings] = useState<TvMemeSettings>(initialData.tvMemeSettings);

  const [eventQueue, setEventQueue] = useState<TvRuntimeEvent[]>([]);
  const [activeEvent, setActiveEvent] = useState<TvRuntimeEvent | null>(null);
  const [leaderPulseId, setLeaderPulseId] = useState<string | null>(null);
  const [showPointsMeme, setShowPointsMeme] = useState(false);
  const [memePoints, setMemePoints] = useState(0);
  const [pendingEventAfterCelebration, setPendingEventAfterCelebration] = useState<TvRuntimeEvent | null>(null);
  const [memeQueue, setMemeQueue] = useState<TvMemeTrigger[]>([]);
  const [activeTvMeme, setActiveTvMeme] = useState<TvMemeTrigger | null>(null);
  const [activeTvMemeSource, setActiveTvMemeSource] = useState<string | null>(null);
  const [activeTvMemeAudioSource, setActiveTvMemeAudioSource] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(
    initialData.tvAudioSettings.activeTrackId
  );
  const [currentTrackPosition, setCurrentTrackPosition] = useState(0);
  const [currentTrackDuration, setCurrentTrackDuration] = useState(0);

  const lastTimestampRef = useRef(initialData.timestamp);
  const employeesRef = useRef(initialData.employees);
  const teamsRef = useRef(initialData.teams);
  const prizePoolRef = useRef(initialData.prizePool);
  const tvAudioSettingsRef = useRef(initialData.tvAudioSettings);
  const tvMemeSettingsRef = useRef(initialData.tvMemeSettings);
  const snapshotRef = useRef<RatingSnapshot>(createRatingSnapshot(initialData.employees));
  const lastMemeTriggerIdRef = useRef<string | null>(initialData.tvMemeTrigger?.id || null);
  const activeMemeObjectUrlRef = useRef<string | null>(null);
  const activeMemeAudioObjectUrlRef = useRef<string | null>(null);

  const tracksByIdRef = useRef<Map<string, TvAudioTrack>>(new Map());
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const eventAudioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundTrackObjectUrlRef = useRef<string | null>(null);
  const eventTrackObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  useEffect(() => {
    prizePoolRef.current = prizePool;
  }, [prizePool]);

  useEffect(() => {
    tvAudioSettingsRef.current = tvAudioSettings;
  }, [tvAudioSettings]);

  useEffect(() => {
    tvMemeSettingsRef.current = tvMemeSettings;
  }, [tvMemeSettings]);

  const playlistTrackIds = useMemo(() => {
    const validIds = new Set(tvAudioSettings.tracks.map((track) => track.id));
    return tvAudioSettings.playlistTrackIds.filter((trackId) => validIds.has(trackId));
  }, [tvAudioSettings.tracks, tvAudioSettings.playlistTrackIds]);

  const tracksById = useMemo(() => {
    return new Map(tvAudioSettings.tracks.map((track) => [track.id, track] as const));
  }, [tvAudioSettings.tracks]);

  const memeClipsById = useMemo(() => {
    return new Map(tvMemeSettings.clips.map((clip) => [clip.id, clip] as const));
  }, [tvMemeSettings.clips]);

  useEffect(() => {
    tracksByIdRef.current = tracksById as Map<string, TvAudioTrack>;
  }, [tracksById]);

  useEffect(() => {
    return () => {
      if (activeMemeObjectUrlRef.current) {
        URL.revokeObjectURL(activeMemeObjectUrlRef.current);
        activeMemeObjectUrlRef.current = null;
      }
      if (activeMemeAudioObjectUrlRef.current) {
        URL.revokeObjectURL(activeMemeAudioObjectUrlRef.current);
        activeMemeAudioObjectUrlRef.current = null;
      }
      if (backgroundTrackObjectUrlRef.current) {
        URL.revokeObjectURL(backgroundTrackObjectUrlRef.current);
        backgroundTrackObjectUrlRef.current = null;
      }
      if (eventTrackObjectUrlRef.current) {
        URL.revokeObjectURL(eventTrackObjectUrlRef.current);
        eventTrackObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setCurrentTrackId((previous) => {
      if (previous && playlistTrackIds.includes(previous)) {
        return previous;
      }

      if (tvAudioSettings.activeTrackId && playlistTrackIds.includes(tvAudioSettings.activeTrackId)) {
        return tvAudioSettings.activeTrackId;
      }

      return playlistTrackIds[0] || null;
    });
  }, [playlistTrackIds, tvAudioSettings.activeTrackId]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }

    const channel = new BroadcastChannel('law-firm-rating-sync');

    const applyData = (incoming: SyncPayload) => {
      const nextTimestamp = typeof incoming.timestamp === 'number' ? incoming.timestamp : Date.now();
      if (nextTimestamp <= lastTimestampRef.current) {
        return;
      }

      const nextEmployees = incoming.employees || employeesRef.current;
      const nextTeams = incoming.teams || teamsRef.current;
      const nextPrizePool =
        typeof incoming.prizePool === 'number' ? incoming.prizePool : prizePoolRef.current;
      const nextTvAudioSettings = incoming.tvAudioSettings
        ? normalizeTvAudioSettings(incoming.tvAudioSettings)
        : tvAudioSettingsRef.current;
      const nextTvMemeSettings = incoming.tvMemeSettings
        ? normalizeTvMemeSettings(incoming.tvMemeSettings)
        : tvMemeSettingsRef.current;
      const nextTvMemeTrigger = normalizeIncomingMemeTrigger(incoming.tvMemeTrigger);

      if (incoming.employees) {
        const previousSnapshot = snapshotRef.current;
        const nextSnapshot = createRatingSnapshot(nextEmployees);

        const events = detectRatingEvents(previousSnapshot, nextSnapshot, nextEmployees);
        if (events.length > 0) {
          setEventQueue((previousQueue) => [...previousQueue, ...events].slice(-20));

          if (events.some((event) => event.type === 'leaderChange')) {
            setLeaderPulseId(nextSnapshot.leaderId);
          }
        }

        snapshotRef.current = nextSnapshot;
      }

      if (incoming.employees && !areEmployeesEqual(nextEmployees, employeesRef.current)) {
        setEmployees(nextEmployees);
      }

      if (incoming.teams && !areTeamsEqual(nextTeams, teamsRef.current)) {
        setTeams(nextTeams);
      }

      if (typeof incoming.prizePool === 'number' && incoming.prizePool !== prizePoolRef.current) {
        setPrizePool(incoming.prizePool);
      }

      if (incoming.tvAudioSettings && !areTvAudioSettingsEqual(nextTvAudioSettings, tvAudioSettingsRef.current)) {
        setTvAudioSettings(nextTvAudioSettings);
      }

      if (incoming.tvMemeSettings && !areTvMemeSettingsEqual(nextTvMemeSettings, tvMemeSettingsRef.current)) {
        setTvMemeSettings(nextTvMemeSettings);
      }

      if (nextTvMemeTrigger && nextTvMemeTrigger.id !== lastMemeTriggerIdRef.current) {
        lastMemeTriggerIdRef.current = nextTvMemeTrigger.id;
        setMemeQueue((previous) => [...previous, nextTvMemeTrigger].slice(-12));
      }

      lastTimestampRef.current = nextTimestamp;
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            employees: nextEmployees,
            teams: nextTeams,
            prizePool: nextPrizePool,
            tvAudioSettings: nextTvAudioSettings,
            tvMemeSettings: nextTvMemeSettings,
            tvMemeTrigger: nextTvMemeTrigger,
            timestamp: nextTimestamp,
          })
        );
      } catch (error) {
        console.error('Failed to persist TV sync payload', error);
      }
    };

    const handleMessage = (event: MessageEvent<SyncPayload>) => {
      applyData(event.data || {});
    };

    const handleWindowEvent = (event: Event) => {
      const customEvent = event as CustomEvent<SyncPayload>;
      applyData(customEvent.detail || {});
    };

    channel.addEventListener('message', handleMessage);
    window.addEventListener('rating-data-updated', handleWindowEvent as EventListener);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
      window.removeEventListener('rating-data-updated', handleWindowEvent as EventListener);
    };
  }, []);

  useEffect(() => {
    if (
      activeEvent ||
      eventQueue.length === 0 ||
      activeTvMeme ||
      memeQueue.length > 0 ||
      showPointsMeme ||
      pendingEventAfterCelebration
    ) {
      return;
    }

    const nextEvent = eventQueue[0];
    setEventQueue((previousQueue) => previousQueue.slice(1));

    if (nextEvent.type === 'bigPoints') {
      setMemePoints(nextEvent.pointsDelta || 0);
      setShowPointsMeme(true);
      setPendingEventAfterCelebration(nextEvent);
      return;
    }

    setActiveEvent(nextEvent);
  }, [activeEvent, activeTvMeme, eventQueue, memeQueue.length, pendingEventAfterCelebration, showPointsMeme]);

  useEffect(() => {
    if (!activeEvent) return;

    const timer = window.setTimeout(() => {
      setActiveEvent(null);
    }, 3300);

    return () => window.clearTimeout(timer);
  }, [activeEvent]);

  useEffect(() => {
    if (!tvMemeSettings.enabled) {
      if (memeQueue.length > 0) {
        setMemeQueue([]);
      }
      if (activeTvMeme) {
        setActiveTvMeme(null);
      }
      return;
    }

    if (activeTvMeme || memeQueue.length === 0) return;
    setActiveTvMeme(memeQueue[0]);
    setMemeQueue((previous) => previous.slice(1));
  }, [tvMemeSettings.enabled, activeTvMeme, memeQueue]);

  useEffect(() => {
    if (!activeTvMeme) return;
    if (!memeClipsById.has(activeTvMeme.clipId)) {
      setActiveTvMeme(null);
    }
  }, [activeTvMeme, memeClipsById]);

  useEffect(() => {
    if (!leaderPulseId) return;

    const timer = window.setTimeout(() => {
      setLeaderPulseId(null);
    }, 1300);

    return () => window.clearTimeout(timer);
  }, [leaderPulseId]);

  const exitTvMode = useCallback(() => {
    const hasParentWindow =
      typeof window !== 'undefined' && Boolean(window.opener) && !window.opener.closed;

    if (hasParentWindow) {
      window.close();
      return;
    }

    navigate('/admin/dashboard', { replace: true });
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return;

      event.preventDefault();
      event.stopPropagation();
      exitTvMode();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exitTvMode]);

  useEffect(() => {
    const audio = backgroundAudioRef.current;
    if (!audio) return;

    audio.volume = tvAudioSettings.backgroundVolume;

    if (!tvAudioSettings.musicEnabled || !currentTrackId) {
      audio.pause();
      audio.removeAttribute('src');
      audio.removeAttribute('data-track-id');
      audio.removeAttribute('data-source-key');
      audio.load();
      setCurrentTrackPosition(0);
      setCurrentTrackDuration(0);
      return;
    }

    const currentTrack = tracksById.get(currentTrackId);
    if (!currentTrack) {
      audio.pause();
      audio.removeAttribute('src');
      audio.removeAttribute('data-track-id');
      audio.removeAttribute('data-source-key');
      audio.load();
      setCurrentTrackPosition(0);
      setCurrentTrackDuration(0);
      return;
    }

    let cancelled = false;

    const applyTrack = async () => {
      let source = currentTrack.dataUrl || null;
      let objectUrl: string | null = null;

      if (!source && currentTrack.storageId) {
        objectUrl = await loadTvAudioObjectUrl(currentTrack.storageId);
        source = objectUrl;
      }

      if (cancelled) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        return;
      }

      if (!source) {
        audio.pause();
        return;
      }

      if (backgroundTrackObjectUrlRef.current && backgroundTrackObjectUrlRef.current !== source) {
        URL.revokeObjectURL(backgroundTrackObjectUrlRef.current);
        backgroundTrackObjectUrlRef.current = null;
      }

      if (objectUrl) {
        backgroundTrackObjectUrlRef.current = objectUrl;
      }

      const sourceKey = currentTrack.storageId || currentTrack.dataUrl || currentTrack.id;
      const shouldReload =
        audio.dataset.trackId !== currentTrack.id ||
        audio.dataset.sourceKey !== sourceKey ||
        !audio.src;

      if (shouldReload) {
        audio.pause();
        audio.src = source;
        audio.currentTime = 0;
        audio.dataset.trackId = currentTrack.id;
        audio.dataset.sourceKey = sourceKey;
        audio.load();
        setCurrentTrackPosition(0);
      }

      const playPromise = audio.play();
      if (playPromise) {
        playPromise
          .then(() => {
            setAudioBlocked(false);
          })
          .catch(() => {
            setAudioBlocked(true);
          });
      }
    };

    void applyTrack();

    return () => {
      cancelled = true;
    };
  }, [tvAudioSettings.musicEnabled, tvAudioSettings.backgroundVolume, currentTrackId, tracksById]);

  useEffect(() => {
    const audio = backgroundAudioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setCurrentTrackId((previousTrackId) => nextPlaylistTrack(previousTrackId, playlistTrackIds));
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playlistTrackIds]);

  useEffect(() => {
    const audio = backgroundAudioRef.current;
    if (!audio) return;

    const syncTime = () => {
      setCurrentTrackPosition(audio.currentTime || 0);
      setCurrentTrackDuration(audio.duration || 0);
    };

    audio.addEventListener('timeupdate', syncTime);
    audio.addEventListener('loadedmetadata', syncTime);
    audio.addEventListener('durationchange', syncTime);

    return () => {
      audio.removeEventListener('timeupdate', syncTime);
      audio.removeEventListener('loadedmetadata', syncTime);
      audio.removeEventListener('durationchange', syncTime);
    };
  }, []);

  useEffect(() => {
    if (!activeEvent?.id) return;

    const settings = tvAudioSettingsRef.current;
    if (!settings.eventSoundsEnabled) {
      return;
    }

    const mappedTrackId = settings.eventSoundMap[activeEvent.type];
    const mappedTrack = mappedTrackId ? tracksByIdRef.current.get(mappedTrackId) : null;

    if (!eventAudioRef.current) return;

    let cancelled = false;

    const playMappedTrack = async () => {
      if (!mappedTrack) {
        playFallbackEventTone(activeEvent.type, settings.eventVolume);
        return;
      }

      let source = mappedTrack.dataUrl || null;
      let objectUrl: string | null = null;
      if (!source && mappedTrack.storageId) {
        objectUrl = await loadTvAudioObjectUrl(mappedTrack.storageId);
        source = objectUrl;
      }

      if (cancelled) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        return;
      }

      if (!source) {
        playFallbackEventTone(activeEvent.type, settings.eventVolume);
        return;
      }

      if (eventTrackObjectUrlRef.current && eventTrackObjectUrlRef.current !== source) {
        URL.revokeObjectURL(eventTrackObjectUrlRef.current);
        eventTrackObjectUrlRef.current = null;
      }

      if (objectUrl) {
        eventTrackObjectUrlRef.current = objectUrl;
      }

      eventAudioRef.current.src = source;
      eventAudioRef.current.currentTime = 0;
      eventAudioRef.current.volume = settings.eventVolume;
      eventAudioRef.current.play().catch(() => {
        playFallbackEventTone(activeEvent.type, settings.eventVolume);
      });
    };

    void playMappedTrack();

    return () => {
      cancelled = true;
    };
  }, [activeEvent?.id]);

  const mvpOfWeek =
    employees.length > 0 ? [...employees].sort((a, b) => b.weeklyPoints - a.weeklyPoints)[0] : undefined;

  const activeTvMemeClip = activeTvMeme ? memeClipsById.get(activeTvMeme.clipId) || null : null;
  const activeTvMemeAudioTrack =
    activeTvMeme?.audioTrackId ? tracksById.get(activeTvMeme.audioTrackId) || null : null;

  useEffect(() => {
    let cancelled = false;

    const clearObjectUrl = () => {
      if (activeMemeObjectUrlRef.current) {
        URL.revokeObjectURL(activeMemeObjectUrlRef.current);
        activeMemeObjectUrlRef.current = null;
      }
    };

    if (!activeTvMemeClip) {
      clearObjectUrl();
      setActiveTvMemeSource(null);
      return;
    }

    if (activeTvMemeClip.dataUrl) {
      clearObjectUrl();
      setActiveTvMemeSource(activeTvMemeClip.dataUrl);
      return;
    }

    if (!activeTvMemeClip.storageId) {
      clearObjectUrl();
      setActiveTvMemeSource(null);
      setActiveTvMeme(null);
      return;
    }

    setActiveTvMemeSource(null);

    loadMemeVideoObjectUrl(activeTvMemeClip.storageId)
      .then((objectUrl) => {
        if (cancelled) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          return;
        }

        clearObjectUrl();
        if (!objectUrl) {
          setActiveTvMemeSource(null);
          setActiveTvMeme(null);
          return;
        }

        activeMemeObjectUrlRef.current = objectUrl;
        setActiveTvMemeSource(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setActiveTvMemeSource(null);
          setActiveTvMeme(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTvMemeClip?.id]);

  useEffect(() => {
    let cancelled = false;

    const clearObjectUrl = () => {
      if (activeMemeAudioObjectUrlRef.current) {
        URL.revokeObjectURL(activeMemeAudioObjectUrlRef.current);
        activeMemeAudioObjectUrlRef.current = null;
      }
    };

    if (!activeTvMemeAudioTrack) {
      clearObjectUrl();
      setActiveTvMemeAudioSource(null);
      return;
    }

    if (activeTvMemeAudioTrack.dataUrl) {
      clearObjectUrl();
      setActiveTvMemeAudioSource(activeTvMemeAudioTrack.dataUrl);
      return;
    }

    if (!activeTvMemeAudioTrack.storageId) {
      clearObjectUrl();
      setActiveTvMemeAudioSource(null);
      return;
    }

    loadTvAudioObjectUrl(activeTvMemeAudioTrack.storageId)
      .then((objectUrl) => {
        if (cancelled) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          return;
        }

        clearObjectUrl();
        if (!objectUrl) {
          setActiveTvMemeAudioSource(null);
          return;
        }

        activeMemeAudioObjectUrlRef.current = objectUrl;
        setActiveTvMemeAudioSource(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setActiveTvMemeAudioSource(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTvMemeAudioTrack?.id]);

  const handleTvMemeComplete = useCallback(() => {
    setActiveTvMeme(null);
  }, []);

  const handleUnlockAudio = () => {
    const audio = backgroundAudioRef.current;
    if (!audio) return;

    audio.play().then(() => setAudioBlocked(false)).catch(() => {});
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <MemeCelebration
        points={memePoints}
        show={showPointsMeme && !activeTvMeme}
        onComplete={() => {
          setShowPointsMeme(false);
          if (pendingEventAfterCelebration) {
            setActiveEvent(pendingEventAfterCelebration);
            setPendingEventAfterCelebration(null);
          }
        }}
      />

      {tvMemeSettings.enabled && activeTvMeme && activeTvMemeClip && activeTvMemeSource && (
        <TvMemeOverlay
          meme={{ ...activeTvMeme, clip: activeTvMemeClip }}
          videoSrc={activeTvMemeSource}
          memeVolume={tvMemeSettings.memeVolume}
          soundEnabled={tvMemeSettings.memeSoundEnabled}
          audioDataUrl={activeTvMemeAudioSource}
          onComplete={handleTvMemeComplete}
        />
      )}

      <TVDisplay
        employees={employees}
        teams={teams}
        mvpOfWeek={mvpOfWeek}
        prizePool={prizePool}
        activeEvent={activeEvent}
        leaderPulseId={leaderPulseId}
        currentTrack={tracksById.get(currentTrackId || '') || null}
        currentTrackPosition={currentTrackPosition}
        currentTrackDuration={currentTrackDuration}
      />

      {audioBlocked && tvAudioSettings.musicEnabled && (
        <button
          onClick={handleUnlockAudio}
          className="fixed right-5 top-5 z-40 inline-flex items-center gap-2 rounded-xl border border-white/30 bg-black/45 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-black/60"
        >
          <Volume2 className="h-4 w-4" />
          Включить звук
        </button>
      )}

      <audio ref={backgroundAudioRef} preload="auto" />
      <audio ref={eventAudioRef} preload="auto" />
    </div>
  );
}
