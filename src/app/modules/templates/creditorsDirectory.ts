import type { TemplateFieldConfig } from './types';
import { RAW_CREDITOR_SOURCE, type RawCreditorSourceEntry } from './creditorsSource';

export type CreditorCategory = 'bank' | 'mfo' | 'collector' | 'other';

export type CreditorEntry = {
  id: string;
  name: string;
  category: CreditorCategory;
  address?: string;
  bin?: string;
  phone?: string;
  email?: string;
  extraEmails?: string[];
  aliases?: string[];
};

export type CreditorOption = {
  id: string;
  value: string;
  label: string;
  category: CreditorCategory;
};

type CreditorFieldRole =
  | 'creditorName'
  | 'creditorAddress'
  | 'creditorBin'
  | 'creditorEmail'
  | 'creditorPhone'
  | null;

type CreditorOverride = Partial<Omit<CreditorEntry, 'id' | 'email' | 'extraEmails'>> & {
  mergeId?: string;
  aliases?: string[];
};

const OTHER_CREDITOR_OPTION = 'Другое';

const CYRILLIC_LETTERS = /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/;
const LATIN_LETTERS = /[A-Za-z]/;

const LOOKALIKE_LATIN_TO_CYRILLIC: Record<string, string> = {
  A: 'А',
  a: 'а',
  B: 'В',
  C: 'С',
  c: 'с',
  E: 'Е',
  e: 'е',
  H: 'Н',
  K: 'К',
  k: 'к',
  M: 'М',
  O: 'О',
  o: 'о',
  P: 'Р',
  p: 'р',
  T: 'Т',
  X: 'Х',
  x: 'х',
  Y: 'У',
  y: 'у',
};

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  ә: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  ғ: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'i',
  к: 'k',
  қ: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  ң: 'n',
  о: 'o',
  ө: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ұ: 'u',
  ү: 'u',
  ф: 'f',
  х: 'h',
  һ: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ы: 'y',
  і: 'i',
  ь: '',
  ъ: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

const CREDITOR_OVERRIDES_BY_EMAIL: Record<string, CreditorOverride> = {
  'info@bcc.kz': {
    name: 'АО «Банк ЦентрКредит»',
    aliases: ['Bank CenterCredit'],
  },
  'office@kaspi.kz': {
    name: 'АО «Kaspi Bank»',
    aliases: ['Kaspi Bank'],
  },
  'info@eubank.kz': {
    name: 'АО «Евразийский Банк»',
    aliases: ['Eurasian Bank'],
  },
  'salem@freedombank.kz': {
    name: 'АО «Фридом Банк Казахстан»',
    aliases: ['Freedom Bank'],
  },
  'info@bankrbk.kz': {
    name: 'АО «Bank RBK»',
  },
  'client@homecredit.kz': {
    name: 'АО «Home Credit Bank»',
  },
  'post@berekebank.kz': {
    name: 'АО «Bereke Bank»',
  },
  'info@fortebank.com': {
    name: 'АО «ForteBank»',
    aliases: ['Forte Bank'],
  },
  'info@halykbank.kz': {
    name: 'АО «Народный Банк Казахстана»',
    aliases: ['Halyk Bank', 'АО «Народный банк Казахстана» (Halyk Bank)'],
  },
  'info@vtb-bank.kz': {
    name: 'ДО АО Банк ВТБ (Казахстан)',
  },
  'support@solva.kz': {
    name: 'ТОО «МФО «ОнлайнКазФинанс»',
    category: 'mfo',
  },
  'info@hava.kz': {
    name: 'ТОО «МФО «Hava Finance»',
    address: 'г. Алматы, проспект Сейфуллина, дом №502',
  },
  'help@qanat.kz': {
    name: 'ТОО «МФО «Qanat Finance»',
  },
  'info@dengiclick.kz': {
    name: 'ТОО «МФО «Lending and Finance Technologies»',
    address: 'г. Петропавловск, ул. Нурсултан Назарбаев, дом 134',
  },
  'help@turbomoney.kz': {
    name: 'ТОО «МФО «аФинанс»',
  },
  'help@tengeda.kz': {
    name: 'ТОО «МФО «Деньги говорят»',
  },
  'info@creditplus.kz': {
    name: 'ТОО «МФО «Kredit Seven Kazakhstan (Кредит Севен Казахстан)»',
    category: 'mfo',
  },
  'support@kengo.kz': {
    name: 'ТОО «МФО «Бизнес займ»',
    category: 'mfo',
  },
  'support@kviku.kz': {
    name: 'ТОО «МФО «MFO №1»',
    category: 'mfo',
  },
  'info@ccloan.kz': {
    name: 'ТОО «МФО «СиСиЛоун.кз»',
  },
  'info@akshamat.kz': {
    name: 'ТОО «МФО «FINBOX»',
  },
  'info@neocredit.kz': {
    name: 'ТОО «МФО «LEGAL MONEY»',
  },
  'ok@jetfin.kz': {
    name: 'ТОО «МФО «Mogo Kazakhstan»',
  },
  'info@sfk.r2pinvest.kz': {
    name: 'ТОО «СФК «r2p invest KZ»',
    category: 'other',
  },
  'info@ffin.credit': {
    name: 'ТОО «МФО «ФРИДОМ ФИНАНС Кредит»',
  },
  'info@idcollect.kz': {
    name: 'ТОО «Коллекторское агентство «ID Collect»',
  },
  'info@kmf.kz': {
    name: 'АО «МФО «KMF»',
    category: 'mfo',
  },
  'office@r-finance.kz': {
    name: 'ТОО «МФО «R-Finance»',
  },
  'partnergroup@sfkpg.kz': {
    name: 'ТОО «СФО «Partner Group»',
    category: 'other',
  },
  'shf@shinhanfinance.kz': {
    name: 'ТОО «МФО «Шинхан Финанс»',
  },
  'info@acfund.kz': {
    name: 'ТОО «МФО «Азиатский Кредитный Фонд»',
    bin: '051040001396',
  },
  'help@timezaim.kz': {
    name: 'ТОО «МФО «Express Аванс»',
  },
  'info@kazcollect.kz': {
    name: 'ТОО «Коллекторское агентство «Kaz Collect»',
  },
  'info@sfoffline.kz': {
    name: 'ТОО «МФО «SF Offline» (СФ Оффлайн)',
  },
  'info@selfiecredit.kz': {
    name: 'ТОО «МФО «CreditNOVA»',
  },
  'official@finfive.kz': {
    name: 'ТОО «МФО «Симетра»',
  },
  'mfokazynakredit@mail.ru': {
    name: 'ТОО «МФО «El Qazyna»',
  },
  'info@mfomaxmoney.kz': {
    name: 'ТОО «МФО «MaxMoney»',
  },
  'support@moneyplus.kz': {
    name: 'ТОО «МФО «Moneyplus»',
    address: 'г. Алматы, Бостандыкский район, улица Жандосова, дом 2',
  },
  'office@gmoney.kz': {
    name: 'ТОО «МФО «ЮНИКРЕДО»',
  },
  'astanamfo@mail.ru': {
    name: 'ТОО «МФО «Экспресс Займ»',
  },
  'info@beecredit.kz': {
    name: 'ТОО «МФО «BeeClever»',
  },
  'info@credit365.kz': {
    name: 'ТОО «МФО «Credit365 Kazakhstan» (Кредит 365 Казахстан)',
  },
  'info@creditbar.kz': {
    name: 'ТОО «МФО «CreditBar (КредитБар)»',
  },
  'appeal@touchzaim.kz': {
    name: 'ТОО «МФО «Touchzaim»',
  },
  'info@onecredit.kz': {
    name: 'ТОО «МФО «ONE CREDIT»',
  },
  'info@findom.kz': {
    name: 'ТОО «МФО «SwF»',
  },
  'info.robocash@zaimer.kz': {
    name: 'ТОО «МФО «Робокэш.кз»',
  },
  'openoffice@explus.kz': {
    name: 'ТОО «Коллекторское агентство «Эксперт Плюс»',
  },
  'office@fdc.kz': {
    name: 'ТОО «Коллекторское агентство «FD Collection»',
  },
};

const CREDITOR_MERGE_BY_BIN: Record<string, CreditorOverride> = {
  '920140000084': {
    mergeId: 'alatau-city-bank',
    name: 'АО «Alatau City Bank»',
    category: 'bank',
    aliases: ['АО «First Heartland Jusan Bank»', 'Jusan Bank'],
  },
  '220240035629': {
    mergeId: 'auto-siyliq-finance',
    name: 'ТОО «МФО «AUTO SIYLIQ FINANCE»',
    category: 'mfo',
    aliases: ['ТОО «МФО «AUTO SIYLIQFINANCE»'],
  },
  '181240027056': {
    mergeId: 'mycar-finance',
    name: 'ТОО «МФО «MyCar Finance»',
    category: 'mfo',
    aliases: ['ТОО «МФО MyCarFinance»'],
  },
};

const CREDITOR_CATEGORY_LABELS: Record<CreditorCategory, string> = {
  bank: 'Банки',
  mfo: 'МФО',
  collector: 'Коллекторские агентства',
  other: 'Прочие',
};

const CREDITOR_CONTEXT_KEYWORDS = /(банк|bank|кредитор|creditor|мфо|microfinance|коллектор|collector|сфо|сфк)/i;
const EMAIL_KEYWORDS = /(email|e-mail|mail|почт)/i;
const PHONE_KEYWORDS = /(контакт|contact|тел|phone|mobile|whatsapp)/i;
const ADDRESS_KEYWORDS = /(address|адрес|местонах|локац|место нах)/i;
const BIN_KEYWORDS = /(^|[^a-z])(бин|bin)([^a-z]|$)/i;

function normalizeDisplayText(value: string) {
  return value
    .replace(/\u00A0/g, ' ')
    .replace(/В«/g, '«')
    .replace(/В»/g, '»')
    .replace(/в„–/g, '№')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMixedScriptToken(token: string) {
  if (!CYRILLIC_LETTERS.test(token) || !LATIN_LETTERS.test(token)) return token;
  return token.replace(/[ABCEHKMOPTXYabcehkmoptxy]/g, (char) => LOOKALIKE_LATIN_TO_CYRILLIC[char] || char);
}

function normalizeMixedScriptText(value: string) {
  return value.replace(/[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі№]+/g, normalizeMixedScriptToken);
}

function normalizeLookupText(value: string) {
  return normalizeMixedScriptText(value)
    .toLowerCase()
    .replace(/\u00A0/g, ' ')
    .replace(/[«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEmails(value?: string[]) {
  return (value || []).map((email) => email.trim().toLowerCase()).filter(Boolean);
}

function normalizeAddress(value?: string | null) {
  if (!value) return undefined;

  const normalized = normalizeMixedScriptText(
    normalizeDisplayText(value)
      .replace(/\bE-?mail:.*$/i, '')
      .replace(/\bE-mial:.*$/i, '')
      .replace(/\bEmail:.*$/i, '')
      .replace(/\bг\./i, 'г. ')
      .replace(/\bул\./i, 'ул. ')
      .replace(/\bпр\./i, 'пр. ')
      .replace(/\bпроспект\b/i, 'проспект')
  )
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || undefined;
}

function normalizeName(value: string) {
  return normalizeMixedScriptText(
    normalizeDisplayText(value)
      .replace(/^в\s+(?=ТОО|АО|ДО)/i, '')
      .replace(/\s*БИН[:：]?\s*\d{12}/i, '')
      .replace(/\bAO\b/g, 'АО')
      .replace(/\bTOO\b/g, 'ТОО')
      .replace(/\bMFO\b/g, 'МФО')
      .replace(/\bSFO\b/g, 'СФО')
      .replace(/\bSFK\b/g, 'СФК')
      .replace(/\bJSC\b/g, '')
      .replace(/\(\s*\)/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function detectCreditorCategory(name: string, fallback: RawCreditorSourceEntry['category']): CreditorCategory {
  const text = normalizeLookupText(`${name} ${fallback || ''}`);

  if (/коллект|collect/.test(text)) return 'collector';
  if (/мфо|microfinance/.test(text)) return 'mfo';
  if (/сфо|сфк/.test(text)) return 'other';
  if (/банк|bank|halyk|kaspi|forte|bereke|vtb|home credit|alatau city/.test(text)) return 'bank';
  return fallback;
}

function slugifyCreditorId(value: string) {
  const normalized = normalizeLookupText(value);
  const result = Array.from(normalized)
    .map((char) => {
      if (/[a-z0-9]/.test(char)) return char;
      const mapped = CYRILLIC_TO_LATIN[char];
      if (mapped !== undefined) return mapped;
      return '-';
    })
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return result || 'creditor';
}

export function normalizeCreditorEntry(entry: CreditorEntry): CreditorEntry {
  const emails = normalizeEmails([entry.email, ...(entry.extraEmails || [])]);
  const [primaryEmail, ...extraEmails] = emails;
  const aliases = Array.from(new Set((entry.aliases || []).map((alias) => normalizeName(alias)).filter(Boolean)));

  return {
    id: entry.id || slugifyCreditorId(entry.name),
    name: normalizeName(entry.name),
    category: detectCreditorCategory(entry.name, entry.category),
    address: normalizeAddress(entry.address),
    bin: entry.bin?.trim() || undefined,
    phone: normalizeDisplayText(entry.phone || '') || undefined,
    email: primaryEmail || undefined,
    extraEmails: extraEmails.length > 0 ? extraEmails : undefined,
    aliases: aliases.length > 0 ? aliases : undefined,
  };
}

function getCreditorOverride(raw: RawCreditorSourceEntry) {
  const firstEmail = normalizeEmails(raw.emails)[0];
  const byEmail = firstEmail ? CREDITOR_OVERRIDES_BY_EMAIL[firstEmail] : undefined;
  const byBin = raw.bin ? CREDITOR_MERGE_BY_BIN[raw.bin] : undefined;
  return { byEmail, byBin };
}

function mergeCreditorEntry(previous: CreditorEntry | null, next: CreditorEntry) {
  if (!previous) return next;

  const aliases = Array.from(
    new Set([...(previous.aliases || []), ...(next.aliases || []), previous.name !== next.name ? next.name : ''].filter(Boolean))
  );
  const extraEmails = Array.from(
    new Set([previous.email, ...(previous.extraEmails || []), next.email, ...(next.extraEmails || [])].filter(Boolean))
  );
  const [primaryEmail, ...restEmails] = extraEmails;

  return normalizeCreditorEntry({
    ...previous,
    ...next,
    name: previous.name || next.name,
    category: next.category !== 'other' ? next.category : previous.category,
    address:
      next.address && (!previous.address || next.address.length > previous.address.length) ? next.address : previous.address,
    bin: previous.bin || next.bin,
    phone: previous.phone || next.phone,
    email: primaryEmail,
    extraEmails: restEmails,
    aliases,
  });
}

function mapRawSourceToEntry(raw: RawCreditorSourceEntry): CreditorEntry {
  const { byEmail, byBin } = getCreditorOverride(raw);
  const normalizedName = normalizeName(raw.name);
  const emails = normalizeEmails(raw.emails);
  const [primaryEmail, ...extraEmails] = emails;
  const override = { ...byEmail, ...byBin };

  return normalizeCreditorEntry({
    id: override.mergeId || slugifyCreditorId(override.name || normalizedName),
    name: override.name || normalizedName,
    category: override.category || detectCreditorCategory(override.name || normalizedName, raw.category),
    address: override.address || normalizeAddress(raw.address),
    bin: override.bin || raw.bin || undefined,
    phone: override.phone || (raw.phone ? normalizeDisplayText(raw.phone) : undefined),
    email: primaryEmail,
    extraEmails,
    aliases: [...(override.aliases || []), ...(override.name && override.name !== normalizedName ? [normalizedName] : [])],
  });
}

const CREDITORS_DIRECTORY = Object.values(
  RAW_CREDITOR_SOURCE.reduce<Record<string, CreditorEntry>>((accumulator, rawEntry) => {
    const entry = mapRawSourceToEntry(rawEntry);
    accumulator[entry.id] = mergeCreditorEntry(accumulator[entry.id] || null, entry);
    return accumulator;
  }, {})
).sort((left, right) => {
  if (left.category !== right.category) return left.category.localeCompare(right.category, 'ru');
  return left.name.localeCompare(right.name, 'ru');
});

const CREDITOR_BY_ID = new Map(CREDITORS_DIRECTORY.map((entry) => [entry.id, entry]));

const CREDITOR_LOOKUP = new Map<string, CreditorEntry>();
for (const creditor of CREDITORS_DIRECTORY) {
  for (const value of [creditor.name, ...(creditor.aliases || [])]) {
    CREDITOR_LOOKUP.set(normalizeLookupText(value), creditor);
  }
}

function matchesCreditorSearch(entry: CreditorEntry, query: string) {
  if (!query) return true;
  const haystack = normalizeLookupText(
    [
      entry.name,
      entry.bin,
      entry.email,
      ...(entry.extraEmails || []),
      ...(entry.aliases || []),
      entry.address,
    ]
      .filter(Boolean)
      .join(' ')
  );
  return haystack.includes(query);
}

function toCreditorOption(entry: CreditorEntry): CreditorOption {
  return {
    id: entry.id,
    value: entry.name,
    label: entry.name,
    category: entry.category,
  };
}

export function getCreditorCategoryLabel(category: CreditorCategory) {
  return CREDITOR_CATEGORY_LABELS[category];
}

export function getCreditorOptions(search = '') {
  const query = normalizeLookupText(search);
  return CREDITORS_DIRECTORY.filter((entry) => matchesCreditorSearch(entry, query)).map(toCreditorOption);
}

export function getCreditorOptionLabels(search = '') {
  return getCreditorOptions(search).map((option) => option.label);
}

export function getCreditorGroupedOptions(search = '') {
  const options = getCreditorOptions(search);
  return (Object.keys(CREDITOR_CATEGORY_LABELS) as CreditorCategory[])
    .map((category) => ({
      category,
      label: CREDITOR_CATEGORY_LABELS[category],
      options: options.filter((option) => option.category === category),
    }))
    .filter((group) => group.options.length > 0);
}

export function getCreditorById(id: string) {
  return CREDITOR_BY_ID.get(id) || null;
}

export function findCreditorByName(value: string) {
  return CREDITOR_LOOKUP.get(normalizeLookupText(value)) || null;
}

export function getCreditorAutofillPayload(entry: CreditorEntry) {
  return {
    name: entry.name,
    address: entry.address || '',
    bin: entry.bin || '',
    phone: entry.phone || '',
    email: entry.email || '',
    extraEmails: entry.extraEmails || [],
  };
}

export function detectCreditorFieldRole(parts: string[]): CreditorFieldRole {
  const text = normalizeLookupText(parts.join(' '));
  if (!text) return null;

  const hasCreditorContext = CREDITOR_CONTEXT_KEYWORDS.test(text);
  if (!hasCreditorContext) return null;

  if (EMAIL_KEYWORDS.test(text)) return 'creditorEmail';
  if (PHONE_KEYWORDS.test(text)) return 'creditorPhone';
  if (ADDRESS_KEYWORDS.test(text)) return 'creditorAddress';
  if (BIN_KEYWORDS.test(text)) return 'creditorBin';
  return 'creditorName';
}

export function getCreditorFieldRole(field: TemplateFieldConfig): CreditorFieldRole {
  return detectCreditorFieldRole([field.label, field.key, ...(field.rawKeys || [])]);
}

export function findCreditorByFieldValue(value: string) {
  if (!value || value === OTHER_CREDITOR_OPTION) return null;
  return findCreditorByName(value);
}

export function pickCreditorAutofillTargets(fields: TemplateFieldConfig[], sourceFieldKey: string) {
  const available = fields.filter((field) => field.key !== sourceFieldKey);

  let emailTargets = available.filter((field) => getCreditorFieldRole(field) === 'creditorEmail');
  let phoneTargets = available.filter((field) => getCreditorFieldRole(field) === 'creditorPhone');
  let addressTargets = available.filter((field) => getCreditorFieldRole(field) === 'creditorAddress');
  let binTargets = available.filter((field) => getCreditorFieldRole(field) === 'creditorBin');

  if (emailTargets.length === 0) {
    const genericEmailFields = available.filter((field) => field.type === 'email');
    if (genericEmailFields.length === 1) {
      emailTargets = genericEmailFields;
    }
  }

  if (phoneTargets.length === 0) {
    const genericPhoneFields = available.filter((field) => field.type === 'phone');
    if (genericPhoneFields.length === 1) {
      phoneTargets = genericPhoneFields;
    }
  }

  if (addressTargets.length === 0) {
    const genericAddressFields = available.filter((field) =>
      ADDRESS_KEYWORDS.test(normalizeLookupText([field.label, field.key, ...(field.rawKeys || [])].join(' ')))
    );
    if (genericAddressFields.length === 1) {
      addressTargets = genericAddressFields;
    }
  }

  if (binTargets.length === 0) {
    const genericBinFields = available.filter((field) =>
      BIN_KEYWORDS.test(normalizeLookupText([field.label, field.key, ...(field.rawKeys || [])].join(' ')))
    );
    if (genericBinFields.length === 1) {
      binTargets = genericBinFields;
    }
  }

  return { emailTargets, phoneTargets, addressTargets, binTargets };
}

export function collectTemplateFields(fieldsBySection: TemplateFieldConfig[][]) {
  return fieldsBySection.flatMap((fields) => fields);
}

export { CREDITORS_DIRECTORY, OTHER_CREDITOR_OPTION };
