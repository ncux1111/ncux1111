import type { TemplateFieldConfig } from './types';
import {
  CREDITORS_DIRECTORY,
  detectCreditorFieldRole,
  findCreditorByFieldValue,
  getCreditorFieldRole,
  getCreditorOptionLabels,
  OTHER_CREDITOR_OPTION,
  pickCreditorAutofillTargets,
} from './creditorsDirectory';

export interface KazakhstanBankDirectoryItem {
  id: string;
  label: string;
  email?: string;
  contact?: string;
}

export const KAZAKH_BANKS: KazakhstanBankDirectoryItem[] = CREDITORS_DIRECTORY.filter((entry) => entry.category === 'bank').map(
  (entry) => ({
    id: entry.id,
    label: entry.name,
    email: entry.email,
    contact: entry.phone,
  })
);

export const OTHER_BANK_OPTION = OTHER_CREDITOR_OPTION;
export const KAZAKH_BANK_OPTIONS = getCreditorOptionLabels();

type BankFieldRole = 'bankName' | 'bankEmail' | 'bankContact' | null;

export function detectBankFieldRole(parts: string[]): BankFieldRole {
  const creditorRole = detectCreditorFieldRole(parts);
  if (creditorRole === 'creditorName') return 'bankName';
  if (creditorRole === 'creditorEmail') return 'bankEmail';
  if (creditorRole === 'creditorPhone') return 'bankContact';
  return null;
}

export function getBankFieldRole(field: TemplateFieldConfig): BankFieldRole {
  const creditorRole = getCreditorFieldRole(field);
  if (creditorRole === 'creditorName') return 'bankName';
  if (creditorRole === 'creditorEmail') return 'bankEmail';
  if (creditorRole === 'creditorPhone') return 'bankContact';
  return null;
}

export function isBankNameField(field: TemplateFieldConfig) {
  return getBankFieldRole(field) === 'bankName';
}

export function isBankEmailField(field: TemplateFieldConfig) {
  return getBankFieldRole(field) === 'bankEmail';
}

export function isBankContactField(field: TemplateFieldConfig) {
  return getBankFieldRole(field) === 'bankContact';
}

export function findBankByLabel(label: string) {
  const creditor = findCreditorByFieldValue(label);
  if (!creditor) return null;
  return {
    id: creditor.id,
    label: creditor.name,
    email: creditor.email,
    contact: creditor.phone,
  } satisfies KazakhstanBankDirectoryItem;
}

export function pickBankAutofillTargets(fields: TemplateFieldConfig[], sourceFieldKey: string) {
  const targets = pickCreditorAutofillTargets(fields, sourceFieldKey);
  return {
    emailTargets: targets.emailTargets,
    contactTargets: targets.phoneTargets,
  };
}

export function getFieldTextForBankDetection(field: TemplateFieldConfig) {
  return [field.label, field.key, ...(field.rawKeys || [])].filter(Boolean).join(' ');
}
