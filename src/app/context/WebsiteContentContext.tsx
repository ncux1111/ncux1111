import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { normalizeUiText } from '../utils/textEncoding';
import type { PublicQrDisplayMode } from '../utils/qr';
import { useApp } from './AppContext';
import { isApiPersistenceEnabled } from '../services/api-client';
import { loadBootstrapCache } from '../services/bootstrap-cache';
import { fetchPublicWebsiteContentApi, saveWebsiteStateApi } from '../services/server-api';

export interface PublicHeroContent {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

export interface PublicStat {
  id: string;
  value: string;
  label: string;
}

export interface PublicServiceGradient {
  from: string;
  via: string;
  to: string;
}

export interface PublicServiceCard {
  id: string;
  title: string;
  description: string;
  bullets: string[];
  accent: string;
  accentColors: PublicServiceGradient;
}

export interface PublicTeamMember {
  id: string;
  name: string;
  role: string;
  specialty: string;
  bio: string;
}

export interface PublicContacts {
  phone: string;
  whatsapp: string;
  whatsappLink: string;
  telegramLink: string;
  email: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  officeHours: string;
  whatsappQrImage: string | null;
  telegramQrImage: string | null;
  qrDisplayMode: PublicQrDisplayMode;
}

export interface CompanyContent {
  name: string;
  shortName: string;
  tagline: string;
  aboutTitle: string;
  aboutText: string;
  aboutHighlights: string[];
}

export interface WebsiteContent {
  company: CompanyContent;
  hero: PublicHeroContent;
  stats: PublicStat[];
  services: PublicServiceCard[];
  team: PublicTeamMember[];
  contacts: PublicContacts;
}

interface WebsiteContentContextValue {
  websiteContent: WebsiteContent;
  setWebsiteContent: (next: WebsiteContent | ((previous: WebsiteContent) => WebsiteContent)) => void;
}

const WEBSITE_CONTENT_KEY = 'zan-qdm-website-content-v1';

const DEFAULT_SERVICE_GRADIENTS: PublicServiceGradient[] = [
  { from: '#f5c34d', via: '#f59e0b', to: '#ea580c' },
  { from: '#9f7aea', via: '#7c3aed', to: '#4338ca' },
  { from: '#38bdf8', via: '#0ea5e9', to: '#2563eb' },
];

function createLegacyAccent(colors: PublicServiceGradient) {
  return `${colors.from}|${colors.via}|${colors.to}`;
}

function pickLegacyGradient(value?: string | null) {
  const normalized = (value || '').toLowerCase();

  if (normalized.includes('fuchsia') || normalized.includes('violet') || normalized.includes('indigo')) {
    return DEFAULT_SERVICE_GRADIENTS[1];
  }

  if (normalized.includes('cyan') || normalized.includes('sky') || normalized.includes('blue')) {
    return DEFAULT_SERVICE_GRADIENTS[2];
  }

  const parts = (value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length === 3) {
    return {
      from: parts[0],
      via: parts[1],
      to: parts[2],
    };
  }

  return DEFAULT_SERVICE_GRADIENTS[0];
}

function normalizeText(value: unknown, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return normalizeUiText(value).trim() || fallback;
}

function normalizeTextArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const next = value.map((item) => normalizeText(item)).filter(Boolean);
  return next.length > 0 ? next : fallback;
}

function normalizeGradient(
  candidate: unknown,
  legacyAccent: unknown,
  fallback: PublicServiceGradient
): PublicServiceGradient {
  if (candidate && typeof candidate === 'object') {
    const source = candidate as Partial<PublicServiceGradient>;
    return {
      from: normalizeText(source.from, fallback.from),
      via: normalizeText(source.via, fallback.via),
      to: normalizeText(source.to, fallback.to),
    };
  }

  return pickLegacyGradient(typeof legacyAccent === 'string' ? legacyAccent : '') || fallback;
}

const defaultWebsiteContent: WebsiteContent = {
  company: {
    name: 'ZAN QDM',
    shortName: 'ZAN QDM',
    tagline: 'Юридическая компания для бизнеса и частных клиентов',
    aboutTitle: 'Юридическая защита, сопровождение и результат',
    aboutText:
      'ZAN QDM сопровождает корпоративные сделки, судебные споры, взыскание задолженности и стратегические юридические задачи бизнеса. Мы работаем как единая команда и ведем дело от консультации до результата.',
    aboutHighlights: [
      'Корпоративное сопровождение, судебная практика и претензионная работа в одном контуре.',
      'Понятная коммуникация, прозрачные этапы и юридическая позиция под конкретную задачу клиента.',
      'Команда, которая быстро подключается к переговорам, документам и защите интересов в суде.',
    ],
  },
  hero: {
    eyebrow: 'Юридическая компания Казахстана',
    title: 'Защищаем интересы бизнеса',
    accent: 'точно и системно',
    description:
      'Помогаем компаниям и частным клиентам решать корпоративные, судебные и договорные вопросы в современном legal-tech формате.',
    primaryLabel: 'Получить консультацию',
    primaryHref: '/contacts',
    secondaryLabel: 'Наши услуги',
    secondaryHref: '/services',
  },
  stats: [
    { id: 'clients', value: '500+', label: 'клиентов' },
    { id: 'experience', value: '10+', label: 'лет практики' },
    { id: 'success', value: '98%', label: 'успешных кейсов' },
  ],
  services: [
    {
      id: 'corporate',
      title: 'Корпоративное право',
      description:
        'Сделки, внутренние документы, уставные изменения, регистрационные процедуры и правовая архитектура бизнеса.',
      bullets: ['Структурирование бизнеса', 'Договорная работа', 'Сопровождение ТОО и сделок'],
      accentColors: DEFAULT_SERVICE_GRADIENTS[0],
      accent: createLegacyAccent(DEFAULT_SERVICE_GRADIENTS[0]),
    },
    {
      id: 'litigation',
      title: 'Судебная практика',
      description:
        'Подготовка процессуальных документов, стратегия защиты, претензионная работа и представительство в суде.',
      bullets: ['Иски и возражения', 'Жалобы и ходатайства', 'Представительство в суде'],
      accentColors: DEFAULT_SERVICE_GRADIENTS[1],
      accent: createLegacyAccent(DEFAULT_SERVICE_GRADIENTS[1]),
    },
    {
      id: 'debt',
      title: 'Взыскание задолженности',
      description:
        'Анализ ситуации, переговоры, правовая подготовка и сопровождение взыскания от досудебной стадии до исполнения.',
      bullets: ['Досудебное урегулирование', 'Исполнительное производство', 'Контроль возврата задолженности'],
      accentColors: DEFAULT_SERVICE_GRADIENTS[2],
      accent: createLegacyAccent(DEFAULT_SERVICE_GRADIENTS[2]),
    },
  ],
  team: [
    {
      id: 't1',
      name: 'Олег',
      role: 'Управляющий партнер',
      specialty: 'Корпоративное право и стратегия',
      bio: 'Курирует ключевые проекты компании, сложные сделки и правовую стратегию сопровождения клиентов.',
    },
    {
      id: 't2',
      name: 'Айбарыс',
      role: 'Руководитель практики',
      specialty: 'Судебная защита и претензионная работа',
      bio: 'Отвечает за судебные процессы, юридическую тактику и контроль качества процессуальных документов.',
    },
    {
      id: 't3',
      name: 'Команда ZAN QDM',
      role: 'Юридическая практика',
      specialty: 'Документы, переговоры, сопровождение клиентов',
      bio: 'Специалисты компании ведут договорную, судебную и консультационную работу в едином стандарте качества.',
    },
  ],
  contacts: {
    phone: '+7 (700) 000-00-00',
    whatsapp: '+7 (700) 000-00-00',
    whatsappLink: 'https://wa.me/77000000000',
    telegramLink: 'https://t.me/zanqdm',
    email: 'info@zanqdm.kz',
    address: 'Проспект Аль-Фараби, деловой центр ZAN QDM',
    city: 'Алматы',
    latitude: '43.238949',
    longitude: '76.889709',
    officeHours: 'Пн-Пт 09:00-19:00',
    whatsappQrImage: null,
    telegramQrImage: null,
    qrDisplayMode: 'both',
  },
};

const WebsiteContentContext = createContext<WebsiteContentContextValue | undefined>(undefined);

function normalizeServiceCard(value: unknown, fallback: PublicServiceCard, index: number): PublicServiceCard {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const candidate = value as Partial<PublicServiceCard>;
  const accentColors = normalizeGradient(
    candidate.accentColors,
    candidate.accent,
    fallback.accentColors || DEFAULT_SERVICE_GRADIENTS[index % DEFAULT_SERVICE_GRADIENTS.length]
  );

  return {
    id: normalizeText(candidate.id, fallback.id),
    title: normalizeText(candidate.title, fallback.title),
    description: normalizeText(candidate.description, fallback.description),
    bullets: normalizeTextArray(candidate.bullets, fallback.bullets),
    accentColors,
    accent: createLegacyAccent(accentColors),
  };
}

function normalizeWebsiteContent(raw: unknown): WebsiteContent {
  if (!raw || typeof raw !== 'object') {
    return defaultWebsiteContent;
  }

  const candidate = raw as Partial<WebsiteContent>;

  return {
    company: {
      name: normalizeText(candidate.company?.name, defaultWebsiteContent.company.name),
      shortName: normalizeText(candidate.company?.shortName, defaultWebsiteContent.company.shortName),
      tagline: normalizeText(candidate.company?.tagline, defaultWebsiteContent.company.tagline),
      aboutTitle: normalizeText(candidate.company?.aboutTitle, defaultWebsiteContent.company.aboutTitle),
      aboutText: normalizeText(candidate.company?.aboutText, defaultWebsiteContent.company.aboutText),
      aboutHighlights: normalizeTextArray(
        candidate.company?.aboutHighlights,
        defaultWebsiteContent.company.aboutHighlights
      ),
    },
    hero: {
      eyebrow: normalizeText(candidate.hero?.eyebrow, defaultWebsiteContent.hero.eyebrow),
      title: normalizeText(candidate.hero?.title, defaultWebsiteContent.hero.title),
      accent: normalizeText(candidate.hero?.accent, defaultWebsiteContent.hero.accent),
      description: normalizeText(candidate.hero?.description, defaultWebsiteContent.hero.description),
      primaryLabel: normalizeText(candidate.hero?.primaryLabel, defaultWebsiteContent.hero.primaryLabel),
      primaryHref: normalizeText(candidate.hero?.primaryHref, defaultWebsiteContent.hero.primaryHref),
      secondaryLabel: normalizeText(candidate.hero?.secondaryLabel, defaultWebsiteContent.hero.secondaryLabel),
      secondaryHref: normalizeText(candidate.hero?.secondaryHref, defaultWebsiteContent.hero.secondaryHref),
    },
    stats:
      Array.isArray(candidate.stats) && candidate.stats.length > 0
        ? candidate.stats.map((item, index) => {
            const fallback = defaultWebsiteContent.stats[index % defaultWebsiteContent.stats.length];
            return {
              id: normalizeText(item?.id, fallback.id),
              value: normalizeText(item?.value, fallback.value),
              label: normalizeText(item?.label, fallback.label),
            };
          })
        : defaultWebsiteContent.stats,
    services:
      Array.isArray(candidate.services) && candidate.services.length > 0
        ? candidate.services.map((item, index) =>
            normalizeServiceCard(item, defaultWebsiteContent.services[index % defaultWebsiteContent.services.length], index)
          )
        : defaultWebsiteContent.services,
    team:
      Array.isArray(candidate.team) && candidate.team.length > 0
        ? candidate.team.map((item, index) => {
            const fallback = defaultWebsiteContent.team[index % defaultWebsiteContent.team.length];
            return {
              id: normalizeText(item?.id, fallback.id),
              name: normalizeText(item?.name, fallback.name),
              role: normalizeText(item?.role, fallback.role),
              specialty: normalizeText(item?.specialty, fallback.specialty),
              bio: normalizeText(item?.bio, fallback.bio),
            };
          })
        : defaultWebsiteContent.team,
    contacts: {
      phone: normalizeText(candidate.contacts?.phone, defaultWebsiteContent.contacts.phone),
      whatsapp: normalizeText(candidate.contacts?.whatsapp, defaultWebsiteContent.contacts.whatsapp),
      whatsappLink: normalizeText(candidate.contacts?.whatsappLink, defaultWebsiteContent.contacts.whatsappLink),
      telegramLink: normalizeText(candidate.contacts?.telegramLink, defaultWebsiteContent.contacts.telegramLink),
      email: normalizeText(candidate.contacts?.email, defaultWebsiteContent.contacts.email),
      address: normalizeText(candidate.contacts?.address, defaultWebsiteContent.contacts.address),
      city: normalizeText(candidate.contacts?.city, defaultWebsiteContent.contacts.city),
      latitude: normalizeText(candidate.contacts?.latitude, defaultWebsiteContent.contacts.latitude),
      longitude: normalizeText(candidate.contacts?.longitude, defaultWebsiteContent.contacts.longitude),
      officeHours: normalizeText(candidate.contacts?.officeHours, defaultWebsiteContent.contacts.officeHours),
      whatsappQrImage:
        typeof candidate.contacts?.whatsappQrImage === 'string' && candidate.contacts.whatsappQrImage.startsWith('data:image/')
          ? candidate.contacts.whatsappQrImage
          : defaultWebsiteContent.contacts.whatsappQrImage,
      telegramQrImage:
        typeof candidate.contacts?.telegramQrImage === 'string' && candidate.contacts.telegramQrImage.startsWith('data:image/')
          ? candidate.contacts.telegramQrImage
          : defaultWebsiteContent.contacts.telegramQrImage,
      qrDisplayMode:
        candidate.contacts?.qrDisplayMode === 'whatsapp' ||
        candidate.contacts?.qrDisplayMode === 'telegram' ||
        candidate.contacts?.qrDisplayMode === 'both' ||
        candidate.contacts?.qrDisplayMode === 'none'
          ? candidate.contacts.qrDisplayMode
          : defaultWebsiteContent.contacts.qrDisplayMode,
    },
  };
}

export function WebsiteContentProvider({ children }: { children: ReactNode }) {
  const { currentUser, authReady } = useApp();
  const apiPersistenceEnabled = isApiPersistenceEnabled();

  const [websiteContent, setWebsiteContent] = useState<WebsiteContent>(() => {
    if (apiPersistenceEnabled || typeof window === 'undefined') {
      return defaultWebsiteContent;
    }

    const raw = window.localStorage.getItem(WEBSITE_CONTENT_KEY);
    if (!raw) {
      return defaultWebsiteContent;
    }

    try {
      return normalizeWebsiteContent(JSON.parse(raw));
    } catch {
      return defaultWebsiteContent;
    }
  });
  const [remoteStateReady, setRemoteStateReady] = useState(() => !apiPersistenceEnabled);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }

    window.localStorage.setItem(WEBSITE_CONTENT_KEY, JSON.stringify(websiteContent));
  }, [apiPersistenceEnabled, remoteStateReady, websiteContent]);

  useEffect(() => {
    if (!apiPersistenceEnabled) {
      setRemoteStateReady(true);
      return;
    }

    let cancelled = false;
    let remoteLoaded = false;

    const loadWebsiteContent = async () => {
      try {
        if (currentUser && authReady) {
          const bootstrap = await loadBootstrapCache();
          if (!cancelled) {
            setWebsiteContent(normalizeWebsiteContent(bootstrap.websiteContent));
            remoteLoaded = true;
          }
          return;
        }

        const payload = await fetchPublicWebsiteContentApi();
        if (!cancelled) {
          setWebsiteContent(normalizeWebsiteContent(payload));
          remoteLoaded = true;
        }
      } catch {
        // keep local fallback
      } finally {
        if (!cancelled) {
          setRemoteStateReady(remoteLoaded);
        }
      }
    };

    void loadWebsiteContent();

    return () => {
      cancelled = true;
    };
  }, [apiPersistenceEnabled, authReady, currentUser]);

  useEffect(() => {
    if (!apiPersistenceEnabled || !remoteStateReady || !authReady || currentUser?.role !== 'admin') {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveWebsiteStateApi(websiteContent);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [apiPersistenceEnabled, authReady, currentUser?.role, remoteStateReady, websiteContent]);

  const value = useMemo(
    () => ({
      websiteContent,
      setWebsiteContent,
    }),
    [websiteContent]
  );

  return <WebsiteContentContext.Provider value={value}>{children}</WebsiteContentContext.Provider>;
}

export function useWebsiteContent() {
  const context = useContext(WebsiteContentContext);
  if (!context) {
    throw new Error('useWebsiteContent must be used within WebsiteContentProvider');
  }

  return context;
}
