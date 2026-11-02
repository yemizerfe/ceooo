// server/services/integrationImport.service.ts
//
// CSV / Excel import — the first working connection method. Parses an uploaded
// .csv / .xlsx / .xls buffer into rows, guesses the record type from the header
// row, and maps contact-like rows onto the app's Stakeholder model.

import * as XLSX from 'xlsx';

export interface ParsedTable {
  sheetName: string;
  columns: string[];
  rows: Record<string, string>[];
  sheetNames: string[];
}

export type RecordType = 'contacts' | 'companies' | 'deals' | 'invoices' | 'projects' | 'tasks' | 'generic';

export const RECORD_TYPES: { id: RecordType; label: string; description: string }[] = [
  { id: 'contacts', label: 'Contacts / People', description: 'Imported as stakeholders in your CEO app' },
  { id: 'companies', label: 'Companies', description: 'Stored as imported company records' },
  { id: 'deals', label: 'Deals / Opportunities', description: 'Stored as imported pipeline records' },
  { id: 'invoices', label: 'Invoices / Financials', description: 'Stored as imported financial records' },
  { id: 'projects', label: 'Projects', description: 'Shown on the Project Management page next to in-app projects' },
  { id: 'tasks', label: 'Tasks / Issues', description: 'Shown as tasks from connected tools' },
  { id: 'generic', label: 'Other rows', description: 'Stored verbatim for AI analysis' },
];

export const IMPORT_MAX_BYTES = 10 * 1024 * 1024;

const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE2_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]);

/**
 * Reject uploads that are not actually CSV/Excel before the parser touches
 * them. The extension is a hint, the bytes are the truth.
 */
export function assertTabularFile(buffer: Buffer, fileName = ''): void {
  if (!buffer?.length) throw new Error('The uploaded file is empty');
  if (buffer.length > IMPORT_MAX_BYTES) {
    throw new Error(`The file is ${(buffer.length / 1024 / 1024).toFixed(1)} MB; the limit is 10 MB`);
  }

  const ext = (fileName.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
  const allowed = ['.csv', '.xlsx', '.xls', '.txt'];
  if (ext && !allowed.includes(ext)) {
    throw new Error(`Unsupported file type “${ext}”. Upload a .csv, .xlsx or .xls file`);
  }

  const isZip = buffer.subarray(0, 4).equals(ZIP_MAGIC);
  const isOle2 = buffer.subarray(0, 4).equals(OLE2_MAGIC);

  if ((ext === '.xlsx' || ext === '.xls') && !isZip && !isOle2) {
    throw new Error(`“${fileName || 'The file'}” has an Excel extension but is not a valid workbook`);
  }

  if (!isZip && !isOle2) {
    // Anything else must be text. A NUL byte means it is binary.
    if (buffer.subarray(0, 4096).includes(0x00)) {
      throw new Error('The file looks binary. CSV imports must be plain text');
    }
    const header = buffer.subarray(0, 4096).toString('utf8').split(/\r?\n/).find((l) => l.trim());
    if (!header) throw new Error('The file has no header row');
    if (!/[,;\t|]/.test(header)) {
      throw new Error('No column delimiter found — this does not look like a CSV file');
    }
  }
}

/** Parse a CSV/XLSX buffer into normalized string rows. */
export function parseTabularFile(buffer: Buffer, sheetName?: string): ParsedTable {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  const sheetNames = wb.SheetNames;
  if (!sheetNames.length) {
    throw new Error('The file has no sheets to import');
  }
  const name = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
  const sheet = wb.Sheets[name];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });

  // Strip empty rows and normalize every cell to a trimmed string.
  const rows: Record<string, string>[] = [];
  for (const row of raw) {
    const clean: Record<string, string> = {};
    let hasValue = false;
    for (const [k, v] of Object.entries(row)) {
      const key = String(k).trim();
      if (!key) continue;
      const value = v == null ? '' : String(v).trim();
      clean[key] = value;
      if (value) hasValue = true;
    }
    if (hasValue) rows.push(clean);
  }

  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );

  return { sheetName: name, columns, rows, sheetNames };
}

const HEADER_SYNONYMS: Record<string, string[]> = {
  name: ['name', 'full name', 'fullname', 'contact', 'contact name', 'lead name', 'first name', 'person'],
  firstName: ['first name', 'firstname', 'given name'],
  lastName: ['last name', 'lastname', 'surname', 'family name'],
  email: ['email', 'e-mail', 'email address', 'work email', 'contact email'],
  phone: ['phone', 'phone number', 'mobile', 'telephone', 'cell', 'work phone'],
  company: ['company', 'company name', 'organization', 'organisation', 'account', 'account name', 'employer'],
  role: ['job title', 'title', 'role', 'position', 'job role', 'designation'],
  type: ['type', 'category', 'stakeholder type'],
  notes: ['notes', 'note', 'description', 'comments', 'comment'],
  project: ['project', 'project name', 'initiative', 'program', 'programme'],
  task: ['task', 'task name', 'issue', 'issue title', 'summary', 'subject'],
  status: ['status', 'state', 'stage', 'phase'],
  priority: ['priority', 'severity', 'importance'],
  deadline: ['deadline', 'due date', 'due', 'target date', 'end date', 'completion date'],
  assignee: ['assignee', 'owner', 'assigned to', 'responsible', 'lead'],
  progress: ['progress', 'percent complete', 'completion', '% complete'],
};

function normKey(key: string): string {
  return key.toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Best header for a canonical field, or undefined when none matches. */
function pick(columns: string[], field: string): string | undefined {
  const syns = HEADER_SYNONYMS[field] ?? [field];
  const normalized = columns.map((c) => ({ c, n: normKey(c) }));
  for (const syn of syns) {
    const hit = normalized.find((x) => x.n === syn);
    if (hit) return hit.c;
  }
  for (const syn of syns) {
    const hit = normalized.find((x) => x.n.includes(syn));
    if (hit) return hit.c;
  }
  return undefined;
}

export interface SuggestedMapping {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  type?: string;
  notes?: string;
  project?: string;
  task?: string;
  status?: string;
  priority?: string;
  deadline?: string;
  assignee?: string;
  progress?: string;
}

export function suggestMapping(columns: string[], recordType: RecordType): SuggestedMapping {
  const wanted: (keyof SuggestedMapping)[] =
    recordType === 'contacts'
      ? ['name', 'firstName', 'lastName', 'email', 'phone', 'company', 'role', 'type', 'notes']
      : recordType === 'projects'
        ? ['project', 'name', 'status', 'priority', 'progress', 'deadline', 'assignee', 'notes']
        : recordType === 'tasks'
          ? ['task', 'name', 'status', 'priority', 'assignee', 'deadline', 'project', 'notes']
          : ['name', 'email', 'company', 'notes'];
  const mapping: SuggestedMapping = {};
  for (const field of wanted) {
    const col = pick(columns, field as string);
    if (col) mapping[field] = col;
  }
  return mapping;
}

export function guessRecordType(columns: string[]): RecordType {
  const n = columns.map(normKey);
  const has = (f: string) => Boolean(pick(columns, f));
  // Most specific shapes first: people, tasks, projects, money, pipeline.
  if ((has('email') || has('phone')) && (has('company') || has('role') || has('name'))) return 'contacts';
  if ((has('task') || n.some((c) => c === 'issue')) && (has('assignee') || has('status') || has('deadline'))) return 'tasks';
  if ((has('project') || n.some((c) => c.includes('project'))) && (has('progress') || has('status') || has('deadline'))) return 'projects';
  if (n.some((c) => c.includes('invoice') || c.includes('amount') || c.includes('revenue'))) return 'invoices';
  if (n.some((c) => c.includes('deal') || c.includes('opportunity') || c.includes('stage'))) return 'deals';
  if (n.some((c) => c.includes('company') || c.includes('industry') || c.includes('employees'))) return 'companies';
  return 'generic';
}

const STAKEHOLDER_TYPES = ['INVESTOR', 'BOARD_MEMBER', 'PARTNER', 'CLIENT', 'ADVISOR', 'VENDOR', 'OTHER'] as const;
type StakeholderType = (typeof STAKEHOLDER_TYPES)[number];

function normalizeStakeholderType(value?: string): StakeholderType {
  if (!value) return 'OTHER';
  const key = value.toUpperCase().replace(/[\s-]+/g, '_');
  return (STAKEHOLDER_TYPES as readonly string[]).includes(key) ? (key as StakeholderType) : 'OTHER';
}

export interface StakeholderDraft {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  type: StakeholderType;
  notes: string | null;
}

/** Map rows to stakeholder drafts using the (possibly user-overridden) mapping. */
export function mapContacts(rows: Record<string, string>[], mapping: SuggestedMapping): StakeholderDraft[] {
  const read = (row: Record<string, string>, col?: string) => (col ? (row[col] ?? '').trim() : '');
  const drafts: StakeholderDraft[] = [];
  for (const row of rows) {
    let name = read(row, mapping.name);
    if (!name) {
      name = [read(row, mapping.firstName), read(row, mapping.lastName)].filter(Boolean).join(' ').trim();
    }
    if (!name) {
      // Fall back to email/company so a row is never silently dropped.
      name = read(row, mapping.email) || read(row, mapping.company);
    }
    if (!name) continue;
    drafts.push({
      name: name.slice(0, 200),
      email: read(row, mapping.email) || null,
      phone: read(row, mapping.phone) || null,
      company: read(row, mapping.company) || null,
      role: read(row, mapping.role) || null,
      type: normalizeStakeholderType(read(row, mapping.type)),
      notes: read(row, mapping.notes) || null,
    });
  }
  return drafts;
}

export function previewRows(rows: Record<string, string>[], limit = 20): Record<string, string>[] {
  return rows.slice(0, limit);
}
