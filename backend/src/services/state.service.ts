import type { Prisma } from '@prisma/client';
import { PasswordAlgorithm, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma.js';

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRecordList(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<Record<string, unknown>>;
  }

  return value.filter(isRecord);
}

const EMPTY_TEMPLATE_STATE = {
  templates: [],
  templateAccess: {},
  templateUsageLog: [],
};

const EMPTY_OPERATIONS_STATE = {
  userMeta: {},
  siteLeads: [],
  visitorEvents: [],
  activityLog: [],
  documentReviews: [],
  notes: [],
};

const DEFAULT_APP_STATE = {
  prizePool: 50000,
  soundEnabled: true,
  services: [],
  pointsHistory: [],
  visibilitySettings: {
    showSalaries: false,
    showSalarySection: false,
    showServices: false,
    showPrizePool: true,
    showOtherEmployeesPoints: true,
    showMVP: true,
    showTeamRanking: true,
  },
  tvAudioSettings: {
    musicEnabled: true,
    eventSoundsEnabled: true,
    backgroundVolume: 0.38,
    eventVolume: 0.75,
    activeTrackId: null,
    playlistTrackIds: [],
    eventSoundMap: {},
    tracks: [],
  },
  tvMemeSettings: {
    enabled: true,
    memeSoundEnabled: true,
    autoPlayEnabled: false,
    autoPlayRandom: true,
    autoPlayMinPoints: 10,
    memeVolume: 0.8,
    selectedClipId: null,
    selectedAudioTrackId: null,
    clips: [],
  },
};

const DEFAULT_WEBSITE_CONTENT = {
  company: {
    name: 'ZAN QDM',
    shortName: 'ZAN QDM',
    tagline: '\u042e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044f \u0434\u043b\u044f \u0431\u0438\u0437\u043d\u0435\u0441\u0430 \u0438 \u0447\u0430\u0441\u0442\u043d\u044b\u0445 \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432',
    aboutTitle: '\u042e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u0437\u0430\u0449\u0438\u0442\u0430, \u0441\u043e\u043f\u0440\u043e\u0432\u043e\u0436\u0434\u0435\u043d\u0438\u0435 \u0438 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442',
    aboutText: 'ZAN QDM \u0441\u043e\u043f\u0440\u043e\u0432\u043e\u0436\u0434\u0430\u0435\u0442 \u043a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u044b\u0435 \u0441\u0434\u0435\u043b\u043a\u0438, \u0441\u0443\u0434\u0435\u0431\u043d\u044b\u0435 \u0441\u043f\u043e\u0440\u044b \u0438 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u043d\u044b\u0435 \u043f\u0440\u043e\u0435\u043a\u0442\u044b.',
    aboutHighlights: [],
  },
  hero: {
    eyebrow: '\u042e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044f \u041a\u0430\u0437\u0430\u0445\u0441\u0442\u0430\u043d\u0430',
    title: '\u0417\u0430\u0449\u0438\u0449\u0430\u0435\u043c \u0438\u043d\u0442\u0435\u0440\u0435\u0441\u044b \u0431\u0438\u0437\u043d\u0435\u0441\u0430',
    accent: '\u0442\u043e\u0447\u043d\u043e \u0438 \u0441\u0438\u0441\u0442\u0435\u043c\u043d\u043e',
    description: '\u0421\u043e\u0432\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0439 legal-tech \u0441\u0435\u0440\u0432\u0438\u0441 \u0434\u043b\u044f \u043a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u044b\u0445 \u0438 \u0447\u0430\u0441\u0442\u043d\u044b\u0445 \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432.',
    primaryLabel: '\u041f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u043a\u043e\u043d\u0441\u0443\u043b\u044c\u0442\u0430\u0446\u0438\u044e',
    primaryHref: '/contacts',
    secondaryLabel: '\u041d\u0430\u0448\u0438 \u0443\u0441\u043b\u0443\u0433\u0438',
    secondaryHref: '/services',
  },
  stats: [],
  services: [],
  team: [],
  contacts: {
    phone: '+7 (700) 000-00-00',
    whatsapp: '+7 (700) 000-00-00',
    whatsappLink: 'https://wa.me/77000000000',
    telegramLink: 'https://t.me/zanqdm',
    email: 'info@zanqdm.kz',
    address: '\u0410\u043b\u043c\u0430\u0442\u044b',
    city: '\u0410\u043b\u043c\u0430\u0442\u044b',
    latitude: '43.238949',
    longitude: '76.889709',
    officeHours: '\u041f\u043d-\u041f\u0442 09:00-19:00',
    whatsappQrImage: null,
    telegramQrImage: null,
    qrDisplayMode: 'both',
  },
};

export async function ensureStateRows() {
  await prisma.appState.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      prizePool: DEFAULT_APP_STATE.prizePool,
      soundEnabled: DEFAULT_APP_STATE.soundEnabled,
      services: toJson(DEFAULT_APP_STATE.services),
      pointsHistory: toJson(DEFAULT_APP_STATE.pointsHistory),
      visibilitySettings: toJson(DEFAULT_APP_STATE.visibilitySettings),
      tvAudioSettings: toJson(DEFAULT_APP_STATE.tvAudioSettings),
      tvMemeSettings: toJson(DEFAULT_APP_STATE.tvMemeSettings),
    },
  });

  await prisma.templateState.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      templates: toJson(EMPTY_TEMPLATE_STATE.templates),
      templateAccess: toJson(EMPTY_TEMPLATE_STATE.templateAccess),
      templateUsageLog: toJson(EMPTY_TEMPLATE_STATE.templateUsageLog),
    },
  });

  await prisma.operationsState.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      userMeta: toJson(EMPTY_OPERATIONS_STATE.userMeta),
      siteLeads: toJson(EMPTY_OPERATIONS_STATE.siteLeads),
      visitorEvents: toJson(EMPTY_OPERATIONS_STATE.visitorEvents),
      activityLog: toJson(EMPTY_OPERATIONS_STATE.activityLog),
      documentReviews: toJson(EMPTY_OPERATIONS_STATE.documentReviews),
      notes: toJson(EMPTY_OPERATIONS_STATE.notes),
    },
  });

  await prisma.websiteContentState.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main', payload: toJson(DEFAULT_WEBSITE_CONTENT) },
  });
}

function mapAdmin(user: { id: string; name: string; login: string; isSuperAdmin: boolean }) {
  return {
    id: user.id,
    name: user.name,
    login: user.login,
    isSuperAdmin: user.isSuperAdmin,
  };
}

function mapEmployee(user: {
  id: string;
  name: string;
  login: string;
  position: string | null;
  teamId: string | null;
  totalPoints: number;
  weeklyPoints: number;
  avatar: string | null;
  salary: number | null;
}) {
  return {
    id: user.id,
    name: user.name,
    position: user.position || '',
    teamId: user.teamId || '',
    totalPoints: user.totalPoints,
    weeklyPoints: user.weeklyPoints,
    avatar: user.avatar || undefined,
    salary: typeof user.salary === 'number' ? user.salary : undefined,
    login: user.login,
  };
}

export async function getBootstrapState(currentUser: { userId: string; role: UserRole }) {
  await ensureStateRows();

  const [users, teams, appState, templateState, operationsState, websiteState, user] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ role: 'asc' }, { name: 'asc' }] }),
    prisma.team.findMany({ orderBy: { name: 'asc' } }),
    prisma.appState.findUnique({ where: { id: 'main' } }),
    prisma.templateState.findUnique({ where: { id: 'main' } }),
    prisma.operationsState.findUnique({ where: { id: 'main' } }),
    prisma.websiteContentState.findUnique({ where: { id: 'main' } }),
    prisma.user.findUniqueOrThrow({ where: { id: currentUser.userId } }),
  ]);

  const employees = users.filter((item) => item.role === UserRole.EMPLOYEE).map(mapEmployee);
  const admins = currentUser.role === UserRole.ADMIN
    ? users.filter((item) => item.role === UserRole.ADMIN).map(mapAdmin)
    : [];

  const templatesRaw = templateState
    ? {
        templates: templateState.templates,
        templateAccess: templateState.templateAccess,
        templateUsageLog: templateState.templateUsageLog,
      }
    : EMPTY_TEMPLATE_STATE;

  const operationsRaw = operationsState
    ? {
        userMeta: operationsState.userMeta,
        siteLeads: operationsState.siteLeads,
        visitorEvents: operationsState.visitorEvents,
        activityLog: operationsState.activityLog,
        documentReviews: operationsState.documentReviews,
        notes: operationsState.notes,
      }
    : EMPTY_OPERATIONS_STATE;

  const filteredTemplates = currentUser.role === UserRole.ADMIN
    ? templatesRaw
    : {
        templates: Array.isArray(templatesRaw.templates) ? templatesRaw.templates : [],
        templateAccess: typeof templatesRaw.templateAccess === 'object' && templatesRaw.templateAccess ? {
          [currentUser.userId]: (templatesRaw.templateAccess as Record<string, unknown>)[currentUser.userId] ?? [],
        } : { [currentUser.userId]: [] },
        templateUsageLog: toRecordList(templatesRaw.templateUsageLog).filter((entry) => entry.employeeId === currentUser.userId),
      };

  const filteredOperations = currentUser.role === UserRole.ADMIN
    ? operationsRaw
    : {
        userMeta: typeof operationsRaw.userMeta === 'object' && operationsRaw.userMeta
          ? Object.fromEntries(Object.entries(operationsRaw.userMeta as Record<string, unknown>).filter(([key]) => key.endsWith(`:${currentUser.userId}`)))
          : {},
        siteLeads: [],
        visitorEvents: [],
        activityLog: toRecordList(operationsRaw.activityLog).filter((entry) => entry.userId === currentUser.userId),
        documentReviews: toRecordList(operationsRaw.documentReviews).filter((entry) => entry.employeeId === currentUser.userId),
        notes: toRecordList(operationsRaw.notes).filter((note) => !note.ownerId || note.ownerId === currentUser.userId),
      };

  return {
    currentUser: {
      id: user.id,
      name: user.name,
      role: user.role === UserRole.ADMIN ? 'admin' : 'employee',
      login: user.login,
      mustChangePassword: user.mustChangePassword,
    },
    directory: {
      employees,
      admins,
      teams,
    },
    app: appState
      ? {
          prizePool: appState.prizePool,
          soundEnabled: appState.soundEnabled,
          services: appState.services,
          pointsHistory: appState.pointsHistory,
          visibilitySettings: appState.visibilitySettings,
          tvAudioSettings: appState.tvAudioSettings,
          tvMemeSettings: appState.tvMemeSettings,
        }
      : DEFAULT_APP_STATE,
    websiteContent: (websiteState?.payload as Record<string, unknown> | null) ?? DEFAULT_WEBSITE_CONTENT,
    templates: filteredTemplates,
    operations: filteredOperations,
  };
}

export async function getPublicWebsiteContent() {
  await ensureStateRows();
  const state = await prisma.websiteContentState.findUnique({ where: { id: 'main' } });
  return (state?.payload as Record<string, unknown> | null) ?? DEFAULT_WEBSITE_CONTENT;
}

export async function saveDirectoryState(payload: unknown, actor: { userId: string; role: UserRole }) {
  const source = typeof payload === 'object' && payload ? (payload as Record<string, unknown>) : {};
  const teams = Array.isArray(source.teams) ? source.teams : [];
  const employees = Array.isArray(source.employees) ? source.employees : [];
  const admins = Array.isArray(source.admins) ? source.admins : [];

  if (actor.role === UserRole.ADMIN) {
    await prisma.$transaction(async (tx) => {
      for (const team of teams as Array<Record<string, unknown>>) {
        if (!team?.id || !team?.name || !team?.color) continue;
        await tx.team.upsert({
          where: { id: String(team.id) },
          update: { name: String(team.name), color: String(team.color) },
          create: { id: String(team.id), name: String(team.name), color: String(team.color) },
        });
      }

      for (const employee of employees as Array<Record<string, unknown>>) {
        if (!employee?.id || !employee?.login || !employee?.name) continue;
        const existing = await tx.user.findUnique({ where: { id: String(employee.id) } });
        await tx.user.upsert({
          where: { id: String(employee.id) },
          update: {
            name: String(employee.name),
            login: String(employee.login),
            position: employee.position ? String(employee.position) : null,
            teamId: employee.teamId ? String(employee.teamId) : null,
            totalPoints: Number(employee.totalPoints) || 0,
            weeklyPoints: Number(employee.weeklyPoints) || 0,
            avatar: employee.avatar ? String(employee.avatar) : null,
            salary: typeof employee.salary === 'number' ? employee.salary : null,
            role: UserRole.EMPLOYEE,
            passwordHash: employee.passwordHash ? String(employee.passwordHash) : existing?.passwordHash || '',
            passwordSalt: employee.passwordSalt ? String(employee.passwordSalt) : existing?.passwordSalt || null,
            passwordAlgorithm: employee.passwordHash
              ? PasswordAlgorithm.ZANQDM_SHA256_V1
              : existing?.passwordAlgorithm || PasswordAlgorithm.PLAINTEXT_LEGACY,
          },
          create: {
            id: String(employee.id),
            name: String(employee.name),
            login: String(employee.login),
            role: UserRole.EMPLOYEE,
            passwordHash: existing?.passwordHash || '',
            passwordSalt: existing?.passwordSalt || null,
            passwordAlgorithm: existing?.passwordAlgorithm || PasswordAlgorithm.PLAINTEXT_LEGACY,
            position: employee.position ? String(employee.position) : null,
            teamId: employee.teamId ? String(employee.teamId) : null,
            totalPoints: Number(employee.totalPoints) || 0,
            weeklyPoints: Number(employee.weeklyPoints) || 0,
            avatar: employee.avatar ? String(employee.avatar) : null,
            salary: typeof employee.salary === 'number' ? employee.salary : null,
          },
        });
      }

      for (const admin of admins as Array<Record<string, unknown>>) {
        if (!admin?.id || !admin?.login || !admin?.name) continue;
        const existing = await tx.user.findUnique({ where: { id: String(admin.id) } });
        await tx.user.upsert({
          where: { id: String(admin.id) },
          update: {
            name: String(admin.name),
            login: String(admin.login),
            role: UserRole.ADMIN,
            isSuperAdmin: Boolean(admin.isSuperAdmin),
            passwordHash: admin.passwordHash ? String(admin.passwordHash) : existing?.passwordHash || '',
            passwordSalt: admin.passwordSalt ? String(admin.passwordSalt) : existing?.passwordSalt || null,
            passwordAlgorithm: admin.passwordHash
              ? PasswordAlgorithm.ZANQDM_SHA256_V1
              : existing?.passwordAlgorithm || PasswordAlgorithm.PLAINTEXT_LEGACY,
          },
          create: {
            id: String(admin.id),
            name: String(admin.name),
            login: String(admin.login),
            role: UserRole.ADMIN,
            isSuperAdmin: Boolean(admin.isSuperAdmin),
            passwordHash: existing?.passwordHash || '',
            passwordSalt: existing?.passwordSalt || null,
            passwordAlgorithm: existing?.passwordAlgorithm || PasswordAlgorithm.PLAINTEXT_LEGACY,
          },
        });
      }
    });
    return;
  }

  const self = (employees as Array<Record<string, unknown>>).find((item) => item?.id === actor.userId);
  if (!self) return;

  await prisma.user.update({
    where: { id: actor.userId },
    data: {
      name: self.name ? String(self.name) : undefined,
      avatar: self.avatar ? String(self.avatar) : null,
      login: self.login ? String(self.login) : undefined,
      passwordHash: self.passwordHash ? String(self.passwordHash) : undefined,
      passwordSalt: self.passwordSalt ? String(self.passwordSalt) : undefined,
      passwordAlgorithm: self.passwordHash ? PasswordAlgorithm.ZANQDM_SHA256_V1 : undefined,
    },
  });
}

export async function saveAppState(payload: unknown) {
  await ensureStateRows();
  const source = typeof payload === 'object' && payload ? (payload as Record<string, unknown>) : {};
  await prisma.appState.update({
    where: { id: 'main' },
    data: {
      prizePool: Number(source.prizePool) || 0,
      soundEnabled: Boolean(source.soundEnabled),
      services: toJson(source.services ?? []),
      pointsHistory: toJson(source.pointsHistory ?? []),
      visibilitySettings: toJson(source.visibilitySettings ?? {}),
      tvAudioSettings: toJson(source.tvAudioSettings ?? {}),
      tvMemeSettings: toJson(source.tvMemeSettings ?? {}),
    },
  });
}

export async function saveWebsiteState(payload: unknown) {
  await ensureStateRows();
  await prisma.websiteContentState.update({
    where: { id: 'main' },
    data: { payload: toJson(payload ?? DEFAULT_WEBSITE_CONTENT) },
  });
}

export async function saveTemplateState(payload: unknown, actor: { userId: string; role: UserRole }) {
  await ensureStateRows();
  const source = typeof payload === 'object' && payload ? (payload as Record<string, unknown>) : {};
  const current = await prisma.templateState.findUniqueOrThrow({ where: { id: 'main' } });

  if (actor.role === UserRole.ADMIN) {
    await prisma.templateState.update({
      where: { id: 'main' },
      data: {
        templates: toJson(source.templates ?? []),
        templateAccess: toJson(source.templateAccess ?? {}),
        templateUsageLog: toJson(source.templateUsageLog ?? []),
      },
    });
    return;
  }

  const usageLog = toRecordList(source.templateUsageLog);
  const existing = toRecordList(current.templateUsageLog);
  const merged = [
    ...usageLog.filter((entry) => entry.employeeId === actor.userId),
    ...existing.filter((entry) => entry.employeeId !== actor.userId),
  ];

  await prisma.templateState.update({
    where: { id: 'main' },
    data: {
      templateUsageLog: toJson(merged),
    },
  });
}

export async function saveOperationsState(payload: unknown, actor: { userId: string; role: UserRole }) {
  await ensureStateRows();
  const source = typeof payload === 'object' && payload ? (payload as Record<string, unknown>) : {};
  const current = await prisma.operationsState.findUniqueOrThrow({ where: { id: 'main' } });

  if (actor.role === UserRole.ADMIN) {
    await prisma.operationsState.update({
      where: { id: 'main' },
      data: {
        userMeta: toJson(source.userMeta ?? {}),
        siteLeads: toJson(source.siteLeads ?? []),
        visitorEvents: toJson(source.visitorEvents ?? []),
        activityLog: toJson(source.activityLog ?? []),
        documentReviews: toJson(source.documentReviews ?? []),
        notes: toJson(source.notes ?? []),
      },
    });
    return;
  }

  const mergeBy = (incoming: Array<Record<string, unknown>>, existing: Array<Record<string, unknown>>, matcher: (item: Record<string, unknown>) => boolean) => {
    const preserved = existing.filter((item) => !matcher(item));
    return [...incoming.filter(matcher), ...preserved];
  };

  const nextActivity = mergeBy(
    Array.isArray(source.activityLog) ? (source.activityLog as Array<Record<string, unknown>>) : [],
    Array.isArray(current.activityLog) ? (current.activityLog as Array<Record<string, unknown>>) : [],
    (item) => item?.userId === actor.userId
  );
  const nextReviews = mergeBy(
    Array.isArray(source.documentReviews) ? (source.documentReviews as Array<Record<string, unknown>>) : [],
    Array.isArray(current.documentReviews) ? (current.documentReviews as Array<Record<string, unknown>>) : [],
    (item) => item?.employeeId === actor.userId
  );
  const nextNotes = mergeBy(
    Array.isArray(source.notes) ? (source.notes as Array<Record<string, unknown>>) : [],
    Array.isArray(current.notes) ? (current.notes as Array<Record<string, unknown>>) : [],
    (item) => !item?.ownerId || item.ownerId === actor.userId
  );

  const currentUserMeta = current.userMeta && typeof current.userMeta === 'object' ? (current.userMeta as Record<string, unknown>) : {};
  const incomingUserMeta = source.userMeta && typeof source.userMeta === 'object' ? (source.userMeta as Record<string, unknown>) : {};
  const mergedUserMeta = {
    ...currentUserMeta,
    ...Object.fromEntries(Object.entries(incomingUserMeta).filter(([key]) => key.endsWith(`:${actor.userId}`))),
  };

  await prisma.operationsState.update({
    where: { id: 'main' },
    data: {
      userMeta: toJson(mergedUserMeta),
      activityLog: toJson(nextActivity),
      documentReviews: toJson(nextReviews),
      notes: toJson(nextNotes),
    },
  });
}

export async function appendLead(payload: unknown) {
  await ensureStateRows();
  const state = await prisma.operationsState.findUniqueOrThrow({ where: { id: 'main' } });
  const siteLeads = Array.isArray(state.siteLeads) ? state.siteLeads : [];
  await prisma.operationsState.update({
    where: { id: 'main' },
    data: { siteLeads: toJson([payload, ...siteLeads].slice(0, 1200)) },
  });
}

export async function appendVisitorEvent(payload: unknown) {
  await ensureStateRows();
  const state = await prisma.operationsState.findUniqueOrThrow({ where: { id: 'main' } });
  const visitorEvents = Array.isArray(state.visitorEvents) ? state.visitorEvents : [];
  await prisma.operationsState.update({
    where: { id: 'main' },
    data: { visitorEvents: toJson([payload, ...visitorEvents].slice(0, 4000)) },
  });
}
