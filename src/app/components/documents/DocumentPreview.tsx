import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { renderAsync } from 'docx-preview';
import type { DocumentTemplate } from '../../modules/templates';
import { buildFilledTemplateBuffer } from '../../modules/templates/templateDocx';
import {
  decodePreviewTokenValue,
  isPreviewTokenText,
  splitPreviewTokenText,
} from '../../modules/templates/templateConfig';

interface DocumentPreviewProps {
  template: DocumentTemplate;
  source?: ArrayBuffer;
  values: Record<string, string>;
  showPreview: boolean;
  loading: boolean;
  error: string | null;
  activeFragmentId: string | null;
  fragmentLabelsById: Record<string, string>;
  onFragmentHover: (fragmentId: string | null) => void;
}

type FragmentIndex = Map<string, HTMLElement[]>;

const createFragmentIndex = (): FragmentIndex => new Map();

const pushFragmentIndex = (index: FragmentIndex, key: string, element: HTMLElement) => {
  const items = index.get(key);
  if (!items) {
    index.set(key, [element]);
    return;
  }
  items.push(element);
};

const fitPreviewToA4 = (host: HTMLDivElement) => {
  const wrapper = host.querySelector<HTMLElement>('.docx-wrapper');
  const page =
    host.querySelector<HTMLElement>('.docx .docx-page') ??
    host.querySelector<HTMLElement>('.docx-page') ??
    host.querySelector<HTMLElement>('.docx');

  if (!wrapper || !page) return;
  wrapper.style.setProperty('zoom', '1');
  wrapper.style.margin = '0 auto';

  const pageWidth = page.scrollWidth;
  const availableWidth = host.clientWidth - 16;
  if (pageWidth <= 0 || availableWidth <= 0) return;

  const scale = Math.min(1, availableWidth / pageWidth);
  wrapper.style.setProperty('zoom', `${scale}`);
};

const hydrateEditableSpans = (host: HTMLDivElement, fragmentLabelsById: Record<string, string>) => {
  const fragmentIndexById = createFragmentIndex();
  const fragmentIndexByRawKey = createFragmentIndex();
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  let node = walker.nextNode();
  while (node) {
    if (node instanceof Text) {
      textNodes.push(node);
    }
    node = walker.nextNode();
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? '';
    if (!isPreviewTokenText(text)) continue;

    const parts = splitPreviewTokenText(text);
    if (!parts.some((part) => part.type === 'fragment')) continue;

    const replacement = document.createDocumentFragment();
    for (const part of parts) {
      if (part.type === 'text') {
        replacement.appendChild(document.createTextNode(part.value));
        continue;
      }

      const span = document.createElement('span');
      const fragmentId = part.fragmentId ?? '';
      const rawKey = part.rawKey ?? '';
      span.dataset.fragmentId = fragmentId;
      span.dataset.rawKey = rawKey;
      span.className = 'lf-editable-fragment';
      span.textContent = part.value;

      const fieldLabel = fragmentLabelsById[fragmentId];
      if (fieldLabel) {
        span.setAttribute('title', `Поле: «${fieldLabel}»`);
      }

      if (fragmentId) {
        pushFragmentIndex(fragmentIndexById, fragmentId, span);
      }
      if (rawKey) {
        pushFragmentIndex(fragmentIndexByRawKey, rawKey, span);
      }

      replacement.appendChild(span);
    }

    textNode.parentNode?.replaceChild(replacement, textNode);
  }

  return { fragmentIndexById, fragmentIndexByRawKey };
};

const setActivePreviewFragment = (fragmentIndexById: FragmentIndex, activeFragmentId: string | null) => {
  for (const [fragmentId, nodes] of fragmentIndexById.entries()) {
    const shouldHighlight = Boolean(activeFragmentId) && fragmentId === activeFragmentId;
    for (const node of nodes) {
      node.classList.toggle('lf-editable-fragment--active', shouldHighlight);
    }
  }
};

const applyPreviewTokenValues = (
  nextValues: Record<string, string>,
  rawKeyIndex: FragmentIndex,
  renderedValues: Record<string, string>
) => {
  for (const [rawKey, encodedValue] of Object.entries(nextValues)) {
    if (renderedValues[rawKey] === encodedValue) continue;
    renderedValues[rawKey] = encodedValue;

    const decoded = decodePreviewTokenValue(encodedValue);
    const targetRawKey = decoded?.rawKey || rawKey;
    const nextText = decoded?.text ?? encodedValue;
    const elements = rawKeyIndex.get(targetRawKey);
    if (!elements || elements.length === 0) continue;

    for (const element of elements) {
      if (element.textContent !== nextText) {
        element.textContent = nextText;
      }
    }
  }
};

export function DocumentPreview({
  template,
  source,
  values,
  showPreview,
  loading,
  error,
  activeFragmentId,
  fragmentLabelsById,
  onFragmentHover,
}: DocumentPreviewProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const activeFragmentIdRef = useRef(activeFragmentId);
  const latestValuesRef = useRef(values);
  const isPreviewReadyRef = useRef(false);
  const renderedValuesRef = useRef<Record<string, string>>({});
  const fragmentIndexByIdRef = useRef<FragmentIndex>(createFragmentIndex());
  const fragmentIndexByRawKeyRef = useRef<FragmentIndex>(createFragmentIndex());
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    latestValuesRef.current = values;
  }, [values]);

  useEffect(() => {
    activeFragmentIdRef.current = activeFragmentId;
    if (!isPreviewReadyRef.current) return;
    setActivePreviewFragment(fragmentIndexByIdRef.current, activeFragmentId);
  }, [activeFragmentId]);

  useEffect(() => {
    if (!showPreview || !previewRef.current || !source || loading || error) {
      return;
    }

    const host = previewRef.current;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const handleMouseOver = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const fragment = target?.closest<HTMLElement>('[data-fragment-id]');
      if (!fragment) return;
      onFragmentHover(fragment.dataset.fragmentId ?? null);
    };

    const handleMouseOut = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const current = target?.closest<HTMLElement>('[data-fragment-id]');
      if (!current) return;
      const related = (event as MouseEvent).relatedTarget as HTMLElement | null;
      const next = related?.closest<HTMLElement>('[data-fragment-id]');
      if (next && next.dataset.fragmentId === current.dataset.fragmentId) return;
      onFragmentHover(null);
    };

    const renderPreview = async () => {
      try {
        setRenderError(null);
        isPreviewReadyRef.current = false;
        renderedValuesRef.current = {};

        const initialValues = latestValuesRef.current;
        const filled = await buildFilledTemplateBuffer(source, initialValues, template.editableMode);
        if (cancelled) return;

        host.innerHTML = '';
        await renderAsync(filled, host, undefined, {
          inWrapper: true,
          ignoreWidth: false,
          breakPages: true,
        });

        if (cancelled) return;

        const hydrated = hydrateEditableSpans(host, fragmentLabelsById);
        fragmentIndexByIdRef.current = hydrated.fragmentIndexById;
        fragmentIndexByRawKeyRef.current = hydrated.fragmentIndexByRawKey;

        applyPreviewTokenValues(
          latestValuesRef.current,
          fragmentIndexByRawKeyRef.current,
          renderedValuesRef.current
        );
        setActivePreviewFragment(fragmentIndexByIdRef.current, activeFragmentIdRef.current);
        fitPreviewToA4(host);

        host.addEventListener('mouseover', handleMouseOver);
        host.addEventListener('mouseout', handleMouseOut);
        resizeObserver = new ResizeObserver(() => {
          if (previewRef.current === host) {
            fitPreviewToA4(host);
          }
        });
        resizeObserver.observe(host);
        isPreviewReadyRef.current = true;
      } catch (previewError) {
        if (cancelled) return;
        setRenderError(
          previewError instanceof Error ? previewError.message : 'Не удалось построить предпросмотр.'
        );
      }
    };

    void renderPreview();

    return () => {
      isPreviewReadyRef.current = false;
      fragmentIndexByIdRef.current = createFragmentIndex();
      fragmentIndexByRawKeyRef.current = createFragmentIndex();
      renderedValuesRef.current = {};

      host.removeEventListener('mouseover', handleMouseOver);
      host.removeEventListener('mouseout', handleMouseOut);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [
    template.id,
    template.editableMode,
    source,
    showPreview,
    loading,
    error,
    fragmentLabelsById,
    onFragmentHover,
  ]);

  useEffect(() => {
    if (!showPreview || !isPreviewReadyRef.current) return;
    applyPreviewTokenValues(values, fragmentIndexByRawKeyRef.current, renderedValuesRef.current);
  }, [values, showPreview]);

  if (!showPreview) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-neutral-400">
        <Eye className="mb-4 h-16 w-16" />
        <p>Включите предпросмотр, чтобы увидеть готовый документ.</p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Готовим предпросмотр...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!source) {
    return <p className="text-sm text-neutral-500">Исходный файл шаблона пока не загружен.</p>;
  }

  if (renderError) {
    return <p className="text-sm text-red-600">{renderError}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600">{template.title}</p>
      <div
        ref={previewRef}
        className="max-h-[calc(100vh-14rem)] overflow-x-hidden overflow-y-auto rounded-md border border-neutral-200 bg-neutral-100 p-2"
      />
    </div>
  );
}
