import type { Employee } from '../context/AppContext';
import type { TvEventSoundType } from '../context/AppContext';

export interface RatingSnapshot {
  ranking: string[];
  totalById: Record<string, number>;
  weeklyById: Record<string, number>;
  leaderId: string | null;
  mvpId: string | null;
}

export interface TvRuntimeEvent {
  id: string;
  type: TvEventSoundType;
  title: string;
  subtitle: string;
  employeeId?: string;
  pointsDelta?: number;
  timestamp: number;
}

const LARGE_POINTS_THRESHOLD = 8;

function createEventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sortByTotal(a: Employee, b: Employee) {
  if (a.totalPoints !== b.totalPoints) {
    return b.totalPoints - a.totalPoints;
  }

  if (a.weeklyPoints !== b.weeklyPoints) {
    return b.weeklyPoints - a.weeklyPoints;
  }

  return a.id.localeCompare(b.id);
}

function sortByWeekly(a: Employee, b: Employee) {
  if (a.weeklyPoints !== b.weeklyPoints) {
    return b.weeklyPoints - a.weeklyPoints;
  }

  if (a.totalPoints !== b.totalPoints) {
    return b.totalPoints - a.totalPoints;
  }

  return a.id.localeCompare(b.id);
}

export function createRatingSnapshot(employees: Employee[]): RatingSnapshot {
  const sortedByTotal = [...employees].sort(sortByTotal);
  const sortedByWeekly = [...employees].sort(sortByWeekly);

  const totalById: Record<string, number> = {};
  const weeklyById: Record<string, number> = {};

  employees.forEach((employee) => {
    totalById[employee.id] = employee.totalPoints;
    weeklyById[employee.id] = employee.weeklyPoints;
  });

  return {
    ranking: sortedByTotal.map((employee) => employee.id),
    totalById,
    weeklyById,
    leaderId: sortedByTotal[0]?.id || null,
    mvpId: sortedByWeekly[0]?.id || null,
  };
}

function getEmployee(employeesById: Map<string, Employee>, employeeId: string | null) {
  if (!employeeId) return null;
  return employeesById.get(employeeId) || null;
}

function getPositionMap(ranking: string[]) {
  const map = new Map<string, number>();
  ranking.forEach((employeeId, index) => {
    map.set(employeeId, index + 1);
  });
  return map;
}

export function detectRatingEvents(
  previousSnapshot: RatingSnapshot,
  nextSnapshot: RatingSnapshot,
  employees: Employee[]
): TvRuntimeEvent[] {
  if (employees.length === 0 || previousSnapshot.ranking.length === 0) {
    return [];
  }

  const events: TvRuntimeEvent[] = [];
  const employeesById = new Map(employees.map((employee) => [employee.id, employee] as const));

  if (
    previousSnapshot.leaderId &&
    nextSnapshot.leaderId &&
    previousSnapshot.leaderId !== nextSnapshot.leaderId
  ) {
    const newLeader = getEmployee(employeesById, nextSnapshot.leaderId);
    if (newLeader) {
      events.push({
        id: createEventId(),
        type: 'leaderChange',
        title: 'Новый лидер рейтинга',
        subtitle: `${newLeader.name} выходит на 1 место`,
        employeeId: newLeader.id,
        timestamp: Date.now(),
      });
    }
  }

  if (previousSnapshot.mvpId && nextSnapshot.mvpId && previousSnapshot.mvpId !== nextSnapshot.mvpId) {
    const newMvp = getEmployee(employeesById, nextSnapshot.mvpId);
    if (newMvp) {
      events.push({
        id: createEventId(),
        type: 'mvpChange',
        title: 'Смена MVP недели',
        subtitle: `${newMvp.name} забирает титул MVP`,
        employeeId: newMvp.id,
        timestamp: Date.now(),
      });
    }
  }

  let bestDelta: { employee: Employee; delta: number } | null = null;
  employees.forEach((employee) => {
    const previousTotal = previousSnapshot.totalById[employee.id] ?? employee.totalPoints;
    const delta = employee.totalPoints - previousTotal;

    if (delta >= LARGE_POINTS_THRESHOLD && (!bestDelta || delta > bestDelta.delta)) {
      bestDelta = { employee, delta };
    }
  });

  if (bestDelta) {
    events.push({
      id: createEventId(),
      type: 'bigPoints',
      title: 'Крупное начисление баллов',
      subtitle: `${bestDelta.employee.name} получает ${bestDelta.delta} баллов`,
      employeeId: bestDelta.employee.id,
      pointsDelta: bestDelta.delta,
      timestamp: Date.now(),
    });
  }

  const previousPositions = getPositionMap(previousSnapshot.ranking);
  const nextPositions = getPositionMap(nextSnapshot.ranking);

  let topEntryCandidate: { employee: Employee; jump: number; to: number } | null = null;

  employees.forEach((employee) => {
    const previousPosition = previousPositions.get(employee.id);
    const nextPosition = nextPositions.get(employee.id);

    if (!previousPosition || !nextPosition) return;

    if (previousPosition > 3 && nextPosition <= 3) {
      const jump = previousPosition - nextPosition;
      if (!topEntryCandidate || jump > topEntryCandidate.jump) {
        topEntryCandidate = { employee, jump, to: nextPosition };
      }
    }
  });

  if (topEntryCandidate) {
    events.push({
      id: createEventId(),
      type: 'topEntry',
      title: 'Новый участник топ-3',
      subtitle: `${topEntryCandidate.employee.name} поднимается на ${topEntryCandidate.to} место`,
      employeeId: topEntryCandidate.employee.id,
      timestamp: Date.now(),
    });
  }

  const lastPlace = nextSnapshot.ranking[nextSnapshot.ranking.length - 1];
  const previousLastPlace = previousSnapshot.ranking[previousSnapshot.ranking.length - 1];

  if (lastPlace && previousLastPlace && lastPlace !== previousLastPlace) {
    const droppedEmployee = getEmployee(employeesById, lastPlace);
    if (droppedEmployee) {
      events.push({
        id: createEventId(),
        type: 'bottomDrop',
        title: 'Смена последнего места',
        subtitle: `${droppedEmployee.name} теперь замыкает рейтинг`,
        employeeId: droppedEmployee.id,
        timestamp: Date.now(),
      });
    }
  }

  return events;
}