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
import { useApp } from '../../context/AppContext';
import { isApiPersistenceEnabled } from '../../services/api-client';
import { loadBootstrapCache } from '../../services/bootstrap-cache';
import { saveTemplateStateApi } from '../../services/server-api';
import { createBuiltinTemplates } from './templateLibrary';
import { deleteTemplateBlob, loadTemplateArrayBuffer, saveTemplateBlob } from './templateBlobStorage';
import type {
  AddTemplateResult,
  DocumentTemplateMeta,
  TemplateAccessMap,
  TemplateUsageAction,
  TemplateUsageLogEntry,
} from './types';

const TEMPLATE_META_KEY = 'law-firm-doc-template-meta';
const TEMPLATE_ACCESS_KEY = 'law-firm-doc-template-access';
const TEMPLATE_USAGE_KEY = 'law-firm-doc-template-usage';

const TEMPLATE_MAX_FILE_BYTES = 20 * 1024 * 1024;
const TEMPLATE_USER_LIMIT = 100;
const TEMPLATE_LOG_MAX_SIZE = 2000;

interface DocumentTemplatesContextType {
  templates: DocumentTemplateMeta[];
  templateAccess: TemplateAccessMap;
  templateUsageLog: TemplateUsageLogEntry[];
  addUserTemplateFromFile: (file: File) => Promise<AddTemplateResult>;
  replaceUserTemplateFile: (templateId: string, file: File) => Promise<void>;
  removeTemplate: (templateId: string) => Promise<void>;
  renameTemplate: (templateId: string, title: string) => void;
  setTemplateEnabled: (templateId: string, enabled: boolean) => void;
  setEmployeeTemplateAccess: (employeeId: string, templateId: string, allowed: boolean) => void;
  setEmployeeTemplateIds: (employeeId: string, templateIds: string[]) => void;
  grantTemplateToAllEmployees: (templateId: string, allowed: boolean) => void;
  getTemplatesForAdmin: () => DocumentTemplateMeta[];
  getTemplatesForEmployee: (employeeId: string) => DocumentTemplateMeta[];
  hasTemplateAccess: (employeeId: string, templateId: string) => boolean;
  readTemplateSource: (templateId: string) => Promise<ArrayBuffer>;
  logTemplateUsage: (
    entry: Omit<TemplateUsageLogEntry, 'id' | 'timestamp'> & { timestamp?: number }
  ) => void;
  clearTemplateUsageLog: () => void;
}

const DocumentTemplatesContext = createContext<DocumentTemplatesContextType | undefined>(undefined);

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseStorage<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toUniqueIds(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeTemplateMeta(raw: unknown): DocumentTemplateMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Partial<DocumentTemplateMeta>;

  const id = normalizeString(source.id);
  const title = normalizeString(source.title);
  const fileName = normalizeString(source.fileName);
  const sourceKind = source.sourceKind === 'user' ? 'user' : source.sourceKind === 'builtin' ? 'builtin' : null;
  const editableMode =
    source.editableMode === 'markers' ? 'markers' : source.editableMode === 'gray' ? 'gray' : null;
  if (!id || !title || !fileName || !sourceKind || !editableMode) return null;

  return {
    id,
    title,
    category: normalizeString(source.category) || undefined,
    description: normalizeString(source.description) || undefined,
    fileName,
    sourceKind,
    editableMode,
    sourceFileName: normalizeString(source.sourceFileName) || undefined,
    storageId: normalizeString(source.storageId) || undefined,
    enabled: source.enabled ?? true,
    createdAt: Number.isFinite(Number(source.createdAt)) ? Number(source.createdAt) : Date.now(),
    updatedAt: Number.isFinite(Number(source.updatedAt)) ? Number(source.updatedAt) : Date.now(),
  };
}

function loadTemplatesFromStorage(): DocumentTemplateMeta[] {
  const builtinTemplates = createBuiltinTemplates();
  const builtinById = new Map(builtinTemplates.map((item) => [item.id, item]));
  const saved = parseStorage<unknown[]>(TEMPLATE_META_KEY, []);
  if (!Array.isArray(saved) || saved.length === 0) {
    return builtinTemplates;
  }

  const normalized = saved
    .map((item) => normalizeTemplateMeta(item))
    .filter((item): item is DocumentTemplateMeta => Boolean(item));

  const savedById = new Map(normalized.map((item) => [item.id, item]));
  const mergedBuiltins = builtinTemplates.map((builtin) => {
    const savedBuiltin = savedById.get(builtin.id);
    if (!savedBuiltin || savedBuiltin.sourceKind !== 'builtin') return builtin;
    return {
      ...builtin,
      enabled: savedBuiltin.enabled,
      updatedAt: savedBuiltin.updatedAt || builtin.updatedAt,
    };
  });

  const userTemplates = normalized
    .filter((item) => item.sourceKind === 'user')
    .sort((left, right) => left.createdAt - right.createdAt);

  return [...mergedBuiltins, ...userTemplates];
}

function normalizeTemplateAccessMap(raw: unknown): TemplateAccessMap {
  if (!raw || typeof raw !== 'object') return {};
  const source = raw as Record<string, unknown>;
  const next: TemplateAccessMap = {};

  Object.entries(source).forEach(([employeeId, value]) => {
    if (!Array.isArray(value)) return;
    next[employeeId] = toUniqueIds(value.map((id) => normalizeString(id)));
  });

  return next;
}

function normalizeTemplateUsageLog(raw: unknown): TemplateUsageLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const actions: TemplateUsageAction[] = ['open', 'fill', 'preview', 'download'];

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const source = item as Partial<TemplateUsageLogEntry>;
      const action = actions.includes(source.action as TemplateUsageAction)
        ? (source.action as TemplateUsageAction)
        : null;
      if (!action) return null;
      const id = normalizeString(source.id) || createId();
      const employeeId = normalizeString(source.employeeId);
      const employeeName = normalizeString(source.employeeName);
      const templateId = normalizeString(source.templateId);
      const templateName = normalizeString(source.templateName);
      const timestamp = Number(source.timestamp);

      if (!employeeId || !employeeName || !templateId || !templateName || !Number.isFinite(timestamp)) {
        return null;
      }

      return {
        id,
        employeeId,
        employeeName,
        templateId,
        templateName,
        action,
        timestamp,
      } satisfies TemplateUsageLogEntry;
    })
    .filter((item): item is TemplateUsageLogEntry => Boolean(item))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, TEMPLATE_LOG_MAX_SIZE);
}

function cloneBuffer(buffer: ArrayBuffer) {
  return buffer.slice(0);
}

function validateTemplateFile(file: File) {
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.docx')) {
    return '\u041c\u043e\u0436\u043d\u043e \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u0444\u0430\u0439\u043b\u044b .docx';
  }
  if (file.size <= 0) {
    return '\u0424\u0430\u0439\u043b \u043f\u0443\u0441\u0442\u043e\u0439.';
  }
  if (file.size > TEMPLATE_MAX_FILE_BYTES) {
    return '\u0420\u0430\u0437\u043c\u0435\u0440 \u0444\u0430\u0439\u043b\u0430 \u043f\u0440\u0435\u0432\u044b\u0448\u0430\u0435\u0442 20 \u041c\u0411.';
  }
  return null;
}

async function fetchBuiltinTemplateArrayBuffer(fileName: string) {
  const templateUrl = window.location.protocol === 'file:'
    ? new URL(`./templates/${fileName}`, window.location.href.split('#')[0])
    : new URL(`/templates/${fileName}`, window.location.origin);
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error(`\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0432\u0441\u0442\u0440\u043e\u0435\u043d\u043d\u044b\u0439 \u0448\u0430\u0431\u043b\u043e\u043d: ${fileName}`);
  }
  return response.arrayBuffer();
}

export function DocumentTemplatesProvider({ children }: { children: ReactNode }) {
  const { employees, currentUser, authReady } = useApp();
  const apiPersistenceEnabled = isApiPersistenceEnabled();
  const [templates, setTemplates] = useState<DocumentTemplateMeta[]>(() =>
    apiPersistenceEnabled ? createBuiltinTemplates() : loadTemplatesFromStorage()
  );
  const [templateAccess, setTemplateAccess] = useState<TemplateAccessMap>(() =>
    apiPersistenceEnabled ? {} : normalizeTemplateAccessMap(parseStorage(TEMPLATE_ACCESS_KEY, {}))
  );
  const [templateUsageLog, setTemplateUsageLog] = useState<TemplateUsageLogEntry[]>(() =>
    apiPersistenceEnabled ? [] : normalizeTemplateUsageLog(parseStorage(TEMPLATE_USAGE_KEY, []))
  );
  const [remoteStateReady, setRemoteStateReady] = useState(() => !apiPersistenceEnabled);

  const sourceCacheRef = useRef<Map<string, ArrayBuffer>>(new Map());

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    localStorage.setItem(TEMPLATE_META_KEY, JSON.stringify(templates));
  }, [apiPersistenceEnabled, remoteStateReady, templates]);

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    localStorage.setItem(TEMPLATE_ACCESS_KEY, JSON.stringify(templateAccess));
  }, [apiPersistenceEnabled, remoteStateReady, templateAccess]);

  useEffect(() => {
    if (apiPersistenceEnabled && !remoteStateReady) {
      return;
    }
    localStorage.setItem(TEMPLATE_USAGE_KEY, JSON.stringify(templateUsageLog));
  }, [apiPersistenceEnabled, remoteStateReady, templateUsageLog]);

  useEffect(() => {
    if (!apiPersistenceEnabled) {
      setRemoteStateReady(true);
      return;
    }

    let cancelled = false;
    let remoteLoaded = false;

    const loadRemoteTemplates = async () => {
      try {
        const bootstrap = await loadBootstrapCache();
        if (cancelled) return;
        setTemplates((previous) => {
          const remote = Array.isArray(bootstrap.templates.templates)
            ? bootstrap.templates.templates
                .map((item) => normalizeTemplateMeta(item))
                .filter((item): item is DocumentTemplateMeta => Boolean(item))
            : [];
          return remote.length > 0 ? remote : previous;
        });
        setTemplateAccess(normalizeTemplateAccessMap(bootstrap.templates.templateAccess));
        setTemplateUsageLog(normalizeTemplateUsageLog(bootstrap.templates.templateUsageLog));
        remoteLoaded = true;
      } catch {
        // keep local fallback
      } finally {
        if (!cancelled) {
          setRemoteStateReady(remoteLoaded);
        }
      }
    };

    void loadRemoteTemplates();

    return () => {
      cancelled = true;
    };
  }, [apiPersistenceEnabled]);

  useEffect(() => {
    if (!apiPersistenceEnabled || !remoteStateReady || !authReady || !currentUser) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveTemplateStateApi({
        templates,
        templateAccess,
        templateUsageLog,
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [apiPersistenceEnabled, authReady, currentUser, remoteStateReady, templateAccess, templateUsageLog, templates]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === TEMPLATE_META_KEY) {
        setTemplates(loadTemplatesFromStorage());
      }
      if (event.key === TEMPLATE_ACCESS_KEY) {
        setTemplateAccess(normalizeTemplateAccessMap(parseStorage(TEMPLATE_ACCESS_KEY, {})));
      }
      if (event.key === TEMPLATE_USAGE_KEY) {
        setTemplateUsageLog(normalizeTemplateUsageLog(parseStorage(TEMPLATE_USAGE_KEY, [])));
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    const templateIds = new Set(templates.map((template) => template.id));
    const enabledTemplateIds = templates.filter((template) => template.enabled).map((template) => template.id);

    setTemplateAccess((prev) => {
      const next: TemplateAccessMap = {};
      let changed = false;

      employees.forEach((employee) => {
        const existing = prev[employee.id];
        if (!existing) {
          next[employee.id] = [...enabledTemplateIds];
          changed = true;
          return;
        }

        const filtered = existing.filter((id) => templateIds.has(id));
        if (filtered.length !== existing.length) {
          changed = true;
        }
        next[employee.id] = toUniqueIds(filtered);
      });

      const prevKeys = Object.keys(prev);
      if (prevKeys.length !== Object.keys(next).length) {
        changed = true;
      } else if (!changed) {
        for (const key of prevKeys) {
          if (!(key in next)) {
            changed = true;
            break;
          }
        }
      }

      return changed ? next : prev;
    });
  }, [employees, templates]);

  const addUserTemplateFromFile = useCallback(async (file: File): Promise<AddTemplateResult> => {
    const validationError = validateTemplateFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const currentUserTemplates = templates.filter((template) => template.sourceKind === 'user');
    if (currentUserTemplates.length >= TEMPLATE_USER_LIMIT) {
      throw new Error(`\u041b\u0438\u043c\u0438\u0442 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u0441\u043a\u0438\u0445 \u0448\u0430\u0431\u043b\u043e\u043d\u043e\u0432: ${TEMPLATE_USER_LIMIT}`);
    }

    const storageId = `user-template-${createId()}`;
    await saveTemplateBlob(storageId, file);

    const now = Date.now();
    const title = file.name.replace(/\.docx$/i, '').trim() || `\u0428\u0430\u0431\u043b\u043e\u043d ${now}`;
    const template: DocumentTemplateMeta = {
      id: `doc-user-${createId()}`,
      title,
      category: '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u0441\u043a\u0438\u0435 \u0448\u0430\u0431\u043b\u043e\u043d\u044b',
      description: '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u0441\u043a\u0438\u0439 \u0448\u0430\u0431\u043b\u043e\u043d \u0432 \u0440\u0435\u0436\u0438\u043c\u0435 \u043c\u0430\u0440\u043a\u0435\u0440\u043e\u0432 {{field_name}}.',
      fileName: file.name,
      sourceKind: 'user',
      editableMode: 'markers',
      sourceFileName: file.name,
      storageId,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    setTemplates((prev) => [...prev, template]);
    sourceCacheRef.current.delete(template.id);

    return { template };
  }, [templates]);

  const replaceUserTemplateFile = useCallback(
    async (templateId: string, file: File) => {
      const validationError = validateTemplateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      const target = templates.find((template) => template.id === templateId);
      if (!target || target.sourceKind !== 'user' || !target.storageId) {
        throw new Error('\u0428\u0430\u0431\u043b\u043e\u043d \u0434\u043b\u044f \u0437\u0430\u043c\u0435\u043d\u044b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.');
      }

      await saveTemplateBlob(target.storageId, file);
      sourceCacheRef.current.delete(templateId);

      setTemplates((prev) =>
        prev.map((template) =>
          template.id === templateId
            ? {
                ...template,
                fileName: file.name,
                sourceFileName: file.name,
                updatedAt: Date.now(),
              }
            : template
        )
      );
    },
    [templates]
  );

  const removeTemplate = useCallback(
    async (templateId: string) => {
      const target = templates.find((template) => template.id === templateId);
      if (!target) return;

      if (target.sourceKind === 'builtin') {
        throw new Error('\u0412\u0441\u0442\u0440\u043e\u0435\u043d\u043d\u044b\u0435 \u0448\u0430\u0431\u043b\u043e\u043d\u044b \u043d\u0435\u043b\u044c\u0437\u044f \u0443\u0434\u0430\u043b\u0438\u0442\u044c. \u0418\u0445 \u043c\u043e\u0436\u043d\u043e \u0442\u043e\u043b\u044c\u043a\u043e \u043e\u0442\u043a\u043b\u044e\u0447\u0438\u0442\u044c.');
      }

      if (target.storageId) {
        await deleteTemplateBlob(target.storageId);
      }

      sourceCacheRef.current.delete(templateId);
      setTemplates((prev) => prev.filter((template) => template.id !== templateId));
      setTemplateAccess((prev) => {
        const next: TemplateAccessMap = {};
        Object.entries(prev).forEach(([employeeId, ids]) => {
          next[employeeId] = ids.filter((id) => id !== templateId);
        });
        return next;
      });
    },
    [templates]
  );

  const renameTemplate = useCallback((templateId: string, title: string) => {
    const normalizedTitle = normalizeString(title);
    if (!normalizedTitle) return;
    setTemplates((prev) =>
      prev.map((template) =>
        template.id === templateId ? { ...template, title: normalizedTitle, updatedAt: Date.now() } : template
      )
    );
  }, []);

  const setTemplateEnabled = useCallback((templateId: string, enabled: boolean) => {
    setTemplates((prev) =>
      prev.map((template) => (template.id === templateId ? { ...template, enabled, updatedAt: Date.now() } : template))
    );
  }, []);

  const setEmployeeTemplateAccess = useCallback((employeeId: string, templateId: string, allowed: boolean) => {
    setTemplateAccess((prev) => {
      const current = prev[employeeId] || [];
      const hasAccess = current.includes(templateId);

      if (allowed && !hasAccess) {
        return {
          ...prev,
          [employeeId]: [...current, templateId],
        };
      }
      if (!allowed && hasAccess) {
        return {
          ...prev,
          [employeeId]: current.filter((id) => id !== templateId),
        };
      }
      return prev;
    });
  }, []);

  const setEmployeeTemplateIds = useCallback((employeeId: string, templateIds: string[]) => {
    setTemplateAccess((prev) => ({
      ...prev,
      [employeeId]: toUniqueIds(templateIds),
    }));
  }, []);

  const grantTemplateToAllEmployees = useCallback(
    (templateId: string, allowed: boolean) => {
      setTemplateAccess((prev) => {
        const next: TemplateAccessMap = { ...prev };
        employees.forEach((employee) => {
          const current = next[employee.id] || [];
          const hasAccess = current.includes(templateId);
          if (allowed && !hasAccess) {
            next[employee.id] = [...current, templateId];
          }
          if (!allowed && hasAccess) {
            next[employee.id] = current.filter((id) => id !== templateId);
          }
        });
        return next;
      });
    },
    [employees]
  );

  const getTemplatesForEmployee = useCallback(
    (employeeId: string) => {
      const allowedIds = new Set(templateAccess[employeeId] || []);
      return templates.filter((template) => template.enabled && allowedIds.has(template.id));
    },
    [templateAccess, templates]
  );

  const getTemplatesForAdmin = useCallback(() => {
    return [...templates].sort((left, right) => right.updatedAt - left.updatedAt);
  }, [templates]);

  const hasTemplateAccess = useCallback(
    (employeeId: string, templateId: string) => {
      const template = templates.find((item) => item.id === templateId);
      if (!template || !template.enabled) return false;
      return (templateAccess[employeeId] || []).includes(templateId);
    },
    [templateAccess, templates]
  );

  const readTemplateSource = useCallback(
    async (templateId: string) => {
      const fromCache = sourceCacheRef.current.get(templateId);
      if (fromCache) {
        return cloneBuffer(fromCache);
      }

      const template = templates.find((item) => item.id === templateId);
      if (!template) {
        throw new Error('\u0428\u0430\u0431\u043b\u043e\u043d \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.');
      }

      let source: ArrayBuffer | null = null;
      if (template.sourceKind === 'builtin') {
        source = await fetchBuiltinTemplateArrayBuffer(template.fileName);
      } else if (template.storageId) {
        source = await loadTemplateArrayBuffer(template.storageId);
      }

      if (!source) {
        throw new Error('\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0448\u0430\u0431\u043b\u043e\u043d\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.');
      }

      sourceCacheRef.current.set(templateId, source);
      return cloneBuffer(source);
    },
    [templates]
  );

  const logTemplateUsage = useCallback(
    (entry: Omit<TemplateUsageLogEntry, 'id' | 'timestamp'> & { timestamp?: number }) => {
      const employeeId = normalizeString(entry.employeeId);
      const employeeName = normalizeString(entry.employeeName);
      const templateId = normalizeString(entry.templateId);
      const templateName = normalizeString(entry.templateName);
      const action = entry.action;
      if (!employeeId || !employeeName || !templateId || !templateName || !action) return;

      const nextEntry: TemplateUsageLogEntry = {
        id: createId(),
        employeeId,
        employeeName,
        templateId,
        templateName,
        action,
        timestamp: Number.isFinite(Number(entry.timestamp)) ? Number(entry.timestamp) : Date.now(),
      };

      setTemplateUsageLog((prev) => [nextEntry, ...prev].slice(0, TEMPLATE_LOG_MAX_SIZE));
    },
    []
  );

  const clearTemplateUsageLog = useCallback(() => {
    setTemplateUsageLog([]);
  }, []);

  const value = useMemo<DocumentTemplatesContextType>(
    () => ({
      templates,
      templateAccess,
      templateUsageLog,
      addUserTemplateFromFile,
      replaceUserTemplateFile,
      removeTemplate,
      renameTemplate,
      setTemplateEnabled,
      setEmployeeTemplateAccess,
      setEmployeeTemplateIds,
      grantTemplateToAllEmployees,
      getTemplatesForAdmin,
      getTemplatesForEmployee,
      hasTemplateAccess,
      readTemplateSource,
      logTemplateUsage,
      clearTemplateUsageLog,
    }),
    [
      templates,
      templateAccess,
      templateUsageLog,
      addUserTemplateFromFile,
      replaceUserTemplateFile,
      removeTemplate,
      renameTemplate,
      setTemplateEnabled,
      setEmployeeTemplateAccess,
      setEmployeeTemplateIds,
      grantTemplateToAllEmployees,
      getTemplatesForAdmin,
      getTemplatesForEmployee,
      hasTemplateAccess,
      readTemplateSource,
      logTemplateUsage,
      clearTemplateUsageLog,
    ]
  );

  return <DocumentTemplatesContext.Provider value={value}>{children}</DocumentTemplatesContext.Provider>;
}

export function useDocumentTemplates() {
  const context = useContext(DocumentTemplatesContext);
  if (!context) {
    throw new Error('useDocumentTemplates must be used inside DocumentTemplatesProvider');
  }
  return context;
}
