import bcrypt from 'bcryptjs';
import { PrismaClient, PasswordAlgorithm, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const olegPasswordHash = await bcrypt.hash('1234', 10);
  const secondAdminHash = await bcrypt.hash('1234', 10);

  await prisma.team.upsert({
    where: { id: 'team1' },
    update: {},
    create: { id: 'team1', name: '\u041a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u043e\u0435 \u043f\u0440\u0430\u0432\u043e', color: '#3b82f6' },
  });

  await prisma.team.upsert({
    where: { id: 'team2' },
    update: {},
    create: { id: 'team2', name: '\u0413\u0440\u0430\u0436\u0434\u0430\u043d\u0441\u043a\u043e\u0435 \u043f\u0440\u0430\u0432\u043e', color: '#8b5cf6' },
  });

  await prisma.user.upsert({
    where: { login: 'oleg' },
    update: {
      name: '\u041e\u043b\u0435\u0433',
      role: UserRole.ADMIN,
      isSuperAdmin: true,
      mustChangePassword: true,
      blocked: false,
      passwordHash: olegPasswordHash,
      passwordAlgorithm: PasswordAlgorithm.BCRYPT,
      passwordSalt: null,
    },
    create: {
      id: 'admin1',
      name: '\u041e\u043b\u0435\u0433',
      login: 'oleg',
      role: UserRole.ADMIN,
      isSuperAdmin: true,
      mustChangePassword: true,
      blocked: false,
      passwordHash: olegPasswordHash,
      passwordAlgorithm: PasswordAlgorithm.BCRYPT,
    },
  });

  await prisma.user.upsert({
    where: { login: 'aibarys' },
    update: {
      name: '\u0410\u0439\u0431\u0430\u0440\u044b\u0441',
      role: UserRole.ADMIN,
      isSuperAdmin: false,
      mustChangePassword: false,
      blocked: false,
      passwordHash: secondAdminHash,
      passwordAlgorithm: PasswordAlgorithm.BCRYPT,
      passwordSalt: null,
    },
    create: {
      id: 'admin2',
      name: '\u0410\u0439\u0431\u0430\u0440\u044b\u0441',
      login: 'aibarys',
      role: UserRole.ADMIN,
      isSuperAdmin: false,
      mustChangePassword: false,
      blocked: false,
      passwordHash: secondAdminHash,
      passwordAlgorithm: PasswordAlgorithm.BCRYPT,
    },
  });

  await prisma.appState.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
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
    },
  });

  await prisma.websiteContentState.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      payload: {
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
      },
    },
  });

  await prisma.templateState.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      templates: [],
      templateAccess: {},
      templateUsageLog: [],
    },
  });

  await prisma.operationsState.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      userMeta: {},
      siteLeads: [],
      visitorEvents: [],
      activityLog: [],
      documentReviews: [],
      notes: [],
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
