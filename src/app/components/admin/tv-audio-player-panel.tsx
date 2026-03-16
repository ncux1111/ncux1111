import { useEffect, useMemo, useRef, useState } from 'react';
import { ListMusic, Pause, Play, RotateCcw, SkipBack, SkipForward, Square } from 'lucide-react';
import { useApp, type TvAudioTrack } from '../../context/AppContext';
import { formatFileSize, formatMediaDuration } from '../../utils/tvAudio';
import { loadTvAudioObjectUrl } from '../../utils/tvAudioLibrary';

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

function splitTrackMeta(name: string) {
  const parts = name.split(' - ').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      artist: parts[0],
      title: parts.slice(1).join(' - '),
    };
  }

  return {
    title: name,
    artist: 'Без указанного исполнителя',
  };
}

async function resolveTrackSource(track: TvAudioTrack) {
  if (track.dataUrl) return track.dataUrl;
  if (track.storageId) return loadTvAudioObjectUrl(track.storageId);
  return null;
}

export function TvAudioPlayerPanel({
  onBeforePlaybackStart,
  externalStopSignal = 0,
}: {
  onBeforePlaybackStart?: () => void;
  externalStopSignal?: number;
}) {
  const { tvAudioSettings, setTvAudioSettings } = useApp();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const playingTrackIdRef = useRef<string | null>(tvAudioSettings.activeTrackId);
  const playlistTrackIdsRef = useRef<string[]>(tvAudioSettings.playlistTrackIds);
  const playRequestIdRef = useRef(0);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(tvAudioSettings.activeTrackId);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [durationsById, setDurationsById] = useState<Record<string, number>>({});

  const activeTrack = useMemo(
    () => tvAudioSettings.tracks.find((track) => track.id === playingTrackId) || null,
    [playingTrackId, tvAudioSettings.tracks]
  );

  const playlistTrackIds = useMemo(() => {
    const validIds = new Set(tvAudioSettings.tracks.map((track) => track.id));
    return tvAudioSettings.playlistTrackIds.filter((trackId) => validIds.has(trackId));
  }, [tvAudioSettings.playlistTrackIds, tvAudioSettings.tracks]);

  useEffect(() => {
    setPlayingTrackId(tvAudioSettings.activeTrackId || null);
  }, [tvAudioSettings.activeTrackId]);

  useEffect(() => {
    playingTrackIdRef.current = playingTrackId;
  }, [playingTrackId]);

  useEffect(() => {
    playlistTrackIdsRef.current = playlistTrackIds;
  }, [playlistTrackIds]);

  useEffect(() => {
    let cancelled = false;

    const loadDurations = async () => {
      const next: Record<string, number> = {};

      for (const track of tvAudioSettings.tracks) {
        try {
          const source = await resolveTrackSource(track);
          if (!source || cancelled) continue;

          next[track.id] = await new Promise<number>((resolve) => {
            const probe = document.createElement('audio');
            probe.preload = 'metadata';
            probe.src = source;
            probe.onloadedmetadata = () => resolve(Number.isFinite(probe.duration) ? probe.duration : 0);
            probe.onerror = () => resolve(0);
          });

          if (track.storageId && source.startsWith('blob:')) {
            URL.revokeObjectURL(source);
          }
        } catch {
          next[track.id] = 0;
        }
      }

      if (!cancelled) {
        setDurationsById(next);
      }
    };

    void loadDurations();

    return () => {
      cancelled = true;
    };
  }, [tvAudioSettings.tracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const sync = () => {
      setCurrentTime(audio.currentTime || 0);
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      setPlaybackStatus('stopped');
      const currentIndex = playlistTrackIdsRef.current.indexOf(playingTrackIdRef.current || '');
      const nextTrackId =
        currentIndex >= 0 && playlistTrackIdsRef.current.length > 0
          ? playlistTrackIdsRef.current[(currentIndex + 1) % playlistTrackIdsRef.current.length]
          : null;

      if (nextTrackId) {
        setPlayingTrackId(nextTrackId);
        setTvAudioSettings((previous) => ({
          ...previous,
          activeTrackId: nextTrackId,
        }));
      }
    };

    const handlePlay = () => {
      setPlaybackStatus('playing');
      sync();
    };

    const handlePause = () => {
      setPlaybackStatus(audio.currentTime > 0 ? 'paused' : 'stopped');
      sync();
    };

    const handleError = () => {
      setPlaybackStatus('error');
    };

    audio.addEventListener('timeupdate', sync);
    audio.addEventListener('loadedmetadata', sync);
    audio.addEventListener('durationchange', sync);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', sync);
      audio.removeEventListener('loadedmetadata', sync);
      audio.removeEventListener('durationchange', sync);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [setTvAudioSettings]);

  useEffect(() => {
    if (externalStopSignal <= 0) return;

    const audio = audioRef.current;
    if (!audio) return;

    playRequestIdRef.current += 1;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setPlaybackStatus('stopped');
  }, [externalStopSignal]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = tvAudioSettings.backgroundVolume;
  }, [tvAudioSettings.backgroundVolume]);

  useEffect(() => {
    let cancelled = false;
    const audio = audioRef.current;
    if (!audio || !activeTrack) {
      if (audio) {
        playRequestIdRef.current += 1;
        audio.pause();
        audio.removeAttribute('src');
        audio.removeAttribute('data-track-id');
        audio.removeAttribute('data-source-key');
        audio.load();
      }
      setCurrentTime(0);
      setDuration(0);
      setPlaybackStatus('idle');
      return;
    }

    const loadTrack = async () => {
      const source = await resolveTrackSource(activeTrack);
      if (!source || cancelled) return;

      onBeforePlaybackStart?.();

      if (objectUrlRef.current && objectUrlRef.current !== source) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      if (source.startsWith('blob:')) {
        objectUrlRef.current = source;
      }

      const sourceKey = activeTrack.storageId || activeTrack.dataUrl || activeTrack.id;
      const shouldReload =
        audio.dataset.trackId !== activeTrack.id ||
        audio.dataset.sourceKey !== sourceKey ||
        !audio.src;

      const requestId = ++playRequestIdRef.current;

      if (shouldReload) {
        audio.pause();
        audio.src = source;
        audio.currentTime = 0;
        audio.dataset.trackId = activeTrack.id;
        audio.dataset.sourceKey = sourceKey;
        audio.load();
        setCurrentTime(0);
      }

      setPlaybackStatus('loading');

      audio.play().then(() => {
        if (!cancelled && playRequestIdRef.current === requestId) {
          setPlaybackStatus('playing');
        }
      }).catch(() => {
        if (!cancelled && playRequestIdRef.current === requestId) {
          setPlaybackStatus('error');
        }
      });
    };

    void loadTrack();

    return () => {
      cancelled = true;
    };
  }, [activeTrack?.id, activeTrack?.dataUrl, activeTrack?.storageId, onBeforePlaybackStart]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const selectTrack = (trackId: string) => {
    if (trackId === playingTrackId) {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) {
        onBeforePlaybackStart?.();
        const requestId = ++playRequestIdRef.current;
        setPlaybackStatus('loading');
        audio.play().then(() => {
          if (playRequestIdRef.current === requestId) {
            setPlaybackStatus('playing');
          }
        }).catch(() => {
          if (playRequestIdRef.current === requestId) {
            setPlaybackStatus('error');
          }
        });
      }
      return;
    }

    setPlayingTrackId(trackId);
    setTvAudioSettings((previous) => ({
      ...previous,
      activeTrackId: trackId,
      playlistTrackIds: previous.playlistTrackIds.includes(trackId)
        ? previous.playlistTrackIds
        : [...previous.playlistTrackIds, trackId],
    }));
  };

  const restartTrack = () => {
    const audio = audioRef.current;
    if (!audio) return;
    onBeforePlaybackStart?.();
    audio.currentTime = 0;
    setCurrentTime(0);
    if (audio.paused) {
      const requestId = ++playRequestIdRef.current;
      setPlaybackStatus('loading');
      audio.play().then(() => {
        if (playRequestIdRef.current === requestId) {
          setPlaybackStatus('playing');
        }
      }).catch(() => {
        if (playRequestIdRef.current === requestId) {
          setPlaybackStatus('error');
        }
      });
    }
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      onBeforePlaybackStart?.();
      const requestId = ++playRequestIdRef.current;
      setPlaybackStatus('loading');
      audio.play().then(() => {
        if (playRequestIdRef.current === requestId) {
          setPlaybackStatus('playing');
        }
      }).catch(() => {
        if (playRequestIdRef.current === requestId) {
          setPlaybackStatus('error');
        }
      });
    } else {
      playRequestIdRef.current += 1;
      audio.pause();
    }
  };

  const stopPlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    playRequestIdRef.current += 1;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setPlaybackStatus('stopped');
  };

  const seekBy = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Math.max(0, Math.min((audio.duration || 0) || currentTime + delta, audio.currentTime + delta));
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const activeMeta = splitTrackMeta(activeTrack?.name || '');
  const isPlaying = playbackStatus === 'playing';
  const primaryActionLabel =
    playbackStatus === 'paused' ? 'Продолжить' : playbackStatus === 'playing' ? 'Пауза' : 'Воспроизвести';
  const statusLabel =
    playbackStatus === 'loading'
      ? 'Загрузка'
      : playbackStatus === 'playing'
        ? 'Играет'
        : playbackStatus === 'paused'
          ? 'На паузе'
          : playbackStatus === 'stopped'
            ? 'Остановлен'
            : playbackStatus === 'error'
              ? 'Ошибка воспроизведения'
              : 'Не выбран';

  return (
    <section className="zan-section-card rounded-[2rem] p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <ListMusic className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-950">Плеер TV-режима</h2>
          <p className="mt-1 text-sm text-slate-600">
            Управление текущим треком, прогрессом воспроизведения и быстрый просмотр длительности плейлиста.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[1.8rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_20px_40px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/80">Сейчас играет</p>
            <span
              className={`rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] ${
                playbackStatus === 'playing'
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : playbackStatus === 'paused'
                    ? 'bg-amber-500/20 text-amber-200'
                    : playbackStatus === 'error'
                      ? 'bg-rose-500/20 text-rose-200'
                      : 'bg-white/10 text-slate-300'
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-3 text-2xl font-black">{activeMeta.title || 'Трек не выбран'}</p>
          <p className="mt-1 text-sm text-slate-300">{activeMeta.artist}</p>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
            <span>{formatMediaDuration(currentTime)}</span>
            <span>{formatMediaDuration(duration)}</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => seekBy(-10)} className="zan-toolbar-button zan-toolbar-button-secondary">
              <SkipBack className="h-4 w-4" />
              -10 сек
            </button>
            <button onClick={togglePlayback} className="zan-toolbar-button zan-toolbar-button-primary">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {primaryActionLabel}
            </button>
            <button onClick={stopPlayback} className="zan-toolbar-button zan-toolbar-button-secondary">
              <Square className="h-4 w-4" />
              Стоп
            </button>
            <button onClick={() => seekBy(10)} className="zan-toolbar-button zan-toolbar-button-secondary">
              <SkipForward className="h-4 w-4" />
              +10 сек
            </button>
            <button onClick={restartTrack} className="zan-toolbar-button zan-toolbar-button-secondary">
              <RotateCcw className="h-4 w-4" />
              К началу трека
            </button>
          </div>

          <input
            type="range"
            min="0"
            max={Math.max(duration, 0.1)}
            step="0.1"
            value={Math.min(currentTime, Math.max(duration, 0.1))}
            onChange={(event) => {
              const audio = audioRef.current;
              if (!audio) return;
              const nextTime = Number(event.target.value);
              audio.currentTime = nextTime;
              setCurrentTime(nextTime);
            }}
            className="mt-5 w-full"
          />
        </div>

        <div className="space-y-3">
          {tvAudioSettings.tracks.length === 0 ? (
            <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
              Пока нет треков. Загрузите музыку в настройках ниже.
            </div>
          ) : (
            tvAudioSettings.tracks.map((track) => {
              const isActive = track.id === (tvAudioSettings.activeTrackId || playingTrackId);
              const isInPlaylist = tvAudioSettings.playlistTrackIds.includes(track.id);
              const trackStatus = isActive
                ? playbackStatus === 'playing'
                  ? 'играет сейчас'
                  : playbackStatus === 'paused'
                    ? 'на паузе'
                    : playbackStatus === 'loading'
                      ? 'загружается'
                      : playbackStatus === 'error'
                        ? 'ошибка'
                        : 'остановлен'
                : null;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => selectTrack(track.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-[1.5rem] border px-4 py-4 text-left transition ${
                    isActive ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950">{track.name}</p>
                      {trackStatus ? (
                        <span className="rounded-full bg-sky-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                          {trackStatus}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatFileSize(track.size)} • {formatMediaDuration(durationsById[track.id] || 0)}
                    </p>
                  </div>
                  <div className="text-right text-xs font-semibold text-slate-600">
                    {isInPlaylist ? 'В плейлисте' : 'Вне плейлиста'}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <audio ref={audioRef} preload="metadata" />
    </section>
  );
}
