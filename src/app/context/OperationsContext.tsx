import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useApp, type Admin, type CurrentUser, type Employee, type PointsHistory } from './AppContext';
import { useDocumentTemplates } from '../modules/templates';
import { isApiPersistenceEnabled } from '../services/api-client';
import { loadBootstrapCache } from '../services/bootstrap-cache';
import { createPublicLeadApi, createVisitorEventApi, saveOperationsStateApi } from '../services/server-api';
import { resolvePasswordUpdate } from '../utils/credentials';
import {
  loadDocumentReviewBlob,
  loadDocumentReviewObjectUrl,
  saveDocumentReviewBlob,
} from '../utils/documentReviewBlobStorage';

export type ManagedUserRole = 'admin' | 'employee';
export type LeadSource =
  | 'consultation-button'
  | 'contact-form'
  | 'whatsapp'
  | 'telegram'
  | 'qr-whatsapp'
  | 'qr-telegram';
export type LeadStatus = 'new' | 'in_progress' | 'contacted' | 'closed';
export type ActivityType = 'login' | 'logout' | 'templateDownload' | 'documentSubmission' | 'pointsChanged';
export type DocumentReviewStatus = 'new' | 'in_review' | 'approved' | 'rejected' | 'changes_requested';
export type DocumentReviewSubmitMode = 'preview' | 'file';
export type NoteScope = 'admin' | 'employee' | 'document';

export interface DocumentReviewPreviewSource {
  source: 'current-preview';
  editableMode?: string;
  generatedAt: number;
}

export type DocumentReviewSnapshotValues = Record<string, string | string[]>;

export interface UserAccountMeta {
  id: string;
  role: ManagedUserRole;
  blocked: boolean;
  lastLoginAt?: number;
  lastLogoutAt?: number;
  lastClientId?: string;
}

export interface SiteLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  comment: string;
  source: LeadSource;
  createdAt: number;
  status: LeadStatus;
  clientId: string;
}

export interface VisitorEvent {
  id: string;
  type: 'page_view' | 'consultation' | 'lead' | 'whatsapp' | 'telegram' | 'qr_whatsapp' | 'qr_telegram';
  path?: string;
  timestamp: number;
  clientId: string;
}

export interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  userId?: string;
  userName: string;
  role?: ManagedUserRole;
  clientId: string;
  timestamp: number;
  details: string;
}

export interface DocumentReviewRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeLogin?: string;
  templateId: string;
  templateName: string;
  submitMode: DocumentReviewSubmitMode;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageId: string;
  comment: string;
  submittedAt: number;
  status: DocumentReviewStatus;
  snapshotValues?: DocumentReviewSnapshotValues;
  previewSource?: DocumentReviewPreviewSource;
  reviewedAt?: number;
  reviewedByAdminId?: string;
  reviewedByAdminName?: string;
  adminId?: string;
  adminName?: string;
  adminComment?: string;
  decisionAt?: number;
  awardedPoints?: number;
  awardedReason?: string;
  rewardApplied?: boolean;
}

export interface NoteRecord {
  id: string;
  scope: NoteScope;
  ownerId?: string;
  title: string;
  content: string;
  sketch?: string;
  relatedTemplateId?: string;
  createdAt: number;
  updatedAt: number;
}

interface UpdateUserDraft {
  login?: string;
  password?: string;
}

interface CreateLeadInput {
  name?: string;
  phone?: string;
  email?: string;
  comment?: string;
  source: LeadSource;
}

interface SubmitDocumentReviewInput {
  templateId: string;
  templateName: string;
  comment?: string;
  file: Blob;
  fileName: string;
  mimeType?: string;
  submitMode?: DocumentReviewSubmitMode;
  snapshotValues?: DocumentReviewSnapshotValues;
  previewSource?: DocumentReviewPreviewSource;
}

interface UpdateDocumentReviewInput {
  reviewId: string;
  status: DocumentReviewStatus;
  adminComment?: string;
  awardedPoints?: number;
  awardedReason?: string;
}

interface CreateNoteInput {
  scope: NoteScope;
  ownerId?: string;
  title: string;
  content?: string;
  sketch?: string;
  relatedTemplateId?: string;
}

interface UpdateNoteInput {
  title?: string;
  content?: string;
  sketch?: string;
}

interface OperationsContextValue {
  clientId: string;
  userMeta: Record<string, UserAccountMeta>;
  siteLeads: SiteLead[];
  visitorEvents: VisitorEvent[];
  activityLog: ActivityLogEntry[];
  documentReviews: DocumentReviewRecord[];
  notes: NoteRecord[];
  isUserBlocked: (role: ManagedUserRole, userId: string) => boolean;
  updateEmployeeAccount: (employeeId: string, draft: UpdateUserDraft) => Promise<void>;
  updateAdminAccount: (adminId: string, draft: UpdateUserDraft) => Promise<void>;
  resetUserPassword: (role: ManagedUserRole, userId: string, nextPassword?: string) => Promise<string>;
  setUserBlocked: (role: ManagedUserRole, userId: string, blocked: boolean) => void;
  createLead: (input: CreateLeadInput) => void;
  updateLeadStatus: (leadId: string, status: LeadStatus) => void;
  trackVisitorEvent: (type: VisitorEvent['type'], path?: string) => void;
  recordActivity: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp' | 'clientId'> & { timestamp?: number }) => void;
  submitDocumentReview: (input: SubmitDocumentReviewInput) => Promise<void>;
  updateDocumentReview: (input: UpdateDocumentReviewInput) => Promise<void>;
  getDocumentReviewObjectUrl: (storageId: string) => Promise<string | null>;
  getDocumentReviewBlob: (storageId: string) => Promise<Blob | null>;
  addNote: (input: CreateNoteInput) => void;
  updateNote: (noteId: string, input: UpdateNoteInput) => void;
  deleteNote: (noteId: string) => void;
}

const USER_META_KEY = 'zan-qdm-user-meta-v1';
const LEADS_KEY = 'zan-qdm-site-leads-v1';
const VISITOR_EVENTS_KEY = 'zan-qdm-visitor-events-v1';
const ACTIVITY_LOG_KEY = 'zan-qdm-activity-log-v1';
const DOCUMENT_REVIEWS_KEY = 'zan-qdm-document-reviews-v1';
const NOTES_KEY = 'zan-qdm-notes-v1';
const CLIENT_ID_KEY = 'zan-qdm-client-id-v1';
const MAX_LEADS = 1200;
const MAX_VISITOR_EVENTS = 4000;
const MAX_ACTIVITY_LOG = 3000;
const MAX_NOTES = 800;
const MAX_DOCUMENT_REVIEW_FILE_BYTES = 20 * 1024 * 1024;

const OperationsContext = createContext<OperationsContextValue | undefined>(undefined);

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function persistStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSnapshotValues(value: unknown): DocumentReviewSnapshotValues | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const next: DocumentReviewSnapshotValues = {};

  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    const normalizedKey = normalizeText(key);
    if (!normalizedKey) return;

    if (typeof entry === 'string') {
      next[normalizedKey] = entry;
      return;
    }

    if (Array.isArray(entry)) {
      const normalizedItems = entry.filter((item): item is string => typeof item === 'string');
      if (normalizedItems.length > 0) {
        next[normalizedKey] = normalizedItems;
      }
    }
  });

  return Object.keys(next).length > 0 ? next : undefined;
}

function normalizePreviewSource(value: unknown): DocumentReviewPreviewSource | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const source = value as Partial<DocumentReviewPreviewSource>;
  if (source.source !== 'current-preview') return undefined;

  return {
    source: 'current-preview',
    editableMode: normalizeText(source.editableMode) || undefined,
    generatedAt: Number.isFinite(Number(source.generatedAt)) ? Number(source.generatedAt) : Date.now(),
  };
}

function normalizeDocumentReviewStatus(value: unknown): DocumentReviewStatus | null {
  switch (value) {
    case 'new':
    case 'in_review':
    case 'approved':
    case 'rejected':
    case 'changes_requested':
      return value;
    case 'pending':
      return 'new';
    case 'accepted':
      return 'approved';
    default:
      return null;
  }
}

function userMetaKey(role: ManagedUserRole, userId: string) {
  return `${role}:${userId}`;
}

function createClientId() {
  return `client-${createId()}`;
}

function loadClientId() {
  if (typeof window === 'undefined') {
    return createClientId();
  }

  const saved = window.localStorage.getItem(CLIENT_ID_KEY);
  if (saved) return saved;

  const next = createClientId();
  window.localStorage.setItem(CLIENT_ID_KEY, next);
  return next;
}

function normalizeUserMeta(raw: unknown) {
  if (!raw || typeof raw !== 'object') return {} as Record<string, UserAccountMeta>;
  const source = raw as Record<string, Partial<UserAccountMeta>>;
  const next: Record<string, UserAccountMeta> = {};

  Object.entries(source).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') return;
    if (value.role !== 'admin' && value.role !== 'employee') return;
    const id = normalizeText(value.id);
    if (!id) return;
    next[key] = {
      id,
      role: value.role,
      blocked: Boolean(value.blocked),
      lastLoginAt: Number.isFinite(Number(value.lastLoginAt)) ? Number(value.lastLoginAt) : undefined,
      lastLogoutAt: Number.isFinite(Number(value.lastLogoutAt)) ? Number(value.lastLogoutAt) : undefined,
      lastClientId: normalizeText(value.lastClientId) || undefined,
    };
  });

  return next;
}

function normalizeLeads(raw: unknown) {
  if (!Array.isArray(raw)) return [] as SiteLead[];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const source = item as Partial<SiteLead>;
      const sourceType = source.source;
      if (
        sourceType !== 'consultation-button' &&
        sourceType !== 'contact-form' &&
        sourceType !== 'whatsapp' &&
        sourceType !== 'telegram' &&
        sourceType !== 'qr-whatsapp' &&
        sourceType !== 'qr-telegram'
      ) {
        return null;
      }

      const status = source.status;
      if (status !== 'new' && status !== 'in_progress' && status !== 'contacted' && status !== 'closed') {
        return null;
      }

      return {
        id: normalizeText(source.id) || createId(),
        name: normalizeText(source.name),
        phone: normalizeText(source.phone),
        email: normalizeText(source.email),
        comment: normalizeText(source.comment),
        source: sourceType,
        createdAt: Number.isFinite(Number(source.createdAt)) ? Number(source.createdAt) : Date.now(),
        status,
        clientId: normalizeText(source.clientId) || 'unknown-client',
      } satisfies SiteLead;
    })
    .filter((item): item is SiteLead => Boolean(item))
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, MAX_LEADS);
}

function normalizeVisitorEvents(raw: unknown) {
  if (!Array.isArray(raw)) return [] as VisitorEvent[];
  const allowed = new Set<VisitorEvent['type']>(['page_view', 'consultation', 'lead', 'whatsapp', 'telegram', 'qr_whatsapp', 'qr_telegram']);

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const source = item as Partial<VisitorEvent>;
      if (!allowed.has(source.type as VisitorEvent['type'])) return null;
      return {
        id: normalizeText(source.id) || createId(),
        type: source.type as VisitorEvent['type'],
        path: normalizeText(source.path) || undefined,
        timestamp: Number.isFinite(Number(source.timestamp)) ? Number(source.timestamp) : Date.now(),
        clientId: normalizeText(source.clientId) || 'unknown-client',
      } satisfies VisitorEvent;
    })
    .filter((item): item is VisitorEvent => Boolean(item))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, MAX_VISITOR_EVENTS);
}

function normalizeActivityLog(raw: unknown) {
  if (!Array.isArray(raw)) return [] as ActivityLogEntry[];
  const allowed = new Set<ActivityType>(['login', 'logout', 'templateDownload', 'documentSubmission', 'pointsChanged']);

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const source = item as Partial<ActivityLogEntry>;
      if (!allowed.has(source.type as ActivityType)) return null;
      const userName = normalizeText(source.userName);
      if (!userName) return null;
      return {
        id: normalizeText(source.id) || createId(),
        type: source.type as ActivityType,
        userId: normalizeText(source.userId) || undefined,
        userName,
        role: source.role === 'admin' || source.role === 'employee' ? source.role : undefined,
        clientId: normalizeText(source.clientId) || 'unknown-client',
        timestamp: Number.isFinite(Number(source.timestamp)) ? Number(source.timestamp) : Date.now(),
        details: normalizeText(source.details),
      } satisfies ActivityLogEntry;
    })
    .filter((item): item is ActivityLogEntry => Boolean(item))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, MAX_ACTIVITY_LOG);
}

function normalizeDocumentReviews(raw: unknown) {
  if (!Array.isArray(raw)) return [] as DocumentReviewRecord[];

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const source = item as Partial<DocumentReviewRecord>;
      const status = normalizeDocumentReviewStatus(source.status);
      if (!status) return null;
      const employeeId = normalizeText(source.employeeId);
      const templateId = normalizeText(source.templateId);
      const storageId = normalizeText(source.storageId);
      if (!employeeId || !templateId || !storageId) return null;

      return {
        id: normalizeText(source.id) || createId(),
        employeeId,
        employeeName: normalizeText(source.employeeName) || 'Employee',
        employeeLogin: normalizeText(source.employeeLogin) || undefined,
        templateId,
        templateName: normalizeText(source.templateName) || 'Template',
        submitMode: source.submitMode === 'preview' ? 'preview' : 'file',
        fileName: normalizeText(source.fileName) || 'document',
        fileSize: Number.isFinite(Number(source.fileSize)) ? Number(source.fileSize) : 0,
        mimeType: normalizeText(source.mimeType) || 'application/octet-stream',
        storageId,
        comment: normalizeText(source.comment),
        submittedAt: Number.isFinite(Number(source.submittedAt)) ? Number(source.submittedAt) : Date.now(),
        status,
        snapshotValues: normalizeSnapshotValues(source.snapshotValues),
        previewSource: normalizePreviewSource(source.previewSource),
        reviewedAt: Number.isFinite(Number(source.reviewedAt))
          ? Number(source.reviewedAt)
          : Number.isFinite(Number(source.decisionAt))
            ? Number(source.decisionAt)
            : undefined,
        reviewedByAdminId: normalizeText(source.reviewedByAdminId) || normalizeText(source.adminId) || undefined,
        reviewedByAdminName:
          normalizeText(source.reviewedByAdminName) || normalizeText(source.adminName) || undefined,
        adminId: normalizeText(source.adminId) || undefined,
        adminName: normalizeText(source.adminName) || undefined,
        adminComment: normalizeText(source.adminComment) || undefined,
        decisionAt: Number.isFinite(Number(source.decisionAt)) ? Number(source.decisionAt) : undefined,
        awardedPoints: Number.isFinite(Number(source.awardedPoints)) ? Number(source.awardedPoints) : undefined,
        awardedReason: normalizeText(source.awardedReason) || undefined,
        rewardApplied: Boolean(source.rewardApplied) || Number(source.awardedPoints) > 0,
      } satisfies DocumentReviewRecord;
    })
    .filter((item): item is DocumentReviewRecord => Boolean(item))
    .sort((left, right) => right.submittedAt - left.submittedAt);
}

function normalizeNotes(raw: unknown) {
  if (!Array.isArray(raw)) return [] as NoteRecord[];
  const scopes = new Set<NoteScope>(['admin', 'employee', 'document']);

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const source = item as Partial<NoteRecord>;
      if (!scopes.has(source.scope as NoteScope)) return null;
      return {
        id: normalizeText(source.id) || createId(),
        scope: source.scope as NoteScope,
        ownerId: normalizeText(source.ownerId) || undefined,
        title: normalizeText(source.title) || '\u0417\u0430\u043c\u0435\u0442\u043a\u0430',
        content: normalizeText(source.content),
        sketch: normalizeText(source.sketch) || undefined,
        relatedTemplateId: normalizeText(source.relatedTemplateId) || undefined,
        createdAt: Number.isFinite(Number(source.createdAt)) ? Number(source.createdAt) : Date.now(),
        updatedAt: Number.isFinite(Number(source.updatedAt)) ? Number(source.updatedAt) : Date.now(),
      } satisfies NoteRecord;
    })
    .filter((item): item is NoteRecord => Boolean(item))
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_NOTES);
}

function makeUserKey(user: Pick<CurrentUser, 'role' | 'id'>) {
  return userMetaKey(user.role, user.id);
}

function findEmployee(employees: Employee[], employeeId: string) {
  return employees.find((employee) => employee.id === employeeId) || null;
}

function findAdmin(admins: Admin[], adminId: string) {
  return admins.find((admin) => admin.id === adminId) || null;
}

export function OperationsProvider({ children }: { children: ReactNode }) {
  const { employees, admins, currentUser, authReady, pointsHistory, handleAddPoints, handleUpdateEmployee, setAdmins } = useApp();
  const { templateUsageLog } = useDocumentTemplates();
  const clientId = useMemo(() => loadClientId(), []);
  const apiPersistenceEnabled = isApiPersistenceEnabled();

  const [userMeta, setUserMeta] = useState<Record<string, UserAccountMeta>>(() =>
    apiPersistenceEnabled ? {} : normalizeUserMeta(parseStorage(USER_META_KEY, {}))
  );
  const [siteLeads, setSiteLeads] = useState<SiteLead[]>(() =>
    apiPersistenceEnabled ? [] : normalizeLeads(parseStorage(LEADS_KEY, []))
  );
  const [visitorEvents, setVisitorEvents] = useState<VisitorEvent[]>(() =>
    apiPersistenceEnabled ? [] : normalizeVisitorEvents(parseStorage(VISITOR_EVENTS_KEY, []))
  );
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(() =>
    apiPersistenceEnabled ? [] : normalizeActivityLog(parseStorage(ACTIVITY_LOG_KEY, []))
  );
  const [documentReviews, setDocumentReviews] = useState<DocumentReviewRecord[]>(() =>
    apiPersistenceEnabled ? [] : normalizeDocumentReviews(parseStorage(DOCUMENT_REVIEWS_KEY, []))
  );
  const [notes, setNotes] = useState<NoteRecord[]>(() =>
    apiPersistenceEnabled ? [] : normalizeNotes(parseStorage(NOTES_KEY, []))
  );
  const [remoteStateReady, setRemoteStateReady] = useState(() => !apiPersistenceEnabled);

  const previousUserRef = useRef<CurrentUser | null>(currentUser);
  const knownPointsIdsRef = useRef<Set<string>>(new Set(pointsHistory.map((entry) => entry.id)));
  const knownTemplateUsageIdsRef = useRef<Set<string>>(new Set(templateUsageLog.map((entry) => entry.id)));

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    persistStorage(USER_META_KEY, userMeta);
  }, [apiPersistenceEnabled, remoteStateReady, userMeta]);

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    persistStorage(LEADS_KEY, siteLeads);
  }, [apiPersistenceEnabled, remoteStateReady, siteLeads]);

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    persistStorage(VISITOR_EVENTS_KEY, visitorEvents);
  }, [apiPersistenceEnabled, remoteStateReady, visitorEvents]);

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    persistStorage(ACTIVITY_LOG_KEY, activityLog);
  }, [activityLog, apiPersistenceEnabled, remoteStateReady]);

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    persistStorage(DOCUMENT_REVIEWS_KEY, documentReviews);
  }, [apiPersistenceEnabled, documentReviews, remoteStateReady]);

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    persistStorage(NOTES_KEY, notes);
  }, [apiPersistenceEnabled, notes, remoteStateReady]);

  useEffect(() => {
    if (!apiPersistenceEnabled) {
      setRemoteStateReady(true);
      return;
    }

    let cancelled = false;
    let remoteLoaded = false;

    const loadRemoteOperations = async () => {
      try {
        const bootstrap = await loadBootstrapCache();
        if (cancelled) return;
        setUserMeta(normalizeUserMeta(bootstrap.operations.userMeta));
        setSiteLeads(normalizeLeads(bootstrap.operations.siteLeads));
        setVisitorEvents(normalizeVisitorEvents(bootstrap.operations.visitorEvents));
        setActivityLog(normalizeActivityLog(bootstrap.operations.activityLog));
        setDocumentReviews(normalizeDocumentReviews(bootstrap.operations.documentReviews));
        setNotes(normalizeNotes(bootstrap.operations.notes));
        remoteLoaded = true;
      } catch {
        // keep local fallback
      } finally {
        if (!cancelled) {
          setRemoteStateReady(remoteLoaded);
        }
      }
    };

    void loadRemoteOperations();

    return () => {
      cancelled = true;
    };
  }, [apiPersistenceEnabled]);

  useEffect(() => {
    if (!apiPersistenceEnabled || !remoteStateReady || !authReady || !currentUser) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveOperationsStateApi({
        userMeta,
        siteLeads,
        visitorEvents,
        activityLog,
        documentReviews,
        notes,
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [activityLog, apiPersistenceEnabled, authReady, currentUser, documentReviews, notes, remoteStateReady, siteLeads, userMeta, visitorEvents]);

  useEffect(() => {
    setUserMeta((previous) => {
      const activeKeys = new Set<string>([
        ...employees.map((employee) => userMetaKey('employee', employee.id)),
        ...admins.map((admin) => userMetaKey('admin', admin.id)),
      ]);

      const next = Object.fromEntries(Object.entries(previous).filter(([key]) => activeKeys.has(key)));

      employees.forEach((employee) => {
        const key = userMetaKey('employee', employee.id);
        if (!next[key]) {
          next[key] = { id: employee.id, role: 'employee', blocked: false };
        }
      });

      admins.forEach((admin) => {
        const key = userMetaKey('admin', admin.id);
        if (!next[key]) {
          next[key] = { id: admin.id, role: 'admin', blocked: false };
        }
      });

      return next;
    });
  }, [employees, admins]);

  const recordActivity = useCallback(
    (entry: Omit<ActivityLogEntry, 'id' | 'timestamp' | 'clientId'> & { timestamp?: number }) => {
      setActivityLog((previous) => [
        {
          id: createId(),
          type: entry.type,
          userId: entry.userId,
          userName: entry.userName,
          role: entry.role,
          clientId,
          timestamp: entry.timestamp ?? Date.now(),
          details: entry.details,
        },
        ...previous,
      ].slice(0, MAX_ACTIVITY_LOG));
    },
    [clientId]
  );

  useEffect(() => {
    const previousUser = previousUserRef.current;
    if (!previousUser && currentUser) {
      const key = makeUserKey(currentUser);
      setUserMeta((previous) => ({
        ...previous,
        [key]: {
          ...(previous[key] || { id: currentUser.id, role: currentUser.role, blocked: false }),
          id: currentUser.id,
          role: currentUser.role,
          blocked: previous[key]?.blocked || false,
          lastLoginAt: Date.now(),
          lastClientId: clientId,
          lastLogoutAt: previous[key]?.lastLogoutAt,
        },
      }));

      recordActivity({
        type: 'login',
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        details: `\u0412\u0445\u043e\u0434 \u0432 \u0441\u0438\u0441\u0442\u0435\u043c\u0443 (${currentUser.login || '\u0431\u0435\u0437 \u043b\u043e\u0433\u0438\u043d\u0430'})`,
      });
    }

    if (previousUser && !currentUser) {
      const key = makeUserKey(previousUser);
      setUserMeta((previous) => ({
        ...previous,
        [key]: {
          ...(previous[key] || { id: previousUser.id, role: previousUser.role, blocked: false }),
          id: previousUser.id,
          role: previousUser.role,
          blocked: previous[key]?.blocked || false,
          lastLoginAt: previous[key]?.lastLoginAt,
          lastLogoutAt: Date.now(),
          lastClientId: clientId,
        },
      }));

      recordActivity({
        type: 'logout',
        userId: previousUser.id,
        userName: previousUser.name,
        role: previousUser.role,
        details: '\u0412\u044b\u0445\u043e\u0434 \u0438\u0437 \u0441\u0438\u0441\u0442\u0435\u043c\u044b',
      });
    }

    previousUserRef.current = currentUser;
  }, [clientId, currentUser, recordActivity]);

  const isUserBlocked = useCallback(
    (role: ManagedUserRole, userId: string) => Boolean(userMeta[userMetaKey(role, userId)]?.blocked),
    [userMeta]
  );

  const setUserBlocked = useCallback((role: ManagedUserRole, userId: string, blocked: boolean) => {
    setUserMeta((previous) => ({
      ...previous,
      [userMetaKey(role, userId)]: {
        ...(previous[userMetaKey(role, userId)] || { id: userId, role, blocked: false }),
        id: userId,
        role,
        blocked,
        lastLoginAt: previous[userMetaKey(role, userId)]?.lastLoginAt,
        lastLogoutAt: previous[userMetaKey(role, userId)]?.lastLogoutAt,
        lastClientId: previous[userMetaKey(role, userId)]?.lastClientId,
      },
    }));
  }, []);

  const updateEmployeeAccount = useCallback(
    async (employeeId: string, draft: UpdateUserDraft) => {
      const employee = findEmployee(employees, employeeId);
      if (!employee) {
        throw new Error('\u0421\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.');
      }

      const requestedLogin = normalizeText(draft.login).toLowerCase() || employee.login;
      const loginTaken = employees.some((candidate) => candidate.id !== employeeId && candidate.login.toLowerCase() === requestedLogin);
      if (loginTaken) {
        throw new Error('\u0422\u0430\u043a\u043e\u0439 \u043b\u043e\u0433\u0438\u043d \u0443\u0436\u0435 \u0437\u0430\u043d\u044f\u0442 \u0434\u0440\u0443\u0433\u0438\u043c \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u043e\u043c.');
      }

      await handleUpdateEmployee(
        employee.id,
        employee.name,
        employee.avatar,
        employee.salary,
        requestedLogin,
        normalizeText(draft.password) || undefined
      );
    },
    [employees, handleUpdateEmployee]
  );

  const updateAdminAccount = useCallback(
    async (adminId: string, draft: UpdateUserDraft) => {
      const admin = findAdmin(admins, adminId);
      if (!admin) {
        throw new Error('\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.');
      }

      const requestedLogin = normalizeText(draft.login).toLowerCase() || admin.login;
      const loginTaken = admins.some((candidate) => candidate.id !== adminId && candidate.login.toLowerCase() === requestedLogin);
      if (loginTaken) {
        throw new Error('\u0422\u0430\u043a\u043e\u0439 \u043b\u043e\u0433\u0438\u043d \u0443\u0436\u0435 \u0437\u0430\u043d\u044f\u0442 \u0434\u0440\u0443\u0433\u0438\u043c \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u043e\u043c.');
      }

      const passwordSecret = await resolvePasswordUpdate(admin, normalizeText(draft.password) || undefined);

      setAdmins((previous) => previous.map((candidate) => (
        candidate.id === adminId
          ? {
              ...candidate,
              login: requestedLogin,
              ...passwordSecret,
            }
          : candidate
      )));
    },
    [admins, setAdmins]
  );

  const resetUserPassword = useCallback(
    async (role: ManagedUserRole, userId: string, nextPassword = '1234') => {
      if (role === 'employee') {
        await updateEmployeeAccount(userId, { password: nextPassword });
      } else {
        await updateAdminAccount(userId, { password: nextPassword });
      }

      return nextPassword;
    },
    [updateAdminAccount, updateEmployeeAccount]
  );

  const trackVisitorEvent = useCallback(
    (type: VisitorEvent['type'], path?: string) => {
      const nextEvent = {
        id: createId(),
        type,
        path,
        timestamp: Date.now(),
        clientId,
      };

      setVisitorEvents((previous) => [nextEvent, ...previous].slice(0, MAX_VISITOR_EVENTS));

      if (apiPersistenceEnabled) {
        void createVisitorEventApi(nextEvent).catch(() => undefined);
      }
    },
    [apiPersistenceEnabled, clientId]
  );

  const createLead = useCallback(
    (input: CreateLeadInput) => {
      const normalizedLead: SiteLead = {
        id: createId(),
        name: normalizeText(input.name),
        phone: normalizeText(input.phone),
        email: normalizeText(input.email),
        comment: normalizeText(input.comment),
        source: input.source,
        createdAt: Date.now(),
        status: 'new',
        clientId,
      };

      setSiteLeads((previous) => [normalizedLead, ...previous].slice(0, MAX_LEADS));
      if (apiPersistenceEnabled) {
        void createPublicLeadApi(normalizedLead).catch(() => undefined);
      }
      trackVisitorEvent('lead');

      if (input.source === 'whatsapp') trackVisitorEvent('whatsapp');
      if (input.source === 'telegram') trackVisitorEvent('telegram');
      if (input.source === 'qr-whatsapp') trackVisitorEvent('qr_whatsapp');
      if (input.source === 'qr-telegram') trackVisitorEvent('qr_telegram');
      if (input.source === 'consultation-button') trackVisitorEvent('consultation');
    },
    [apiPersistenceEnabled, clientId, trackVisitorEvent]
  );

  const updateLeadStatus = useCallback((leadId: string, status: LeadStatus) => {
    setSiteLeads((previous) => previous.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)));
  }, []);

  useEffect(() => {
    const knownIds = knownPointsIdsRef.current;
    const freshEntries = pointsHistory.filter((entry) => !knownIds.has(entry.id));
    if (freshEntries.length > 0) {
      freshEntries.forEach((entry) => {
        recordActivity({
          type: 'pointsChanged',
          userId: entry.adminId,
          userName: entry.adminName,
          role: 'admin',
          timestamp: new Date(entry.timestamp).getTime(),
          details: `${entry.adminName} \u0438\u0437\u043c\u0435\u043d\u0438\u043b \u0431\u0430\u043b\u043b\u044b \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0430 ${entry.employeeName}: ${entry.points > 0 ? '+' : ''}${entry.points}${entry.reason ? ` (${entry.reason})` : ''}`,
        });
      });
    }

    knownPointsIdsRef.current = new Set(pointsHistory.map((entry) => entry.id));
  }, [pointsHistory, recordActivity]);

  useEffect(() => {
    const known = knownTemplateUsageIdsRef.current;
    const nextKnown = new Set(known);
    const freshDownloads = templateUsageLog.filter((entry) => !known.has(entry.id) && entry.action === 'download');

    freshDownloads.forEach((entry) => {
      recordActivity({
        type: 'templateDownload',
        userId: entry.employeeId,
        userName: entry.employeeName,
        role: 'employee',
        timestamp: entry.timestamp,
        details: `\u0421\u043a\u0430\u0447\u0430\u043d \u0448\u0430\u0431\u043b\u043e\u043d «${entry.templateName}»`,
      });
    });

    templateUsageLog.forEach((entry) => nextKnown.add(entry.id));
    knownTemplateUsageIdsRef.current = nextKnown;
  }, [recordActivity, templateUsageLog]);

  const submitDocumentReview = useCallback(
    async (input: SubmitDocumentReviewInput) => {
      if (!currentUser || currentUser.role !== 'employee') {
        throw new Error('\u0422\u043e\u043b\u044c\u043a\u043e \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a \u043c\u043e\u0436\u0435\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443.');
      }

      if (input.file.size > MAX_DOCUMENT_REVIEW_FILE_BYTES) {
        throw new Error('\u0424\u0430\u0439\u043b \u043f\u0440\u0435\u0432\u044b\u0448\u0430\u0435\u0442 \u043b\u0438\u043c\u0438\u0442 20 \u041c\u0411.');
      }

      const storageId = `review-file-${createId()}`;
      await saveDocumentReviewBlob(storageId, input.file);

      const nextReview: DocumentReviewRecord = {
        id: createId(),
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        employeeLogin: currentUser.login,
        templateId: input.templateId,
        templateName: input.templateName,
        submitMode: input.submitMode === 'preview' ? 'preview' : 'file',
        fileName: normalizeText(input.fileName) || 'document',
        fileSize: input.file.size,
        mimeType: normalizeText(input.mimeType) || input.file.type || 'application/octet-stream',
        storageId,
        comment: normalizeText(input.comment),
        submittedAt: Date.now(),
        status: 'new',
        snapshotValues: normalizeSnapshotValues(input.snapshotValues),
        previewSource: normalizePreviewSource(input.previewSource),
        rewardApplied: false,
      };

      setDocumentReviews((previous) => [nextReview, ...previous]);
      recordActivity({
        type: 'documentSubmission',
        userId: currentUser.id,
        userName: currentUser.name,
        role: 'employee',
        details: `\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 «${input.templateName}» \u043d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443`,
      });
    },
    [currentUser, recordActivity]
  );

  const updateDocumentReview = useCallback(
    async (input: UpdateDocumentReviewInput) => {
      const review = documentReviews.find((item) => item.id === input.reviewId);
      if (!review) {
        throw new Error('\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.');
      }

      const nextStatus = normalizeDocumentReviewStatus(input.status);
      if (!nextStatus) {
        throw new Error('\u041f\u0435\u0440\u0435\u0434\u0430\u043d \u043d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438.');
      }

      const normalizedPoints = Number.isFinite(Number(input.awardedPoints)) ? Math.max(0, Math.trunc(Number(input.awardedPoints))) : 0;
      const normalizedAdminComment = normalizeText(input.adminComment) || undefined;
      const normalizedAwardedReason = normalizeText(input.awardedReason) || undefined;
      const shouldApplyReward =
        nextStatus === 'approved' && normalizedPoints > 0 && !review.rewardApplied;
      const reviewedAt = Date.now();

      setDocumentReviews((previous) => previous.map((item) => (
        item.id === input.reviewId
          ? {
              ...item,
              status: nextStatus,
              reviewedByAdminId: currentUser?.id,
              reviewedByAdminName: currentUser?.name,
              reviewedAt,
              adminId: currentUser?.id,
              adminName: currentUser?.name,
              adminComment: normalizedAdminComment,
              decisionAt: reviewedAt,
              awardedPoints: shouldApplyReward ? normalizedPoints : item.awardedPoints,
              awardedReason: shouldApplyReward ? normalizedAwardedReason : item.awardedReason,
              rewardApplied: item.rewardApplied || shouldApplyReward,
            }
          : item
      )));

      if (shouldApplyReward && currentUser && currentUser.role === 'admin') {
        handleAddPoints(
          review.employeeId,
          normalizedPoints,
          { id: currentUser.id, name: currentUser.name, login: currentUser.login },
          normalizedAwardedReason || `\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430: ${review.templateName}`
        );
      }
    },
    [currentUser, documentReviews, handleAddPoints]
  );

  const addNote = useCallback((input: CreateNoteInput) => {
    const title = normalizeText(input.title) || '\u0417\u0430\u043c\u0435\u0442\u043a\u0430';
    const note: NoteRecord = {
      id: createId(),
      scope: input.scope,
      ownerId: normalizeText(input.ownerId) || undefined,
      title,
      content: normalizeText(input.content),
      sketch: normalizeText(input.sketch) || undefined,
      relatedTemplateId: normalizeText(input.relatedTemplateId) || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setNotes((previous) => [note, ...previous].slice(0, MAX_NOTES));
  }, []);

  const updateNote = useCallback((noteId: string, input: UpdateNoteInput) => {
    setNotes((previous) => previous.map((note) => (
      note.id === noteId
        ? {
            ...note,
            title: normalizeText(input.title) || note.title,
            content: input.content !== undefined ? normalizeText(input.content) : note.content,
            sketch: input.sketch !== undefined ? normalizeText(input.sketch) || undefined : note.sketch,
            updatedAt: Date.now(),
          }
        : note
    )));
  }, []);

  const deleteNote = useCallback((noteId: string) => {
    setNotes((previous) => previous.filter((note) => note.id !== noteId));
  }, []);

  const value = useMemo<OperationsContextValue>(() => ({
    clientId,
    userMeta,
    siteLeads,
    visitorEvents,
    activityLog,
    documentReviews,
    notes,
    isUserBlocked,
    updateEmployeeAccount,
    updateAdminAccount,
    resetUserPassword,
    setUserBlocked,
    createLead,
    updateLeadStatus,
    trackVisitorEvent,
    recordActivity,
    submitDocumentReview,
    updateDocumentReview,
    getDocumentReviewObjectUrl: loadDocumentReviewObjectUrl,
    getDocumentReviewBlob: loadDocumentReviewBlob,
    addNote,
    updateNote,
    deleteNote,
  }), [
    activityLog,
    addNote,
    clientId,
    createLead,
    deleteNote,
    documentReviews,
    isUserBlocked,
    notes,
    recordActivity,
    resetUserPassword,
    setUserBlocked,
    siteLeads,
    submitDocumentReview,
    trackVisitorEvent,
    updateAdminAccount,
    updateDocumentReview,
    updateEmployeeAccount,
    updateLeadStatus,
    updateNote,
    userMeta,
    visitorEvents,
  ]);

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error('useOperations must be used within OperationsProvider');
  }

  return context;
}
