import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { TvMemeClip, TvMemeTrigger } from '../context/AppContext';

interface TvMemeOverlayProps {
  meme: TvMemeTrigger & { clip: TvMemeClip };
  videoSrc: string;
  memeVolume: number;
  soundEnabled: boolean;
  audioDataUrl?: string | null;
  onComplete: () => void;
}

const FALLBACK_DURATION_MS = 15000;

export function TvMemeOverlay({
  meme,
  videoSrc,
  memeVolume,
  soundEnabled,
  audioDataUrl,
  onComplete,
}: TvMemeOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const extraAudioRef = useRef<HTMLAudioElement | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    finishedRef.current = false;

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onComplete();
    };

    const video = videoRef.current;
    if (!video) {
      finish();
      return;
    }

    video.currentTime = 0;
    video.volume = memeVolume;
    video.muted = !soundEnabled || Boolean(audioDataUrl);

    const handleEnded = () => finish();
    video.addEventListener('ended', handleEnded);

    const timeout = window.setTimeout(finish, FALLBACK_DURATION_MS);

    const startExtraAudio = () => {
      if (!audioDataUrl || !soundEnabled) return;

      const audio = new Audio(audioDataUrl);
      audio.volume = memeVolume;
      extraAudioRef.current = audio;
      audio.play().catch(() => {});
    };

    video
      .play()
      .then(() => {
        startExtraAudio();
      })
      .catch(() => {
        finish();
      });

    return () => {
      window.clearTimeout(timeout);
      video.removeEventListener('ended', handleEnded);
      video.pause();
      video.currentTime = 0;

      if (extraAudioRef.current) {
        extraAudioRef.current.pause();
        extraAudioRef.current.currentTime = 0;
        extraAudioRef.current = null;
      }
    };
  }, [meme.id, videoSrc, memeVolume, soundEnabled, audioDataUrl, onComplete]);

  const pointsLabel =
    typeof meme.points === 'number' ? `${meme.points > 0 ? '+' : ''}${meme.points}` : null;
  const pointsTone = meme.operationType === 'penalty' ? 'text-rose-200' : 'text-amber-200';

  return (
    <AnimatePresence>
      <motion.div
        key={meme.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-[#04010a]/84 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="relative w-[min(90vw,1400px)] overflow-hidden rounded-[28px] border border-fuchsia-200/40 bg-black/70 shadow-[0_30px_90px_rgba(4,0,18,0.72)]"
        >
          <div className="absolute left-0 top-0 z-10 flex w-full items-start justify-between gap-4 bg-gradient-to-r from-black/78 via-black/52 to-transparent px-5 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100/90">Meme alert</p>
              <p className="truncate text-lg font-black text-white">{meme.clip.name}</p>
              {meme.employeeName ? (
                <div className="mt-2 space-y-1 text-sm text-fuchsia-50/95">
                  <p className="font-bold text-white">
                    {meme.employeeName}{' '}
                    {pointsLabel ? <span className={pointsTone}>{pointsLabel} баллов</span> : null}
                  </p>
                  {meme.adminName ? <p>Начислил: {meme.adminName}</p> : null}
                  {meme.reason ? <p>За что: {meme.reason}</p> : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-white/25 bg-white/10 px-3 py-1 text-right">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-white/75">
                {meme.source === 'manual' ? 'Ручной запуск' : 'Авто по баллам'}
              </p>
              {pointsLabel ? <p className={`score-number text-lg font-black leading-none ${pointsTone}`}>{pointsLabel}</p> : null}
            </div>
          </div>

          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            preload="auto"
            className="h-[min(76vh,760px)] w-full bg-black object-contain"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
