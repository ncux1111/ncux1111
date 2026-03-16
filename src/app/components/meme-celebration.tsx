import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';

interface MemeCelebrationProps {
  points: number;
  show: boolean;
  onComplete: () => void;
}

// Библиотека мемов для разных количеств баллов
const MEMES = {
  1: [
    { emoji: '👍', text: 'Хорошая работа!' },
    { emoji: '💪', text: 'Продолжай в том же духе!' },
    { emoji: '✨', text: 'Отлично!' },
    { emoji: '🎯', text: 'В точку!' },
  ],
  2: [
    { emoji: '🔥', text: 'Огонь!' },
    { emoji: '⚡', text: 'Молния!' },
    { emoji: '🚀', text: 'К звездам!' },
    { emoji: '💎', text: 'Бриллиант!' },
    { emoji: '🎪', text: 'Ого-го!' },
  ],
  3: [
    { emoji: '🏆', text: 'ЛЕГЕНДА!' },
    { emoji: '👑', text: 'КОРОЛЬ!' },
    { emoji: '💥', text: 'БУМ!' },
    { emoji: '🌟', text: 'СУПЕР!' },
    { emoji: '🎉', text: 'ШИКАРНО!' },
    { emoji: '🦸', text: 'ГЕРОЙ!' },
  ]
};

const CONFETTI_EMOJIS = ['🎉', '🎊', '⭐', '✨', '💫', '🌟', '🎯', '🏆', '💎', '🔥'];

function getMemeTier(points: number): keyof typeof MEMES {
  if (points >= 10) return 3;
  if (points >= 4) return 2;
  return 1;
}

export function MemeCelebration({ points, show, onComplete }: MemeCelebrationProps) {
  const [meme, setMeme] = useState({ emoji: '🎉', text: 'Отлично!' });
  const [confetti, setConfetti] = useState<Array<{ id: number; emoji: string; x: number; delay: number }>>([]);

  useEffect(() => {
    if (show) {
      // Выбираем случайный мем
      const memeList = MEMES[getMemeTier(points)] || MEMES[1];
      const randomMeme = memeList[Math.floor(Math.random() * memeList.length)];
      setMeme(randomMeme);

      // Генерируем конфетти
      const confettiCount = Math.min(42, Math.max(10, 8 + Math.floor(points * 1.2)));
      const newConfetti = Array.from({ length: confettiCount }, (_, i) => ({
        id: i,
        emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
        x: Math.random() * 100,
        delay: Math.random() * 0.3,
      }));
      setConfetti(newConfetti);

      // Завершаем анимацию через 2.5 секунды
      const timer = setTimeout(onComplete, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, points, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
        >
          {/* Фон с пульсацией */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
              opacity: [0, 0.3, 0],
            }}
            transition={{ duration: 1, times: [0, 0.5, 1] }}
            className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600"
          />

          {/* Конфетти */}
          {confetti.map((item) => (
            <motion.div
              key={item.id}
              initial={{ 
                y: -100, 
                x: `${item.x}%`,
                opacity: 1,
                rotate: 0,
                scale: 0
              }}
              animate={{ 
                y: window.innerHeight + 100,
                rotate: 360 * 3,
                scale: [0, 1, 1, 0.8],
                opacity: [0, 1, 1, 0]
              }}
              transition={{ 
                duration: 2 + Math.random(),
                delay: item.delay,
                ease: "easeOut"
              }}
              className="absolute text-4xl"
              style={{ left: `${item.x}%` }}
            >
              {item.emoji}
            </motion.div>
          ))}

          {/* Основной мем */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ 
              scale: [0, 1.2, 1],
              rotate: [0, 10, -10, 0],
            }}
            transition={{ 
              duration: 0.6,
              rotate: {
                duration: 0.4,
                repeat: 3,
                ease: "easeInOut"
              }
            }}
            className="relative z-10 text-center bg-white rounded-3xl shadow-2xl p-8 border-4 border-yellow-400"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="text-9xl mb-4"
            >
              {meme.emoji}
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600"
            >
              {meme.text}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-6xl font-black text-green-600 mt-4"
            >
              {points} баллов
            </motion.p>
          </motion.div>

          {/* Дополнительные эффекты для крупных начислений */}
          {points >= 10 && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ 
                  scale: [0, 3, 0],
                  rotate: [0, 180, 360],
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                }}
                className="absolute inset-0 flex items-center justify-center text-9xl opacity-20"
              >
                👑
              </motion.div>
              
              {/* Световые вспышки */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0.5, 2],
                  }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.1,
                    repeat: 3,
                  }}
                  className="absolute w-32 h-1 bg-yellow-400"
                  style={{
                    transform: `rotate(${i * 45}deg)`,
                    transformOrigin: 'center',
                  }}
                />
              ))}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
