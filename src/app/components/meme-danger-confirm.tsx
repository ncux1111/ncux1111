import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bomb, ShieldAlert } from 'lucide-react';

interface MemeDangerConfirmProps {
  open: boolean;
  title: string;
  finalLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const MEME_STEPS = [
  {
    title: 'Ты точно хочешь это сделать?',
    text: 'Действие опасное. Отменить потом может быть невозможно.',
  },
  {
    title: 'Ты не будешь об этом сожалеть?',
    text: 'Система еще надеется, что ты передумаешь.',
  },
  {
    title: 'Олег, не стоит, остановись!!!',
    text: 'Первое предупреждение.',
  },
  {
    title: 'Олег, не стоит, остановись!!!',
    text: 'Второе предупреждение.',
  },
  {
    title: 'Олег, не стоит, остановись!!!',
    text: 'Последнее предупреждение.',
  },
  {
    title: 'Ну и ладно....',
    text: 'Запускаем режим драматичного уничтожения.',
  },
];

export function MemeDangerConfirm({
  open,
  title,
  finalLabel,
  onCancel,
  onConfirm,
}: MemeDangerConfirmProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setCountdown(3);
    confirmedRef.current = false;
  }, [open]);

  const isCountdownStep = stepIndex >= MEME_STEPS.length;

  useEffect(() => {
    if (!open || !isCountdownStep) return;

    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          if (!confirmedRef.current) {
            confirmedRef.current = true;
            onConfirm();
          }
          return 0;
        }

        return prev - 1;
      });
    }, 700);

    return () => {
      window.clearInterval(timer);
    };
  }, [isCountdownStep, onConfirm, open]);

  if (!open) {
    return null;
  }

  const currentStep = MEME_STEPS[Math.min(stepIndex, MEME_STEPS.length - 1)];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-red-400/50 bg-gradient-to-br from-red-950 via-slate-900 to-red-950 p-6 text-white shadow-[0_20px_70px_-20px_rgba(239,68,68,0.7)]">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-xl border border-red-300/40 bg-red-500/20 p-2">
            {isCountdownStep ? <Bomb className="h-6 w-6 text-red-200" /> : <ShieldAlert className="h-6 w-6 text-red-200" />}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-200">Danger Zone</p>
            <h3 className="mt-1 text-xl font-black">{title}</h3>
            <p className="mt-1 text-sm text-red-100/90">{finalLabel}</p>
          </div>
        </div>

        <div className="rounded-xl border border-red-300/30 bg-black/25 p-4">
          <p className="text-2xl font-extrabold leading-tight">{currentStep.title}</p>
          <p className="mt-2 text-sm text-red-100/90">{currentStep.text}</p>
        </div>

        {isCountdownStep ? (
          <div className="mt-5 rounded-xl border border-amber-300/40 bg-amber-400/10 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Countdown</p>
            <p className="mt-2 text-6xl font-black text-amber-100">{countdown}</p>
            <p className="mt-1 text-sm text-amber-100/90">Запуск действия через {countdown}...</p>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Нажми Отмена в любой момент до обратного отсчета.</span>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-400/40 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-200/15"
          >
            Отмена
          </button>
          {!isCountdownStep && (
            <button
              onClick={() => setStepIndex((prev) => prev + 1)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Продолжить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
