import JSZip from 'jszip';
import type { TemplateEditableMode } from './types';

const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CONTENT_TYPES_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';
const DOC_XML_PATH = 'word/document.xml';
const DOC_RELS_PATH = 'word/_rels/document.xml.rels';
const CONTENT_TYPES_PATH = '[Content_Types].xml';
const MARKER_TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*}}/g;
const IMAGE_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
const EMUS_PER_PIXEL = 9525;

type EditableCluster = {
  runs: Element[];
  key: string;
  paragraphIndex: number;
  beforeText: string;
  afterText: string;
};

type RunInfo = {
  run: Element;
  text: string;
  start: number;
  end: number;
};

type MarkerCluster = {
  key: string;
  runs: RunInfo[];
  startOffset: number;
  endOffset: number;
  paragraphIndex: number;
  beforeText: string;
  afterText: string;
  paragraph: Element;
};

export type EditableFragmentOccurrence = {
  paragraphIndex: number;
  contextBefore: string;
  contextAfter: string;
};

export type ExtractedEditableFragment = {
  rawKey: string;
  occurrences: EditableFragmentOccurrence[];
};

const normalizeKey = (value: string) =>
  value.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

const normalizeZipPath = (value: string) => value.replace(/[\\/]+/g, '/').toLowerCase();

const findZipFile = (zip: JSZip, path: string) => {
  const pathWithForwardSlashes = path.replace(/\\/g, '/');
  const pathWithBackSlashes = path.replace(/\//g, '\\');

  const directMatch = zip.file(path) ?? zip.file(pathWithForwardSlashes) ?? zip.file(pathWithBackSlashes);
  if (directMatch) return directMatch;

  const targetPath = normalizeZipPath(path);
  const matchedName = Object.keys(zip.files).find((name) => normalizeZipPath(name) === targetPath);
  return matchedName ? zip.file(matchedName) : null;
};

const getAttr = (node: Element, name: string) =>
  node.getAttribute(`w:${name}`) ?? node.getAttribute(name) ?? '';

const hasEditableStyle = (run: Element) => {
  const rPr = run.getElementsByTagNameNS(WORD_NS, 'rPr')[0];
  if (!rPr) return false;

  const highlight = rPr.getElementsByTagNameNS(WORD_NS, 'highlight')[0];
  if (highlight) return true;

  const shd = rPr.getElementsByTagNameNS(WORD_NS, 'shd')[0];
  if (!shd) return false;

  const fill = getAttr(shd, 'fill').toUpperCase();
  return fill !== '' && fill !== 'FFFFFF' && fill !== 'AUTO';
};

const getRunText = (run: Element) => {
  const textNodes = Array.from(run.getElementsByTagNameNS(WORD_NS, 't'));
  return textNodes.map((node) => node.textContent ?? '').join('');
};

const setRunText = (run: Element, value: string) => {
  const textNodes = Array.from(run.getElementsByTagNameNS(WORD_NS, 't'));
  if (textNodes.length === 0) return;

  textNodes[0].textContent = value;
  for (let index = 1; index < textNodes.length; index += 1) {
    textNodes[index].textContent = '';
  }
};

const isImageReplacement = (value: string) => /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(value.trim());

const dataUrlToBytes = (value: string) => {
  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) {
    throw new Error('Некорректный формат изображения подписи.');
  }

  const [, mimeType, base64] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return { mimeType: mimeType.toLowerCase(), bytes };
};

const getImageExtension = (mimeType: string) => {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
};

const loadImageDimensions = (dataUrl: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth || 220,
        height: image.naturalHeight || 80,
      });
    };
    image.onerror = () => reject(new Error('Не удалось прочитать размеры подписи.'));
    image.src = dataUrl;
  });

const fitImageToBounds = (width: number, height: number) => {
  const maxWidth = 220;
  const maxHeight = 90;
  const safeWidth = width || maxWidth;
  const safeHeight = height || maxHeight;
  const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight, 1);

  return {
    width: Math.max(48, Math.round(safeWidth * scale)),
    height: Math.max(24, Math.round(safeHeight * scale)),
  };
};

const buildImageRunXml = (relId: string, widthPx: number, heightPx: number, docPrId: number) => {
  const cx = widthPx * EMUS_PER_PIXEL;
  const cy = heightPx * EMUS_PER_PIXEL;

  return `
    <w:r xmlns:w="${WORD_NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${cx}" cy="${cy}" />
          <wp:docPr id="${docPrId}" name="Signature ${docPrId}" />
          <wp:cNvGraphicFramePr>
            <a:graphicFrameLocks noChangeAspect="1" />
          </wp:cNvGraphicFramePr>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:nvPicPr>
                  <pic:cNvPr id="${docPrId}" name="Signature ${docPrId}" />
                  <pic:cNvPicPr />
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${relId}" />
                  <a:stretch>
                    <a:fillRect />
                  </a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm>
                    <a:off x="0" y="0" />
                    <a:ext cx="${cx}" cy="${cy}" />
                  </a:xfrm>
                  <a:prstGeom prst="rect">
                    <a:avLst />
                  </a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  `;
};

const parseXmlString = (xmlText: string) => {
  const parser = new DOMParser();
  return parser.parseFromString(xmlText, 'application/xml');
};

const ensureRelationshipsRoot = async (zip: JSZip) => {
  const relsFile = findZipFile(zip, DOC_RELS_PATH);
  const xmlText =
    (await relsFile?.async('string')) ||
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL_NS}"></Relationships>`;
  const xmlDoc = parseXmlString(xmlText);
  return { xmlDoc, root: xmlDoc.documentElement };
};

const ensureContentTypesRoot = async (zip: JSZip) => {
  const contentTypesFile = findZipFile(zip, CONTENT_TYPES_PATH);
  const xmlText =
    (await contentTypesFile?.async('string')) ||
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${CONTENT_TYPES_NS}"></Types>`;
  const xmlDoc = parseXmlString(xmlText);
  return { xmlDoc, root: xmlDoc.documentElement };
};

const ensureContentTypeDefault = (xmlDoc: XMLDocument, root: Element, extension: string, mimeType: string) => {
  const existing = Array.from(root.getElementsByTagNameNS(CONTENT_TYPES_NS, 'Default')).find(
    (item) => item.getAttribute('Extension')?.toLowerCase() === extension
  );

  if (existing) return;

  const node = xmlDoc.createElementNS(CONTENT_TYPES_NS, 'Default');
  node.setAttribute('Extension', extension);
  node.setAttribute('ContentType', mimeType);
  root.appendChild(node);
};

const getNextRelationshipId = (root: Element) => {
  const usedIds = Array.from(root.getElementsByTagNameNS(REL_NS, 'Relationship'))
    .map((item) => item.getAttribute('Id') || '')
    .filter(Boolean);

  let nextIndex = 1;
  while (usedIds.includes(`rId${nextIndex}`)) {
    nextIndex += 1;
  }
  return `rId${nextIndex}`;
};

const getNextImageIndex = (zip: JSZip) => {
  const imageIndexes = Object.keys(zip.files)
    .map((name) => name.match(/word\/media\/image(\d+)\.[a-z0-9]+$/i)?.[1])
    .filter(Boolean)
    .map((value) => Number(value));

  return (imageIndexes.length > 0 ? Math.max(...imageIndexes) : 0) + 1;
};

const createImageRun = (
  xmlDoc: XMLDocument,
  referenceRun: Element,
  relId: string,
  widthPx: number,
  heightPx: number,
  docPrId: number
) => {
  const imageDoc = parseXmlString(buildImageRunXml(relId, widthPx, heightPx, docPrId));
  const run = xmlDoc.importNode(imageDoc.documentElement, true) as Element;
  const referenceProps = referenceRun.getElementsByTagNameNS(WORD_NS, 'rPr')[0];

  if (referenceProps) {
    const importedProps = xmlDoc.importNode(referenceProps, true);
    run.insertBefore(importedProps, run.firstChild);
  }

  return run;
};

const parseDocumentXml = (xmlText: string) => {
  const parser = new DOMParser();
  return parser.parseFromString(xmlText, 'application/xml');
};

const serializeDocumentXml = (xmlDoc: XMLDocument) => {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(xmlDoc);
};

const buildParagraphRunInfos = (runs: Element[]) => {
  const infos: RunInfo[] = [];
  let cursor = 0;

  for (const run of runs) {
    const text = getRunText(run);
    const start = cursor;
    const end = cursor + text.length;
    infos.push({ run, text, start, end });
    cursor = end;
  }

  return infos;
};

const getEditableClusters = (xmlDoc: XMLDocument): EditableCluster[] => {
  const clusters: EditableCluster[] = [];
  const paragraphs = Array.from(xmlDoc.getElementsByTagNameNS(WORD_NS, 'p'));

  const collectParagraphClusters = (runs: Element[], paragraphIndex: number) => {
    const runInfos = runs.map((run) => ({
      run,
      text: getRunText(run),
      editable: hasEditableStyle(run),
    }));

    let cursor = 0;
    while (cursor < runInfos.length) {
      if (!runInfos[cursor].editable) {
        cursor += 1;
        continue;
      }

      const start = cursor;
      let end = cursor;
      while (end + 1 < runInfos.length && runInfos[end + 1].editable) {
        end += 1;
      }

      const key = normalizeKey(runInfos.slice(start, end + 1).map((item) => item.text).join(''));
      if (key) {
        const beforeText = normalizeKey(runInfos.slice(0, start).map((item) => item.text).join(''));
        const afterText = normalizeKey(runInfos.slice(end + 1).map((item) => item.text).join(''));

        clusters.push({
          runs: runInfos.slice(start, end + 1).map((item) => item.run),
          key,
          paragraphIndex,
          beforeText,
          afterText,
        });
      }

      cursor = end + 1;
    }
  };

  if (paragraphs.length === 0) {
    const runs = Array.from(xmlDoc.getElementsByTagNameNS(WORD_NS, 'r'));
    collectParagraphClusters(runs, 0);
    return clusters;
  }

  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
    const paragraph = paragraphs[paragraphIndex];
    const runs = Array.from(paragraph.getElementsByTagNameNS(WORD_NS, 'r'));
    collectParagraphClusters(runs, paragraphIndex);
  }

  return clusters;
};

const getMarkerClusters = (xmlDoc: XMLDocument): MarkerCluster[] => {
  const clusters: MarkerCluster[] = [];
  const paragraphs = Array.from(xmlDoc.getElementsByTagNameNS(WORD_NS, 'p'));

  const collectMarkerClusters = (runs: Element[], paragraphIndex: number, paragraph: Element) => {
    const runInfos = buildParagraphRunInfos(runs);
    const paragraphText = runInfos.map((runInfo) => runInfo.text).join('');
    if (!paragraphText) return;

    MARKER_TOKEN_REGEX.lastIndex = 0;
    for (
      let match = MARKER_TOKEN_REGEX.exec(paragraphText);
      match;
      match = MARKER_TOKEN_REGEX.exec(paragraphText)
    ) {
      const [, markerKey = ''] = match;
      const key = normalizeKey(markerKey).toLocaleLowerCase('en-US');
      if (!key) continue;

      const tokenStart = match.index;
      const tokenEnd = tokenStart + match[0].length;
      const involvedRuns = runInfos.filter((runInfo) => runInfo.end > tokenStart && runInfo.start < tokenEnd);
      if (involvedRuns.length === 0) continue;

      clusters.push({
        key,
        runs: involvedRuns,
        startOffset: tokenStart,
        endOffset: tokenEnd,
        paragraphIndex,
        beforeText: normalizeKey(paragraphText.slice(0, tokenStart)),
        afterText: normalizeKey(paragraphText.slice(tokenEnd)),
        paragraph,
      });
    }
  };

  if (paragraphs.length === 0) {
    const runs = Array.from(xmlDoc.getElementsByTagNameNS(WORD_NS, 'r'));
    collectMarkerClusters(runs, 0, xmlDoc.documentElement);
    return clusters;
  }

  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
    const paragraph = paragraphs[paragraphIndex];
    const runs = Array.from(paragraph.getElementsByTagNameNS(WORD_NS, 'r'));
    collectMarkerClusters(runs, paragraphIndex, paragraph);
  }

  return clusters;
};

const setEditableClusterText = (cluster: EditableCluster, value: string) => {
  if (cluster.runs.length === 0) return;
  setRunText(cluster.runs[0], value);
  for (let index = 1; index < cluster.runs.length; index += 1) {
    setRunText(cluster.runs[index], '');
  }
};

const replaceMarkerValuesInParagraph = (paragraph: Element, valuesByKey: Record<string, string>) => {
  const runs = Array.from(paragraph.getElementsByTagNameNS(WORD_NS, 'r'));
  if (runs.length === 0) return;

  const paragraphText = runs.map((run) => getRunText(run)).join('');
  if (!paragraphText.includes('{{')) return;

  MARKER_TOKEN_REGEX.lastIndex = 0;
  const replacedText = paragraphText.replace(MARKER_TOKEN_REGEX, (fullToken: string, markerKey: string) => {
    const normalizedKey = normalizeKey(markerKey).toLocaleLowerCase('en-US');
    const replacement = valuesByKey[normalizedKey];
    if (!replacement || !replacement.trim()) return fullToken;
    return replacement;
  });

  if (replacedText === paragraphText) return;

  setRunText(runs[0], replacedText);
  for (let index = 1; index < runs.length; index += 1) {
    setRunText(runs[index], '');
  }
};

const replaceRunsWithImage = (
  xmlDoc: XMLDocument,
  runs: Element[],
  imageRun: Element
) => {
  if (runs.length === 0) return;
  const firstRun = runs[0];
  firstRun.parentNode?.replaceChild(imageRun, firstRun);

  for (let index = 1; index < runs.length; index += 1) {
    runs[index].parentNode?.removeChild(runs[index]);
  }
};

const insertImageReplacement = async (
  zip: JSZip,
  xmlDoc: XMLDocument,
  relationships: Awaited<ReturnType<typeof ensureRelationshipsRoot>>,
  contentTypes: Awaited<ReturnType<typeof ensureContentTypesRoot>>,
  targetRuns: Element[],
  value: string
) => {
  const { mimeType, bytes } = dataUrlToBytes(value);
  const extension = getImageExtension(mimeType);
  const { width, height } = await loadImageDimensions(value);
  const fitted = fitImageToBounds(width, height);
  const imageIndex = getNextImageIndex(zip);
  const fileName = `word/media/image${imageIndex}.${extension}`;
  const relId = getNextRelationshipId(relationships.root);

  zip.file(fileName, bytes);
  ensureContentTypeDefault(contentTypes.xmlDoc, contentTypes.root, extension, mimeType);

  const relationship = relationships.xmlDoc.createElementNS(REL_NS, 'Relationship');
  relationship.setAttribute('Id', relId);
  relationship.setAttribute('Type', IMAGE_REL_TYPE);
  relationship.setAttribute('Target', `media/image${imageIndex}.${extension}`);
  relationships.root.appendChild(relationship);

  const imageRun = createImageRun(xmlDoc, targetRuns[0], relId, fitted.width, fitted.height, imageIndex);
  replaceRunsWithImage(xmlDoc, targetRuns, imageRun);
};

const groupExtractedClusters = <
  T extends { key: string; paragraphIndex: number; beforeText: string; afterText: string },
>(
  clusters: T[]
) => {
  const grouped = new Map<string, EditableFragmentOccurrence[]>();
  for (const cluster of clusters) {
    if (!cluster.key) continue;
    const list = grouped.get(cluster.key) ?? [];
    list.push({
      paragraphIndex: cluster.paragraphIndex,
      contextBefore: cluster.beforeText,
      contextAfter: cluster.afterText,
    });
    grouped.set(cluster.key, list);
  }

  return Array.from(grouped.entries()).map(([rawKey, occurrences]) => ({
    rawKey,
    occurrences,
  }));
};

export const extractTemplateEditableFragments = async (
  source: ArrayBuffer
): Promise<ExtractedEditableFragment[]> => {
  const zip = await JSZip.loadAsync(source);
  const documentXml = findZipFile(zip, DOC_XML_PATH);
  if (!documentXml) return [];

  const xmlText = await documentXml.async('string');
  const xmlDoc = parseDocumentXml(xmlText);
  const editableClusters = getEditableClusters(xmlDoc);
  return groupExtractedClusters(editableClusters);
};

export const extractTemplateMarkerFragments = async (
  source: ArrayBuffer
): Promise<ExtractedEditableFragment[]> => {
  const zip = await JSZip.loadAsync(source);
  const documentXml = findZipFile(zip, DOC_XML_PATH);
  if (!documentXml) return [];

  const xmlText = await documentXml.async('string');
  const xmlDoc = parseDocumentXml(xmlText);
  const markerClusters = getMarkerClusters(xmlDoc);
  return groupExtractedClusters(markerClusters);
};

export const buildFilledTemplateBuffer = async (
  source: ArrayBuffer,
  valuesByKey: Record<string, string>,
  mode: TemplateEditableMode
) => {
  const zip = await JSZip.loadAsync(source);
  const documentXml = findZipFile(zip, DOC_XML_PATH);
  if (!documentXml) return new Uint8Array(source);

  const xmlText = await documentXml.async('string');
  const xmlDoc = parseDocumentXml(xmlText);
  const hasImageValues = Object.values(valuesByKey).some((value) => isImageReplacement(value));
  const relationships = hasImageValues ? await ensureRelationshipsRoot(zip) : null;
  const contentTypes = hasImageValues ? await ensureContentTypesRoot(zip) : null;

  if (mode === 'markers') {
    const markerClusters = getMarkerClusters(xmlDoc);

    if (relationships && contentTypes) {
      for (const cluster of markerClusters) {
        const replacement = valuesByKey[cluster.key];
        if (!replacement || !isImageReplacement(replacement)) continue;
        if (cluster.beforeText || cluster.afterText) continue;

        await insertImageReplacement(
          zip,
          xmlDoc,
          relationships,
          contentTypes,
          cluster.runs.map((item) => item.run),
          replacement
        );
      }
    }

    const textOnlyValues = Object.fromEntries(
      Object.entries(valuesByKey).filter(([, value]) => !isImageReplacement(value))
    );
    const paragraphs = Array.from(xmlDoc.getElementsByTagNameNS(WORD_NS, 'p'));

    if (paragraphs.length === 0) {
      const bodyNodes = Array.from(xmlDoc.getElementsByTagNameNS(WORD_NS, 'body'));
      for (const body of bodyNodes) {
        replaceMarkerValuesInParagraph(body, textOnlyValues);
      }
    } else {
      for (const paragraph of paragraphs) {
        replaceMarkerValuesInParagraph(paragraph, textOnlyValues);
      }
    }
  } else {
    const editableClusters = getEditableClusters(xmlDoc);
    for (const cluster of editableClusters) {
      const replacement = valuesByKey[cluster.key];
      if (!replacement || !replacement.trim()) continue;

      if (isImageReplacement(replacement) && relationships && contentTypes) {
        await insertImageReplacement(zip, xmlDoc, relationships, contentTypes, cluster.runs, replacement);
        continue;
      }

      setEditableClusterText(cluster, replacement);
    }
  }

  const targetXmlPath =
    Object.keys(zip.files).find((name) => normalizeZipPath(name) === normalizeZipPath(DOC_XML_PATH)) ||
    DOC_XML_PATH;
  zip.file(targetXmlPath, serializeDocumentXml(xmlDoc));

  if (relationships) {
    const relsPath =
      Object.keys(zip.files).find((name) => normalizeZipPath(name) === normalizeZipPath(DOC_RELS_PATH)) ||
      DOC_RELS_PATH;
    zip.file(relsPath, serializeDocumentXml(relationships.xmlDoc));
  }

  if (contentTypes) {
    const contentTypesPath =
      Object.keys(zip.files).find((name) => normalizeZipPath(name) === normalizeZipPath(CONTENT_TYPES_PATH)) ||
      CONTENT_TYPES_PATH;
    zip.file(contentTypesPath, serializeDocumentXml(contentTypes.xmlDoc));
  }

  return zip.generateAsync({ type: 'uint8array' });
};


