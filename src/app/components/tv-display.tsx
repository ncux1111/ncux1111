import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import {
  Crown,
  Eye,
  Flame,
  Sparkles,
  Star,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { type Employee, type Team, type TvAudioTrack } from '../context/AppContext';
import type { TvRuntimeEvent } from '../utils/tvEvents';
import { formatMediaDuration } from '../utils/tvAudio';
import { Avatar } from './avatar';

interface TVDisplayProps {
  employees: Employee[];
  teams: Team[];
  mvpOfWeek?: Employee;
  prizePool: number;
  activeEvent?: TvRuntimeEvent | null;
  leaderPulseId?: string | null;
  currentTrack?: TvAudioTrack | null;
  currentTrackPosition?: number;
  currentTrackDuration?: number;
}

const EVENT_STYLES: Record<
  TvRuntimeEvent['type'],
  { icon: typeof Crown; bg: string; border: string; title: string }
> = {
  leaderChange: {
    icon: Crown,
    bg: 'from-amber-300/45 via-yellow-200/40 to-orange-400/45',
    border: 'border-amber-200/70',
    title: 'Смена лидера',
  },
  mvpChange: {
    icon: Star,
    bg: 'from-fuchsia-300/45 via-pink-300/40 to-rose-400/45',
    border: 'border-fuchsia-200/70',
    title: 'Новый MVP',
  },
  bigPoints: {
    icon: Zap,
    bg: 'from-cyan-300/45 via-sky-300/40 to-blue-400/45',
    border: 'border-cyan-200/70',
    title: 'Крупное начисление',
  },
  topEntry: {
    icon: TrendingUp,
    bg: 'from-emerald-300/45 via-teal-300/40 to-lime-300/45',
    border: 'border-emerald-200/70',
    title: 'Вход в топ',
  },
  bottomDrop: {
    icon: TrendingDown,
    bg: 'from-rose-300/45 via-red-300/40 to-orange-400/45',
    border: 'border-rose-200/70',
    title: 'Падение вниз',
  },
};

function toRgb(color: string) {
  const normalized = color.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    const value = normalized.slice(1);
    const r = Number.parseInt(value.slice(0, 2), 16);
    const g = Number.parseInt(value.slice(2, 4), 16);
    const b = Number.parseInt(value.slice(4, 6), 16);
    return { r, g, b };
  }

  if (/^#[0-9a-fA-F]{3}$/.test(normalized)) {
    const value = normalized.slice(1);
    const r = Number.parseInt(`${value[0]}${value[0]}`, 16);
    const g = Number.parseInt(`${value[1]}${value[1]}`, 16);
    const b = Number.parseInt(`${value[2]}${value[2]}`, 16);
    return { r, g, b };
  }

  return null;
}

function withAlpha(color: string, alpha: number) {
  const rgb = toRgb(color);
  if (!rgb) {
    return `rgba(99, 102, 241, ${alpha})`;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function getTeamHeaderStyle(color: string, isLeading: boolean) {
  return {
    background: `linear-gradient(140deg, ${withAlpha(color, 0.96)} 0%, ${withAlpha(color, 0.76)} 100%)`,
    borderColor: withAlpha(color, 0.95),
    boxShadow: isLeading
      ? `0 24px 44px ${withAlpha(color, 0.4)}`
      : `0 16px 32px ${withAlpha(color, 0.28)}`,
  } as const;
}

function getEmployeeCardStyle(color: string, highlight: boolean) {
  return {
    background:
      'linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)',
    borderColor: withAlpha(color, 0.45),
    boxShadow: highlight
      ? `0 18px 40px ${withAlpha(color, 0.34)}`
      : `0 14px 28px ${withAlpha(color, 0.24)}`,
  } as const;
}

function getTeamFrameStyle(color: string) {
  return {
    background: `linear-gradient(180deg, ${withAlpha(color, 0.18)} 0%, rgba(12, 15, 42, 0.44) 100%)`,
    borderColor: withAlpha(color, 0.4),
  } as const;
}

function getPointsPillStyle(color: string) {
  return {
    background: `linear-gradient(165deg, ${withAlpha(color, 0.2)} 0%, ${withAlpha(color, 0.08)} 100%)`,
    borderColor: withAlpha(color, 0.3),
  } as const;
}

function splitTrackMeta(trackName?: string | null) {
  const normalized = (trackName || '').trim();
  if (!normalized) {
    return { title: 'Трек не выбран', artist: 'Добавьте музыку в плейлист' };
  }

  const parts = normalized.split(' - ').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      artist: parts[0],
      title: parts.slice(1).join(' - '),
    };
  }

  return {
    title: normalized,
    artist: 'ZAN QDM Playlist',
  };
}

export function TVDisplay({
  employees,
  teams,
  mvpOfWeek,
  prizePool,
  activeEvent,
  leaderPulseId,
  currentTrack,
  currentTrackPosition = 0,
  currentTrackDuration = 0,
}: TVDisplayProps) {
  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => b.totalPoints - a.totalPoints),
    [employees]
  );

  const teamsById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team] as const));
  }, [teams]);

  const teamColumns = useMemo(() => {
    return teams.map((team) => {
      const members = employees
        .filter((employee) => employee.teamId === team.id)
        .sort((a, b) => b.totalPoints - a.totalPoints);

      return {
        team,
        members,
        total: members.reduce((sum, employee) => sum + employee.totalPoints, 0),
      };
    });
  }, [employees, teams]);

  const teamTotalsSorted = useMemo(() => {
    return [...teamColumns].sort((a, b) => b.total - a.total);
  }, [teamColumns]);

  const maxTeamMembers = useMemo(() => {
    return teamColumns.reduce((max, teamColumn) => Math.max(max, teamColumn.members.length), 0);
  }, [teamColumns]);

  const compactCards = maxTeamMembers >= 3;

  const employeeAvatarClass = useMemo(() => {
    if (maxTeamMembers >= 6) {
      return 'h-[clamp(3.4rem,4.9vh,5.8rem)] w-[clamp(3.4rem,4.9vh,5.8rem)]';
    }

    if (maxTeamMembers === 5) {
      return 'h-[clamp(3.8rem,5.55vh,6.4rem)] w-[clamp(3.8rem,5.55vh,6.4rem)]';
    }

    if (maxTeamMembers === 4) {
      return 'h-[clamp(4.2rem,6.2vh,7.2rem)] w-[clamp(4.2rem,6.2vh,7.2rem)]';
    }

    return 'h-[clamp(4.6rem,6.95vh,8.1rem)] w-[clamp(4.6rem,6.95vh,8.1rem)]';
  }, [maxTeamMembers]);

  const employeeAvatarTextClass = maxTeamMembers >= 5 ? 'text-2xl' : 'text-3xl';

  const actualMvp = useMemo(() => {
    if (mvpOfWeek) return mvpOfWeek;
    return [...employees].sort((a, b) => b.weeklyPoints - a.weeklyPoints)[0];
  }, [employees, mvpOfWeek]);

  if (employees.length === 0 || teams.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-3xl border border-white/20 bg-white/5 px-10 py-12 text-center backdrop-blur">
          <Trophy className="mx-auto mb-4 h-16 w-16 text-amber-300" />
          <h2 className="text-3xl font-bold">Нет данных для TV-экрана</h2>
          <p className="mt-2 text-slate-300">
            Добавьте команды и сотрудников, чтобы рейтинг отобразился в режиме табло.
          </p>
        </div>
      </div>
    );
  }

  const leadingTeam = teamTotalsSorted[0];
  const leadingEmployee = sortedEmployees[0];
  const lastEmployee = sortedEmployees[sortedEmployees.length - 1];
  const trackMeta = splitTrackMeta(currentTrack?.name);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#12052f] text-white">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(59,130,246,0.3),transparent_42%),radial-gradient(circle_at_84%_12%,rgba(217,70,239,0.28),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(99,102,241,0.3),transparent_55%)]"
      />

      <motion.div
        aria-hidden
        className="absolute -left-52 top-[-14rem] h-[42rem] w-[42rem] rounded-full bg-blue-500/28 blur-[120px]"
        animate={{ x: [0, 20, -12, 0], y: [0, 10, -8, 0] }}
        transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute -right-44 top-[-12rem] h-[44rem] w-[44rem] rounded-full bg-fuchsia-500/28 blur-[120px]"
        animate={{ x: [0, -24, 8, 0], y: [0, -8, 12, 0] }}
        transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-[-22rem] left-1/2 h-[48rem] w-[48rem] -translate-x-1/2 rounded-full bg-purple-500/24 blur-[140px]"
        animate={{ scale: [1, 1.06, 1], opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[2600px] flex-col px-3 py-1.5 2xl:px-7">
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-[28px] border border-white/20 bg-gradient-to-r from-[#17154a]/95 via-[#35156b]/95 to-[#4d1179]/95 px-5 py-2.5 shadow-[0_24px_48px_rgba(6,8,30,0.44)]"
        >
          <div className="grid items-center gap-1.5 md:grid-cols-[auto_1fr_auto]">
            <div className="hidden items-center justify-center md:flex">
              <span className="text-3xl">🏆</span>
            </div>

            <div className="text-center">
              <h1 className="font-display text-[clamp(1.95rem,3.9vw,4.3rem)] font-black uppercase leading-[1] tracking-[0.02em] text-white">
                ТАБЛИЦА ЛИДЕРОВ
              </h1>
              <p className="mt-0.5 text-[clamp(0.9rem,1.04vw,1.22rem)] text-white/80">Юридическая компания ZAN QDM</p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center justify-center lg:flex">
                <span className="text-3xl">🏆</span>
              </div>
              <div className="rounded-xl border border-emerald-200/35 bg-black/35 px-2.5 py-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Live
                </span>
              </div>
            </div>
          </div>
        </motion.header>

        <div className="mt-1 h-[2.5px] rounded-full bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400" />

        <div className="mt-1.5 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto_auto] gap-2">
          <div className="grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-2">
            {teamColumns.map((teamColumn, index) => {
              const isLeadingTeam = leadingTeam?.team.id === teamColumn.team.id;
              const teamHeaderStyle = getTeamHeaderStyle(teamColumn.team.color, isLeadingTeam);
              const teamFrameStyle = getTeamFrameStyle(teamColumn.team.color);
              const visibleRows = Math.max(1, teamColumn.members.length);

              return (
                <motion.section
                  key={teamColumn.team.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                  className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border bg-black/30 p-2 shadow-[0_18px_36px_rgba(4,8,24,0.42)] backdrop-blur-md"
                  style={teamFrameStyle}
                >
                  <div className="rounded-[22px] border px-3 py-2.5" style={teamHeaderStyle}>
                    <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="min-w-0">
                        <h2 className="truncate font-display text-[clamp(1.55rem,2.15vw,2.6rem)] font-black text-white">
                          {teamColumn.team.name}
                        </h2>
                        <p className="mt-1 text-[clamp(0.82rem,0.96vw,1.08rem)] font-semibold text-white/90">
                          Сумма очков команды
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/18 px-2 py-0.5 text-[0.72rem] font-semibold uppercase tracking-wide text-white">
                            <Users className="h-3.5 w-3.5" />
                            {teamColumn.members.length}
                          </div>
                          {isLeadingTeam && (
                            <div className="inline-flex items-center gap-1 rounded-full border border-amber-100/75 bg-amber-300/25 px-2 py-0.5 text-[0.72rem] font-bold uppercase tracking-wide text-amber-100">
                              <Crown className="h-3 w-3" />
                              Лидирует
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 rounded-2xl border border-white/35 bg-white/16 px-4 py-2 text-right shadow-[0_10px_22px_rgba(10,14,34,0.28)]">
                        <p className="score-number text-[clamp(2.35rem,3.35vw,4.3rem)] font-black leading-none text-white">
                          {teamColumn.total}
                        </p>
                        <p className="mt-0.5 text-[clamp(0.72rem,0.84vw,0.96rem)] font-semibold uppercase tracking-[0.08em] text-white/88">
                          Всего баллов
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-1.5 min-h-0 flex-1 overflow-hidden pr-0.5">
                    {teamColumn.members.length > 0 ? (
                      <div
                        className="grid h-full min-h-0 gap-1"
                        style={{ gridTemplateRows: `repeat(${visibleRows}, minmax(0, 1fr))` }}
                      >
                        {teamColumn.members.map((employee, employeeIndex) => {
                          const teamPlace = employeeIndex + 1;
                          const isOverallLeader = leadingEmployee.id === employee.id;
                          const isLeaderPulseActive = leaderPulseId === employee.id;

                          return (
                            <motion.article
                              key={employee.id}
                              layout="position"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ type: 'spring', damping: 24, stiffness: 250 }}
                              className={`relative flex h-full min-h-0 items-center rounded-[20px] border ${
                                compactCards ? 'px-3 py-0.5' : 'px-3.5 py-1'
                              } text-slate-900 ${isOverallLeader ? 'ring-2 ring-amber-300/85' : ''}`}
                              style={getEmployeeCardStyle(teamColumn.team.color, isOverallLeader)}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                                <motion.div
                                  className={`flex items-center justify-center rounded-full border border-white/85 bg-slate-700 font-black text-white shadow-sm ${
                                    compactCards ? 'h-9 w-9 text-[0.92rem]' : 'h-10 w-10 text-[0.98rem]'
                                  }`}
                                  animate={isLeaderPulseActive ? { scale: [1, 1.16, 1] } : { scale: 1 }}
                                  transition={{ duration: 0.62 }}
                                  title={`Место в команде: ${teamPlace}`}
                                >
                                  {teamPlace}
                                </motion.div>

                                <Avatar
                                  avatar={employee.avatar}
                                  name={employee.name}
                                  className={`${employeeAvatarClass} rounded-xl border border-white/90 bg-slate-100 shadow-[0_10px_20px_rgba(15,23,42,0.24)] ring-1 ring-slate-100/80`}
                                  textClassName={employeeAvatarTextClass}
                                />

                                <p className="min-w-0 flex-1 truncate whitespace-nowrap text-[clamp(22px,2.45vh,36px)] font-bold leading-none text-slate-900">
                                  {employee.name}
                                </p>
                              </div>

                              <div
                                className={`${compactCards ? 'min-w-[6.5rem] px-3 py-0.5' : 'min-w-[7.4rem] px-3.5 py-0.5'} ml-3 shrink-0 rounded-xl border text-right`}
                                style={getPointsPillStyle(teamColumn.team.color)}
                              >
                                <p
                                  className="score-number whitespace-nowrap text-[clamp(30px,3.55vh,50px)] font-black leading-none"
                                  style={{ color: teamColumn.team.color }}
                                >
                                  {employee.totalPoints}
                                </p>
                              </div>
                            </motion.article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/20 bg-black/20 px-4 py-5 text-center text-white/85">
                        В этой команде пока нет сотрудников. Добавьте участников, чтобы заполнить таблицу.
                      </div>
                    )}
                  </div>
                </motion.section>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.12 }}
              className="rounded-[26px] border border-amber-200/70 bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-400 p-2.5 text-[#442106] shadow-[0_16px_35px_rgba(255,190,45,0.3)]"
            >
              <div className="grid items-center gap-2.5 md:grid-cols-[auto_1fr_auto]">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-200 bg-white/90 shadow-md">
                  <Trophy className="h-7 w-7" />
                </div>

                {actualMvp ? (
                  <div className="min-w-0">
                    <p className="text-[clamp(0.86rem,0.95vw,1.15rem)] font-black uppercase tracking-wide">
                      MVP НЕДЕЛИ
                    </p>
                    <div className="mt-1 flex min-w-0 items-center gap-2">
                      <Avatar
                        avatar={actualMvp.avatar}
                        name={actualMvp.name}
                        className="h-11 w-11 rounded-xl border border-amber-200 bg-white/70"
                        textClassName="text-base"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[clamp(1.2rem,1.72vw,2rem)] font-black leading-none">
                          {actualMvp.name}
                        </p>
                        <p className="truncate text-[clamp(0.8rem,0.92vw,1.02rem)] font-medium">
                          {teamsById.get(actualMvp.teamId)?.name || 'Команда не указана'}
                        </p>
                        <p className="mt-0.5 text-[0.66rem] font-semibold uppercase tracking-wide text-amber-900/80">
                          Главный герой недели
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-black">MVP НЕДЕЛИ</p>
                    <p className="mt-2 text-lg">Пока нет данных для определения MVP.</p>
                  </div>
                )}

                <div className="rounded-xl border border-amber-100/75 bg-white/30 px-2.5 py-1.5 text-right">
                  <p className="score-number text-[clamp(1.62rem,2.65vw,3.25rem)] font-black leading-none">
                    {actualMvp?.weeklyPoints ?? 0}
                  </p>
                  <p className="text-[clamp(0.68rem,0.8vw,0.92rem)] font-semibold">за неделю</p>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.16 }}
              className="rounded-[26px] border border-emerald-200/70 bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 p-2.5 text-white shadow-[0_16px_35px_rgba(16,185,129,0.32)]"
            >
              <div className="grid items-center gap-2.5 md:grid-cols-[auto_1fr_auto]">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-white/88 text-emerald-600 shadow-sm">
                  <Wallet className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-[clamp(0.86rem,0.95vw,1.15rem)] font-black uppercase tracking-wide">
                    ПРИЗОВОЙ ФОНД
                  </p>
                  <p className="score-number mt-1 text-[clamp(1.95rem,2.9vw,3.6rem)] font-black leading-none">
                    {prizePool.toLocaleString('ru-RU')} ₸
                  </p>
                  <p className="mt-0.5 text-[clamp(0.72rem,0.85vw,0.96rem)] text-emerald-100">
                    Лидирует: <span className="font-bold text-white">{leadingTeam?.team.name || 'Скоро обновится'}</span>
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-100/65 bg-white/18 px-2.5 py-1.5 text-right">
                  <p className="text-[0.6rem] uppercase tracking-[0.16em] text-emerald-100/95">Статус выплат</p>
                  <p className="mt-0.5 text-[0.78rem] font-black text-white">LIVE PAYOUT</p>
                </div>
              </div>
            </motion.section>
          </div>

          <motion.footer
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.2 }}
            className="relative grid items-center gap-2 overflow-hidden rounded-2xl border border-rose-200/25 bg-gradient-to-r from-[#09040f]/95 via-[#15091e]/95 to-[#06030d]/95 px-3 py-1.5 shadow-[0_18px_34px_rgba(2,0,10,0.55)] backdrop-blur lg:grid-cols-[auto_1fr_auto_auto]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(239,68,68,0.36),transparent_45%),radial-gradient(circle_at_15%_18%,rgba(251,113,133,0.18),transparent_36%),radial-gradient(circle_at_85%_22%,rgba(192,132,252,0.16),transparent_30%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-black/80 via-rose-900/35 to-transparent"
            />
            <div aria-hidden className="pointer-events-none absolute bottom-0 left-3 z-0 flex items-end gap-1.5">
              {[0, 0.22, 0.38, 0.54].map((delay, index) => (
                <motion.span
                  key={`abyss-tentacle-${delay}`}
                  className={`block rounded-t-full bg-gradient-to-t from-rose-900/95 via-rose-500/65 to-rose-200/80 ${
                    index % 2 === 0 ? 'w-2.5' : 'w-2'
                  }`}
                  style={{ height: `${20 + index * 7}px` }}
                  animate={{ y: [8, -5, 8], rotate: [-4, 5, -4], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2.8, delay, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}
              <motion.span
                className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-400/65 text-[0.95rem]"
                animate={{ y: [4, -4, 4], rotate: [0, 7, -7, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                👁
              </motion.span>
            </div>

            <div className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-rose-200/45 bg-rose-300/20 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-rose-100">
              <Eye className="h-3.5 w-3.5" />
              Пропасть рейтинга
            </div>

            <p className="relative z-10 text-[0.76rem] font-medium text-slate-100/95">
              Внизу уже шевелится бездна и мемный наблюдатель. Последнее место сейчас у{' '}
              <span className="font-black text-rose-200">{lastEmployee.name}</span>. Не расслабляйтесь: один неудачный шаг,
              и вы на краю пропасти таблицы.
            </p>

            <div className="relative z-10 rounded-xl border border-cyan-200/35 bg-cyan-300/10 px-2.5 py-1.5 text-right">
              <p className="text-[0.62rem] uppercase tracking-[0.16em] text-cyan-100/85">Сейчас играет</p>
              <p className="max-w-[12rem] truncate text-[0.95rem] font-black leading-none text-white">{trackMeta.title}</p>
              <p className="mt-1 truncate text-[0.68rem] font-medium text-cyan-100/90">{trackMeta.artist}</p>
              <p className="mt-1 text-[0.68rem] font-semibold text-cyan-50/90">
                {formatMediaDuration(currentTrackPosition)} / {formatMediaDuration(currentTrackDuration)}
              </p>
            </div>

            <div className="relative z-10 rounded-xl border border-rose-200/35 bg-rose-300/10 px-2.5 py-1.5 text-right">
              <p className="text-[0.62rem] uppercase tracking-[0.16em] text-rose-100/85">Край бездны</p>
              <p className="score-number text-[clamp(1.2rem,1.45vw,1.6rem)] font-black leading-none text-rose-100">
                {lastEmployee.totalPoints}
              </p>
              <p className="max-w-[11rem] truncate text-[0.68rem] font-medium text-slate-100">{lastEmployee.name}</p>
            </div>
          </motion.footer>
        </div>
      </div>

      <AnimatePresence>
        {activeEvent && (
          <motion.div
            key={activeEvent.id}
            initial={{ opacity: 0, y: 28, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.98 }}
            className="pointer-events-none absolute left-1/2 top-5 z-30 w-[min(74rem,92vw)] -translate-x-1/2"
          >
            <div
              className={`rounded-2xl border bg-gradient-to-r p-4 shadow-2xl backdrop-blur ${
                EVENT_STYLES[activeEvent.type].bg
              } ${EVENT_STYLES[activeEvent.type].border}`}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-white/35 bg-white/20 p-2">
                  {(() => {
                    const Icon = EVENT_STYLES[activeEvent.type].icon;
                    return <Icon className="h-6 w-6 text-white" />;
                  })()}
                </div>

                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/80">
                    {EVENT_STYLES[activeEvent.type].title}
                  </p>
                  <p className="truncate text-2xl font-black text-white">{activeEvent.subtitle}</p>
                </div>

                <div className="ml-auto rounded-lg bg-white/20 px-3 py-1 text-sm font-semibold text-white/95">
                  <span className="inline-flex items-center gap-1">
                    <Flame className="h-4 w-4" />
                    ШОУ-РЕЖИМ
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

