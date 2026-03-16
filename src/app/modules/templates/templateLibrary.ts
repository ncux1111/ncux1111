import type { DocumentTemplateMeta } from './types';

type BuiltinTemplateDefinition = Omit<
  DocumentTemplateMeta,
  'sourceKind' | 'enabled' | 'createdAt' | 'updatedAt'
>;

const BUILTIN_LIBRARY: BuiltinTemplateDefinition[] = [
  {
    id: 'doc-33570-bvu',
    title: '33570 (ЗВИ в БВУ ВП)',
    category: 'Банкротство',
    description: 'Заявление о внесении изменений по банковскому займу.',
    fileName: '33570 (ЗВИ в БВУ ВП).docx',
    editableMode: 'gray',
  },
  {
    id: 'doc-33570-mfo',
    title: '33570 (ЗВИ в МФО ВП)',
    category: 'Банкротство',
    description: 'Заявление о внесении изменений по микрокредиту.',
    fileName: '33570 (ЗВИ в МФО ВП).docx',
    editableMode: 'gray',
  },
  {
    id: 'doc-avr',
    title: 'АВР',
    category: 'Судебные документы',
    description: 'Акт выполненных работ.',
    fileName: 'АВР.docx',
    editableMode: 'gray',
  },
  {
    id: 'doc-analiz-vp',
    title: 'Анализ на ВП',
    category: 'Аналитика',
    description: 'Анализ на возможность применения процедуры восстановления платежеспособности.',
    fileName: 'Анализ на ВП Новый.docx',
    editableMode: 'gray',
  },
  {
    id: 'doc-br',
    title: 'БР',
    category: 'Судебные документы',
    description: 'Заявление без рассмотрения.',
    fileName: 'БР.docx',
    editableMode: 'gray',
  },
  {
    id: 'doc-vozrazhenie',
    title: 'Возражение',
    category: 'Судебные документы',
    description: 'Возражение по заявленному требованию.',
    fileName: 'Возражение.docx',
    editableMode: 'gray',
  },
  {
    id: 'doc-zhaloba-no-opred',
    title: 'Жалоба - нет определения',
    category: 'Жалобы',
    description: 'Жалоба при отсутствии процессуального определения.',
    fileName: 'Жалоба - нет определения.docx',
    editableMode: 'gray',
  },
  {
    id: 'doc-zhaloba-arrfr',
    title: 'Жалоба в АРРФР на арест',
    category: 'Жалобы',
    description: 'Жалоба в АРРФР на действия по аресту.',
    fileName: 'Жалоба в АРРФР на арест.docx',
    editableMode: 'gray',
  },
  {
    id: 'doc-zhaloba',
    title: 'Жалоба',
    category: 'Жалобы',
    description: 'Общий шаблон жалобы.',
    fileName: 'Жалоба.docx',
    editableMode: 'gray',
  },
  {
    id: 'doc-zayavlenie-sud',
    title: 'Заявление в суд',
    category: 'Судебные документы',
    description: 'Заявление в суд о восстановлении платежеспособности.',
    fileName: 'Заявление в суд.docx',
    editableMode: 'gray',
  },
  {
    id: 'doc-online-process',
    title: 'Онлайн процесс',
    category: 'Судебные документы',
    description: 'Ходатайство об онлайн-заседании.',
    fileName: 'Онлайн процесс.docx',
    editableMode: 'gray',
  },
  {
    id: 'doc-uved-kreditoram',
    title: 'Уведомление кредиторам',
    category: 'Уведомления',
    description: 'Уведомление кредиторов о применении процедуры.',
    fileName: 'Уведомление кредиторам.docx',
    editableMode: 'gray',
  },
  {
    id: 'doc-chsi',
    title: 'ЧСИ',
    category: 'Исполнительное производство',
    description: 'Заявление частному судебному исполнителю.',
    fileName: 'ЧСИ.docx',
    editableMode: 'gray',
  },
];

export function createBuiltinTemplates(): DocumentTemplateMeta[] {
  const timestamp = Date.now();
  return BUILTIN_LIBRARY.map((item, index) => ({
    ...item,
    sourceKind: 'builtin',
    enabled: true,
    createdAt: timestamp + index,
    updatedAt: timestamp + index,
  }));
}

