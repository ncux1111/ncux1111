import { motion } from 'motion/react';
import { Scale } from 'lucide-react';

interface RouteLoaderProps {
  title?: string;
  description?: string;
}

export function RouteLoader({
  title = 'Загружаем раздел ZAN QDM',
  description = 'Поднимаем данные, интерфейс и защищённые модули без перезагрузки страницы.',
}: RouteLoaderProps) {
  return (
    <div
      data-testid="route-loader"
      aria-live="polite"
      className="flex min-h-[42vh] items-center justify-center px-4 py-10"
    >
      <div className="zan-panel mx-auto w-full max-w-2xl rounded-[2rem] p-8 text-center text-white">
        <motion.div
          animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-amber-300/35 bg-white/10"
        >
          <Scale className="h-8 w-8 text-amber-300" />
        </motion.div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">
          ZAN QDM
        </p>
        <h2 className="mt-3 text-2xl font-black">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 via-fuchsia-300 to-cyan-300"
            animate={{ x: ['-35%', '105%'] }}
            transition={{ repeat: Infinity, duration: 1.45, ease: 'easeInOut' }}
            style={{ width: '38%' }}
          />
        </div>
      </div>
    </div>
  );
}
