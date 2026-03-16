import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Edit2,
  Eye,
  EyeOff,
  ListMusic,
  Music2,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  Video,
  Volume2,
  VolumeX,
  WandSparkles,
} from 'lucide-react';
import {
  defaultTvAudioSettings,
  defaultTvMemeSettings,
  type TvEventSoundType,
  type VisibilitySettings,
  useApp,
} from '../../context/AppContext';
import {
  TV_AUDIO_ACCEPT,
  TV_EVENT_SOUND_LABELS,
  createAudioTrack,
  createStoredAudioTrack,
  fileToAudioDataUrl,
  formatFileSize,
  validateAudioFile,
} from '../../utils/tvAudio';
import {
  TV_MEME_VIDEO_ACCEPT,
  createMemeClip,
  formatMediaFileSize,
  validateMemeVideoFile,
} from '../../utils/tvMeme';
import { loadTvAudioObjectUrl, saveTvAudioBlob } from '../../utils/tvAudioLibrary';
import { deleteMemeVideoBlob, loadMemeVideoObjectUrl, saveMemeVideoBlob } from '../../utils/tvMemeLibrary';
import { MemeDangerConfirm } from '../../components/meme-danger-confirm';
import { InternalPageHero } from '../../components/site/internal-page-hero';
import { TvAudioPlayerPanel } from '../../components/admin/tv-audio-player-panel';

type DangerActionType = 'clearHistory' | 'resetPoints' | 'resetSystem';

const visibilityOptions: Array<{
  key: keyof VisibilitySettings;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    key: 'showSalaries',
    label: 'Показывать зарплаты',
    description: 'Отображать зарплаты сотрудников в интерфейсе.',
    icon: '💰',
  },
  {
    key: 'showSalarySection',
    label: 'Раздел финансов',
    description: 'Открывать раздел зарплат и прайс-листа в админке.',
    icon: '📊',
  },
  {
    key: 'showServices',
    label: 'Показывать услуги',
    description: 'Включать отображение блока услуг для сотрудников.',
    icon: '📋',
  },
  {
    key: 'showPrizePool',
    label: 'Показывать призовой фонд',
    description: 'Отображать блок призового фонда в рейтинге и TV режиме.',
    icon: '🏆',
  },
  {
    key: 'showOtherEmployeesPoints',
    label: 'Показывать рейтинг коллег',
    description: 'Показывать баллы других участников в личном кабинете сотрудников.',
    icon: '👥',
  },
  {
    key: 'showMVP',
    label: 'Показывать MVP недели',
    description: 'Включать блок MVP недели в рейтинге и на TV режиме.',
    icon: '⭐',
  },
  {
    key: 'showTeamRanking',
    label: 'Показывать рейтинг команд',
    description: 'Отображать командную статистику в блоке рейтинга.',
    icon: '⚖️',
  },
];

export function AdminSettings() {
  const {
    teams,
    soundEnabled,
    tvAudioSettings,
    tvMemeSettings,
    visibilitySettings,
    setEmployees,
    setTeams,
    setPrizePool,
    setPointsHistory,
    setServices,
    setVisibilitySettings,
    setSoundEnabled,
    setTvAudioSettings,
    setTvMemeSettings,
    triggerTvMeme,
    handleUpdateTeam,
  } = useApp();

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editedTeamName, setEditedTeamName] = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewSourceRef = useRef<string | null>(null);
  const [memePreviewSources, setMemePreviewSources] = useState<Record<string, string>>({});
  const [dangerAction, setDangerAction] = useState<DangerActionType | null>(null);
  const [playerStopSignal, setPlayerStopSignal] = useState(0);

  const stopPreviewPlayback = useCallback(() => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    if (previewSourceRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(previewSourceRef.current);
    }
    previewSourceRef.current = null;
    setPreviewTrackId(null);
  }, []);

  const dangerActionMeta = useMemo(() => {
    if (!dangerAction) return null;

    if (dangerAction === 'clearHistory') {
      return {
        title: 'Очистка журнала начислений',
        finalLabel:
          'Журнал начислений и штрафов будет очищен, события исчезнут без возможности восстановления.',
      };
    }

    if (dangerAction === 'resetPoints') {
      return {
        title: 'Обнуление всех результатов',
        finalLabel: 'У всех сотрудников и команд рейтинг вернётся к нулю вместе с призовым фондом.',
      };
    }

    return {
      title: 'Полный сброс системы',
      finalLabel:
        'Будут удалены сотрудники, команды, шаблоны, медиа, история и пользовательские настройки.',
    };
  }, [dangerAction]);

  useEffect(() => {
    return () => {
      stopPreviewPlayback();
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const urlsToRevoke: string[] = [];

    const loadPreviewSources = async () => {
      const nextSources: Record<string, string> = {};

      for (const clip of tvMemeSettings.clips) {
        if (clip.dataUrl) {
          nextSources[clip.id] = clip.dataUrl;
          continue;
        }

        if (!clip.storageId) {
          continue;
        }

        try {
          const objectUrl = await loadMemeVideoObjectUrl(clip.storageId);
          if (objectUrl) {
            nextSources[clip.id] = objectUrl;
            urlsToRevoke.push(objectUrl);
          }
        } catch {
          // preview loading errors are not critical for settings page
        }
      }

      if (!isActive) {
        urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      setMemePreviewSources(nextSources);
    };

    void loadPreviewSources();

    return () => {
      isActive = false;
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [tvMemeSettings.clips]);

  const toggleSetting = (settingKey: keyof VisibilitySettings) => {
    setVisibilitySettings({
      ...visibilitySettings,
      [settingKey]: !visibilitySettings[settingKey],
    });
  };

  const handleEditTeam = (teamId: string) => {
    const team = teams.find((item) => item.id === teamId);
    if (!team) return;

    setEditingTeamId(teamId);
    setEditedTeamName(team.name);
  };

  const handleSaveTeam = () => {
    if (!editingTeamId) return;

    const nextName = editedTeamName.trim();
    if (!nextName) return;

    handleUpdateTeam(editingTeamId, nextName);
    setEditingTeamId(null);
    setEditedTeamName('');
  };

  const handleConfirmDangerAction = () => {
    if (!dangerAction) return;

    if (dangerAction === 'clearHistory') {
      setPointsHistory([]);
      setDangerAction(null);
      return;
    }

    if (dangerAction === 'resetPoints') {
      setEmployees((prev) =>
        prev.map((employee) => ({
          ...employee,
          totalPoints: 0,
          weeklyPoints: 0,
        }))
      );
      setDangerAction(null);
      return;
    }

    setEmployees([]);
    setTeams([]);
    setPrizePool(0);
    setPointsHistory([]);
    setServices([]);
    setVisibilitySettings({
      showSalaries: false,
      showSalarySection: false,
      showServices: false,
      showPrizePool: false,
      showOtherEmployeesPoints: false,
      showMVP: false,
      showTeamRanking: false,
    });
    setSoundEnabled(false);
    setTvAudioSettings(defaultTvAudioSettings);
    setTvMemeSettings(defaultTvMemeSettings);
    setDangerAction(null);
    alert('Система полностью очищена.');
  };

  const handleAudioUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validationError = validateAudioFile(file, tvAudioSettings);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setUploadingAudio(true);
      const shouldStoreAsBlob = file.size > 4 * 1024 * 1024;
      const track = shouldStoreAsBlob
        ? (() => {
            const storageId = `tv-audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            return saveTvAudioBlob(storageId, file).then(() => createStoredAudioTrack(file, storageId));
          })()
        : fileToAudioDataUrl(file).then((dataUrl) => createAudioTrack(file, dataUrl));
      const nextTrack = await track;

      setTvAudioSettings((prev) => {
        const tracks = [...prev.tracks, nextTrack];
        const playlistTrackIds = prev.playlistTrackIds.includes(nextTrack.id)
          ? prev.playlistTrackIds
          : [...prev.playlistTrackIds, nextTrack.id];

        return {
          ...prev,
          tracks,
          playlistTrackIds,
          activeTrackId: prev.activeTrackId || nextTrack.id,
        };
      });
    } catch {
      alert('Не удалось загрузить аудиофайл. Проверьте формат и повторите попытку.');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleTogglePlaylistTrack = (trackId: string) => {
    setTvAudioSettings((prev) => {
      const exists = prev.playlistTrackIds.includes(trackId);
      const playlistTrackIds = exists
        ? prev.playlistTrackIds.filter((id) => id !== trackId)
        : [...prev.playlistTrackIds, trackId];

      const activeTrackId =
        prev.activeTrackId && playlistTrackIds.includes(prev.activeTrackId)
          ? prev.activeTrackId
          : playlistTrackIds[0] || null;

      return {
        ...prev,
        playlistTrackIds,
        activeTrackId,
      };
    });
  };

  const handleSetActiveTrack = (trackId: string) => {
    setTvAudioSettings((prev) => {
      const playlistTrackIds = prev.playlistTrackIds.includes(trackId)
        ? prev.playlistTrackIds
        : [...prev.playlistTrackIds, trackId];

      return {
        ...prev,
        playlistTrackIds,
        activeTrackId: trackId,
      };
    });
  };

  const handleDeleteTrack = (trackId: string) => {
    setTvAudioSettings((prev) => {
      const tracks = prev.tracks.filter((track) => track.id !== trackId);
      const playlistTrackIds = prev.playlistTrackIds.filter((id) => id !== trackId);
      const nextEventSoundMap = { ...prev.eventSoundMap };

      (Object.keys(nextEventSoundMap) as TvEventSoundType[]).forEach((key) => {
        if (nextEventSoundMap[key] === trackId) {
          delete nextEventSoundMap[key];
        }
      });

      const activeTrackId =
        prev.activeTrackId === trackId ? playlistTrackIds[0] || tracks[0]?.id || null : prev.activeTrackId;

      return {
        ...prev,
        tracks,
        playlistTrackIds,
        activeTrackId,
        eventSoundMap: nextEventSoundMap,
      };
    });

    setTvMemeSettings((prev) => ({
      ...prev,
      selectedAudioTrackId: prev.selectedAudioTrackId === trackId ? null : prev.selectedAudioTrackId,
    }));

    if (previewTrackId === trackId) {
      stopPreviewPlayback();
    }
  };

  const handleAssignEventSound = (eventType: TvEventSoundType, trackId: string) => {
    setTvAudioSettings((prev) => {
      const eventSoundMap = { ...prev.eventSoundMap };

      if (!trackId) {
        delete eventSoundMap[eventType];
      } else {
        eventSoundMap[eventType] = trackId;
      }

      return {
        ...prev,
        eventSoundMap,
      };
    });
  };
  const handleMemeVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validationError = validateMemeVideoFile(file, tvMemeSettings);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setUploadingVideo(true);
      const storageId = `meme-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await saveMemeVideoBlob(storageId, file);
      const clip = createMemeClip(file, { storageId });

      setTvMemeSettings((prev) => {
        const clips = [...prev.clips, clip];
        return {
          ...prev,
          clips,
          selectedClipId: prev.selectedClipId || clip.id,
        };
      });
    } catch {
      alert('Не удалось загрузить видео-мем. Проверьте размер файла и повторите попытку.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDeleteMemeClip = async (clipId: string) => {
    const deletingClip = tvMemeSettings.clips.find((clip) => clip.id === clipId);
    if (deletingClip?.storageId) {
      try {
        await deleteMemeVideoBlob(deletingClip.storageId);
      } catch {
        // ignore cleanup issues and still remove metadata
      }
    }

    setTvMemeSettings((prev) => {
      const clips = prev.clips.filter((clip) => clip.id !== clipId);
      const selectedClipId = prev.selectedClipId === clipId ? clips[0]?.id || null : prev.selectedClipId;

      return {
        ...prev,
        clips,
        selectedClipId,
      };
    });
  };

  const handleRunMemeNow = (clipId: string) => {
    if (!clipId) return;
    triggerTvMeme(clipId, { source: 'manual' });
  };

  const handlePreviewTrack = (trackId: string) => {
    const track = tvAudioSettings.tracks.find((item) => item.id === trackId);
    if (!track) return;

    const shouldStopCurrentPreview = previewTrackId === trackId;
    stopPreviewPlayback();
    setPlayerStopSignal((previous) => previous + 1);

    if (shouldStopCurrentPreview) {
      return;
    }

    const playPreview = async () => {
      const source = track.dataUrl || (track.storageId ? await loadTvAudioObjectUrl(track.storageId) : null);
      if (!source) {
        setPreviewTrackId(null);
        return;
      }

      const audio = new Audio(source);
      audio.volume = tvAudioSettings.eventVolume;
      audio.onended = () => {
        if (previewAudioRef.current === audio) {
          previewAudioRef.current = null;
          previewSourceRef.current = null;
          setPreviewTrackId(null);
        }
        if (track.storageId && source.startsWith('blob:')) {
          URL.revokeObjectURL(source);
        }
      };

      previewAudioRef.current = audio;
      previewSourceRef.current = source;
      setPreviewTrackId(trackId);
      audio.play().catch(() => {
        previewAudioRef.current = null;
        previewSourceRef.current = null;
        setPreviewTrackId(null);
        if (track.storageId && source.startsWith('blob:')) {
          URL.revokeObjectURL(source);
        }
      });
    };

    void playPreview();
  };

  return (
    <div className="space-y-6">
      <InternalPageHero
        eyebrow="ZAN QDM / Admin"
        title="Управление звуком и TV-режимом"
        description="В этом разделе настраиваются визуальные эффекты, мемы, видеоролики, звук, музыка и правила показа событий. Все изменения сразу влияют на рабочий TV-режим для офиса и шоу-экрана."
        actions={
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`zan-toolbar-button ${soundEnabled ? 'zan-toolbar-button-primary' : 'zan-toolbar-button-secondary'}`}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {soundEnabled ? 'Звук включён' : 'Звук отключён'}
          </button>
        }
      />

      <motion.section
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100">
            <Eye className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950">Видимость блоков</h2>
            <p className="mt-1 text-sm text-slate-600">
              Включайте только те модули, которые должны видеть сотрудники, рейтинг и TV экран.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {visibilityOptions.map((option) => (
            <motion.button
              key={option.key}
              whileHover={{ scale: 1.01 }}
              onClick={() => toggleSetting(option.key)}
              className={`flex items-center justify-between gap-4 rounded-[1.5rem] border p-4 text-left transition ${
                visibilitySettings[option.key]
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">{option.icon}</div>
                <div>
                  <p className="font-semibold text-slate-950">{option.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{option.description}</p>
                </div>
              </div>

              <div className={`rounded-2xl px-3 py-2 text-xs font-bold ${
                visibilitySettings[option.key]
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {visibilitySettings[option.key] ? 'Видно' : 'Скрыто'}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.04 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-100">
            <Video className="h-6 w-6 text-fuchsia-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950">Мемы и атмосфера TV</h2>
            <p className="mt-1 text-sm text-slate-600">
              Управляйте видеовставками и реакциями на смену лидера, крупные начисления и другие события.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <button
            onClick={() => setTvMemeSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              tvMemeSettings.enabled ? 'bg-fuchsia-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {tvMemeSettings.enabled ? 'Мемы включены' : 'Мемы отключены'}
          </button>
          <button
            onClick={() => setTvMemeSettings((prev) => ({ ...prev, autoPlayEnabled: !prev.autoPlayEnabled }))}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              tvMemeSettings.autoPlayEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {tvMemeSettings.autoPlayEnabled ? 'Автозапуск включён' : 'Автозапуск отключён'}
          </button>
          <button
            onClick={() => setTvMemeSettings((prev) => ({ ...prev, memeSoundEnabled: !prev.memeSoundEnabled }))}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              tvMemeSettings.memeSoundEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {tvMemeSettings.memeSoundEnabled ? 'Звук мемов включён' : 'Звук мемов отключён'}
          </button>
          <button
            onClick={() => setTvMemeSettings((prev) => ({ ...prev, autoPlayRandom: !prev.autoPlayRandom }))}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              tvMemeSettings.autoPlayRandom ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {tvMemeSettings.autoPlayRandom ? 'Случайный выбор клипа' : 'Один выбранный клип'}
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <label className="zan-muted-card rounded-[1.5rem] p-4">
            <p className="text-sm font-semibold text-slate-700">Громкость мема</p>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={tvMemeSettings.memeVolume}
              onChange={(event) =>
                setTvMemeSettings((prev) => ({
                  ...prev,
                  memeVolume: Number(event.target.value),
                }))
              }
              className="mt-3 w-full"
            />
            <p className="mt-2 text-xs text-slate-500">{Math.round(tvMemeSettings.memeVolume * 100)}%</p>
          </label>

          <label className="zan-muted-card rounded-[1.5rem] p-4">
            <p className="text-sm font-semibold text-slate-700">Порог автозапуска</p>
            <input
              type="number"
              min={1}
              max={1000}
              value={tvMemeSettings.autoPlayMinPoints}
              onChange={(event) =>
                setTvMemeSettings((prev) => ({
                  ...prev,
                  autoPlayMinPoints: Math.max(1, Math.min(1000, Number(event.target.value) || 1)),
                }))
              }
              className="zan-input mt-3 w-full px-4 py-3 text-sm"
            />
            <p className="mt-2 text-xs text-slate-500">При каком количестве очков можно запускать мем автоматически.</p>
          </label>

          <label className="zan-muted-card rounded-[1.5rem] p-4">
            <p className="text-sm font-semibold text-slate-700">Аудио для мема</p>
            <select
              value={tvMemeSettings.selectedAudioTrackId || ''}
              onChange={(event) =>
                setTvMemeSettings((prev) => ({
                  ...prev,
                  selectedAudioTrackId: event.target.value || null,
                }))
              }
              className="zan-select mt-3 w-full px-4 py-3 text-sm"
            >
              <option value="">Без отдельного трека</option>
              {tvAudioSettings.tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          </label>

          <div className="zan-muted-card rounded-[1.5rem] p-4">
            <p className="text-sm font-semibold text-slate-700">Активный клип</p>
            <select
              value={tvMemeSettings.selectedClipId || ''}
              onChange={(event) =>
                setTvMemeSettings((prev) => ({
                  ...prev,
                  selectedClipId: event.target.value || null,
                }))
              }
              className="zan-select mt-3 w-full px-4 py-3 text-sm"
            >
              <option value="">Выберите клип</option>
              {tvMemeSettings.clips.map((clip) => (
                <option key={clip.id} value={clip.id}>
                  {clip.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => tvMemeSettings.selectedClipId && handleRunMemeNow(tvMemeSettings.selectedClipId)}
              disabled={!tvMemeSettings.selectedClipId}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <WandSparkles className="h-4 w-4" />
              Запустить на TV
            </button>
          </div>
        </div>

        <div className="zan-muted-card mt-4 rounded-[1.5rem] p-4">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Upload className="h-4 w-4" />
            Загрузить видео-мем
          </label>
          <input
            type="file"
            accept={TV_MEME_VIDEO_ACCEPT}
            onChange={handleMemeVideoUpload}
            disabled={uploadingVideo}
            className="zan-input w-full px-4 py-3 text-sm"
          />
          <p className="mt-2 text-xs text-slate-500">Поддерживаются mp4 и webm. Максимум 20 МБ на один файл.</p>
        </div>
        {tvMemeSettings.clips.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            Пока нет видео-мемов. Загрузите хотя бы один клип для TV режима.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {tvMemeSettings.clips.map((clip) => {
              const isDefault = tvMemeSettings.selectedClipId === clip.id;

              return (
                <div key={clip.id} className="zan-muted-card rounded-[1.5rem] p-4">
                  <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                    {memePreviewSources[clip.id] ? (
                      <video
                        src={memePreviewSources[clip.id]}
                        className="h-36 w-full rounded-2xl border border-slate-200 bg-black object-cover"
                        controls
                        preload="metadata"
                      />
                    ) : (
                        <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 text-xs text-slate-500">
                          Предпросмотр недоступен
                        </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-950">{clip.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatMediaFileSize(clip.size)}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            setTvMemeSettings((prev) => ({
                              ...prev,
                              selectedClipId: clip.id,
                            }))
                          }
                          className={`rounded-2xl px-4 py-2 text-xs font-semibold ${
                            isDefault
                              ? 'bg-indigo-600 text-white'
                              : 'border border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50'
                          }`}
                        >
                          {isDefault ? 'Клип по умолчанию' : 'Сделать основным'}
                        </button>
                        <button
                          onClick={() => handleRunMemeNow(clip.id)}
                          className="rounded-2xl border border-fuchsia-300 bg-white px-4 py-2 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-50"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            Запустить
                          </span>
                        </button>
                        <button
                          onClick={() => void handleDeleteMemeClip(clip.id)}
                          className="rounded-2xl border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Trash2 className="h-3 w-3" />
                            Удалить
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>

      <motion.section
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.08 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100">
            {soundEnabled ? (
              <Volume2 className="h-6 w-6 text-orange-600" />
            ) : (
              <VolumeX className="h-6 w-6 text-orange-600" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950">Звук и музыка TV</h2>
            <p className="mt-1 text-sm text-slate-600">
              Настраивайте фоновые композиции, громкость событий и музыку для показа TV режима.
            </p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-orange-200 bg-orange-50/80 px-4 py-4">
          <p className="text-sm font-black text-slate-950">Как это работает</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            Общий звук — главный переключатель всего аудио TV-режима. Фоновая музыка управляет только музыкой из
            плейлиста. Звуки событий управляют только короткими уведомлениями: новый лидер, MVP, выход в топ,
            последнее место и другие сигналы.
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="space-y-2 rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                soundEnabled ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {soundEnabled ? 'Общий звук включён' : 'Общий звук отключён'}
            </button>
            <p className="text-xs leading-6 text-slate-500">
              Включает или отключает вообще весь звук TV-режима: музыку и звуки событий.
            </p>
          </div>

          <div className="space-y-2 rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <button
              onClick={() => setTvAudioSettings((prev) => ({ ...prev, musicEnabled: !prev.musicEnabled }))}
              className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                tvAudioSettings.musicEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {tvAudioSettings.musicEnabled ? 'Фоновая музыка включена' : 'Фоновая музыка отключена'}
            </button>
            <p className="text-xs leading-6 text-slate-500">
              Управляет только музыкой из плейлиста. Если выключено, музыка не играет, но звуки событий могут
              остаться включёнными.
            </p>
          </div>

          <div className="space-y-2 rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <button
              onClick={() => setTvAudioSettings((prev) => ({ ...prev, eventSoundsEnabled: !prev.eventSoundsEnabled }))}
              className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                tvAudioSettings.eventSoundsEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {tvAudioSettings.eventSoundsEnabled ? 'Звуки событий включены' : 'Звуки событий отключены'}
            </button>
            <p className="text-xs leading-6 text-slate-500">
              Управляет короткими звуками уведомлений TV-режима.
            </p>
          </div>
        </div>

        {!tvAudioSettings.musicEnabled ? (
          <div className="mt-4 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Фоновая музыка отключена. Музыка плейлиста не воспроизводится.
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="zan-muted-card rounded-[1.5rem] p-4">
            <p className="text-sm font-semibold text-slate-700">Громкость фоновой музыки</p>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={tvAudioSettings.backgroundVolume}
              onChange={(event) =>
                setTvAudioSettings((prev) => ({
                  ...prev,
                  backgroundVolume: Number(event.target.value),
                }))
              }
              className="mt-3 w-full"
            />
            <p className="mt-2 text-xs text-slate-500">{Math.round(tvAudioSettings.backgroundVolume * 100)}%</p>
          </label>

          <label className="zan-muted-card rounded-[1.5rem] p-4">
            <p className="text-sm font-semibold text-slate-700">Громкость звуков событий</p>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={tvAudioSettings.eventVolume}
              onChange={(event) =>
                setTvAudioSettings((prev) => ({
                  ...prev,
                  eventVolume: Number(event.target.value),
                }))
              }
              className="mt-3 w-full"
            />
            <p className="mt-2 text-xs text-slate-500">{Math.round(tvAudioSettings.eventVolume * 100)}%</p>
          </label>
        </div>

        <div className="zan-muted-card mt-4 rounded-[1.5rem] p-4">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Upload className="h-4 w-4" />
            Загрузить аудиотрек
          </label>
          <input
            type="file"
            accept={TV_AUDIO_ACCEPT}
            onChange={handleAudioUpload}
            disabled={uploadingAudio}
            className="zan-input w-full px-4 py-3 text-sm"
          />
          <p className="mt-2 text-xs text-slate-500">
            Поддерживаются mp3, wav, ogg, m4a, aac, webm и mp4. Максимум 20 МБ на один файл.
          </p>
        </div>

        {tvAudioSettings.tracks.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            Пока нет аудиотреков. Загрузите хотя бы один трек для TV режима.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {tvAudioSettings.tracks.map((track) => {
              const isInPlaylist = tvAudioSettings.playlistTrackIds.includes(track.id);
              const isActive = tvAudioSettings.activeTrackId === track.id;
              const isPreviewing = previewTrackId === track.id;

              return (
                <div key={track.id} className="zan-muted-card rounded-[1.5rem] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{track.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatFileSize(track.size)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handlePreviewTrack(track.id)}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <span className="inline-flex items-center gap-1">
                            {isPreviewing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                            {isPreviewing ? 'Остановить' : 'Прослушать'}
                          </span>
                        </button>
                      <button
                        onClick={() => handleSetActiveTrack(track.id)}
                        className={`rounded-2xl px-4 py-2 text-xs font-semibold ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'border border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50'
                        }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Radio className="h-3 w-3" />
                            {isActive ? 'Активный трек' : 'Сделать активным'}
                          </span>
                        </button>
                      <button
                        onClick={() => handleTogglePlaylistTrack(track.id)}
                        className={`rounded-2xl px-4 py-2 text-xs font-semibold ${
                          isInPlaylist
                            ? 'bg-emerald-600 text-white'
                            : 'border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50'
                        }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            <ListMusic className="h-3 w-3" />
                            {isInPlaylist ? 'В плейлисте' : 'Добавить в плейлист'}
                          </span>
                        </button>
                      <button
                        onClick={() => handleDeleteTrack(track.id)}
                        className="rounded-2xl border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Trash2 className="h-3 w-3" />
                            Удалить
                          </span>
                        </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="zan-muted-card mt-4 rounded-[1.5rem] p-4">
          <h3 className="text-sm font-semibold text-slate-800">Звуки событий</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {(Object.keys(TV_EVENT_SOUND_LABELS) as TvEventSoundType[]).map((eventType) => (
              <label key={eventType} className="text-sm">
                <span className="mb-2 block font-medium text-slate-700">{TV_EVENT_SOUND_LABELS[eventType]}</span>
                <select
                  value={tvAudioSettings.eventSoundMap[eventType] || ''}
                  onChange={(event) => handleAssignEventSound(eventType, event.target.value)}
                  className="zan-select w-full px-4 py-3 text-sm"
                >
                  <option value="">Без отдельного трека</option>
                  {tvAudioSettings.tracks.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      </motion.section>

          <TvAudioPlayerPanel
            onBeforePlaybackStart={stopPreviewPlayback}
            externalStopSignal={playerStopSignal}
          />

      <motion.section
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.12 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100">
            <Edit2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950">Названия команд</h2>
            <p className="mt-1 text-sm text-slate-600">
              Переименовывайте команды, не затрагивая сотрудников и исторические начисления.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {teams.map((team) => (
            <div key={team.id} className="zan-muted-card rounded-[1.5rem] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{team.name}</p>
                  <p className="mt-1 text-xs text-slate-500">ID: {team.id}</p>
                </div>

                {editingTeamId === team.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={editedTeamName}
                      onChange={(event) => setEditedTeamName(event.target.value)}
                      className="zan-input min-w-[220px] px-4 py-3 text-sm"
                      placeholder="Новое название команды"
                    />
                    <button onClick={handleSaveTeam} className="zan-toolbar-button zan-toolbar-button-primary">
                      <Save className="h-4 w-4" />
                      Сохранить
                    </button>
                    <button
                      onClick={() => {
                        setEditingTeamId(null);
                        setEditedTeamName('');
                      }}
                      className="zan-toolbar-button zan-toolbar-button-secondary"
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEditTeam(team.id)}
                    className="zan-toolbar-button zan-toolbar-button-secondary"
                  >
                    <Edit2 className="h-4 w-4" />
                    Изменить название
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.16 }}
        className="zan-section-card rounded-[2rem] p-6"
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950">Опасные действия</h2>
            <p className="mt-1 text-sm text-slate-600">
              Эти операции влияют на все рабочие данные. Перед выполнением потребуется многошаговое подтверждение.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[1.5rem] border border-amber-300 bg-amber-50 p-5">
            <h3 className="text-lg font-bold text-slate-950">Очистить журнал</h3>
            <p className="mt-2 text-sm text-slate-600">Удаляет журнал начислений и штрафов.</p>
            <button
              onClick={() => setDangerAction('clearHistory')}
              className="mt-4 w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Очистить журнал начислений
            </button>
          </div>

          <div className="rounded-[1.5rem] border border-red-300 bg-red-50 p-5">
            <h3 className="text-lg font-bold text-slate-950">Сбросить очки</h3>
            <p className="mt-2 text-sm text-slate-600">Обнуляет результаты и призовой фонд для всех сотрудников.</p>
            <button
              onClick={() => setDangerAction('resetPoints')}
              className="mt-4 w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
            >
              Обнулить очки и фонд
            </button>
          </div>

          <div className="rounded-[1.5rem] border border-red-500 bg-slate-950 p-5 text-white">
            <h3 className="text-lg font-bold">Полный сброс системы</h3>
            <p className="mt-2 text-sm text-slate-300">
              Удалит сотрудников, команды, шаблоны, медиа и сохранённые настройки.
            </p>
            <button
              onClick={() => setDangerAction('resetSystem')}
              className="mt-4 w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"
            >
              Стереть все данные
            </button>
          </div>
        </div>
      </motion.section>

      <MemeDangerConfirm
        open={dangerAction !== null}
        title={dangerActionMeta?.title || ''}
        finalLabel={dangerActionMeta?.finalLabel || ''}
        onCancel={() => setDangerAction(null)}
        onConfirm={handleConfirmDangerAction}
      />
    </div>
  );
}

