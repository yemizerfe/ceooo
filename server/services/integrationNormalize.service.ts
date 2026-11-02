// server/services/integrationNormalize.service.ts
//
// Turns raw provider snapshots into the shapes the frontend pages already
// render: projects, tasks, stakeholders, financial records, calendar events,
// notes, and deals. Everything is read-only and tagged with its source so the
// UI can show where each record came from.

import { getProvider } from '../integrations/providers.js';
import type { ProviderSnapshot } from './integrationSnapshot.service.js';

export interface ExternalProject {
  id: string;
  name: string;
  source: string;
  sourceName: string;
  sourceIcon: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  rawStatus: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  progress: number;
  taskCount: number;
  completedTaskCount: number;
  startDate?: string;
  deadline?: string;
  url?: string;
  description?: string;
  workspace?: string;
  kind: 'external';
}

export interface ExternalTask {
  id: string;
  title: string;
  source: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  rawStatus: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  assignedTo?: string;
  dueDate?: string;
  project?: string;
  url?: string;
}

export interface ExternalStakeholder {
  id: string;
  name: string;
  source: string;
  sourceName: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  type: 'INVESTOR' | 'BOARD_MEMBER' | 'PARTNER' | 'CLIENT' | 'ADVISOR' | 'VENDOR' | 'OTHER';
  notes?: string;
}

export interface ExternalDeal {
  id: string;
  name: string;
  source: string;
  amount: number;
  stage: string | null;
  closeDate?: string;
}

export interface ExternalFinancial {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  currency: string;
  category: string;
  description?: string;
  date: string;
  status?: string;
  source: string;
  sourceName: string;
}

export interface ExternalEvent {
  id: string;
  title: string;
  source: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location?: string;
  meetingLink?: string;
  url?: string;
  status: string;
}

export interface ExternalNote {
  id: string;
  title: string;
  source: string;
  sourceName: string;
  url?: string;
  updatedAt?: string;
  kind: 'page' | 'file' | 'record';
}

export interface IntegrationProviderStatus {
  id: string;
  name: string;
  icon: string;
  accountName: string | null;
  lastSync: string | null;
  source: string;
  records: number;
  datasets: Record<string, number>;
  errors: Record<string, string>;
}

export interface IntegrationOverview {
  providers: IntegrationProviderStatus[];
  projects: ExternalProject[];
  tasks: ExternalTask[];
  stakeholders: ExternalStakeholder[];
  deals: ExternalDeal[];
  financials: ExternalFinancial[];
  events: ExternalEvent[];
  notes: ExternalNote[];
  totals: Record<string, number>;
  generatedAt: string;
}

const asArray = (value: unknown): any[] => (Array.isArray(value) ? value : []);
const text = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return undefined;
};
const firstNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n !== 0) return n;
  }
  return null;
};

function providerMeta(id: string) {
  if (id === 'csv-import') return { name: 'CSV / Excel import', icon: '📄' };
  const provider = getProvider(id);
  return {
    name: provider?.name || id,
    icon: provider?.icon || '🔌',
  };
}

function isoDate(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value == null || value === '') continue;
    const raw = String(value);
    const date = new Date(/^\d+$/.test(raw) ? Number(raw) * (raw.length > 10 ? 1 : 1000) : raw);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
}

function mapProjectStatus(raw: string | null, completed: boolean, closed: boolean): ExternalProject['status'] {
  const v = (raw || '').toLowerCase();
  if (completed || closed || ['done', 'completed', 'closed', 'archived'].includes(v)) return 'COMPLETED';
  if (v.includes('cancel')) return 'CANCELLED';
  if (v.includes('pause') || v.includes('hold') || v.includes('block')) return 'PAUSED';
  return 'ACTIVE';
}

function mapTaskStatus(raw: string | null, completed: boolean): ExternalTask['status'] {
  const v = (raw || '').toLowerCase();
  if (completed || ['done', 'completed', 'closed', 'merged', 'resolved'].includes(v)) return 'DONE';
  if (v.includes('review')) return 'REVIEW';
  if (v.includes('progress') || v.includes('doing') || v.includes('active') || v.includes('open')) return 'IN_PROGRESS';
  return 'TODO';
}

function priorityFrom(raw: unknown): ExternalTask['priority'] {
  const v = String(raw || '').toLowerCase();
  if (v.includes('high') || v.includes('urgent') || v.includes('critical')) return 'HIGH';
  if (v.includes('low') || v.includes('minor')) return 'LOW';
  return 'MEDIUM';
}

/** Collect tasks first so projects can report task/progress counts. */
function collectTasks(snapshots: ProviderSnapshot[]): ExternalTask[] {
  const tasks: ExternalTask[] = [];

  for (const snap of snapshots) {
    const src = snap.provider;
    const buckets: Array<[string, any[]]> = [
      ['tasks', asArray(snap.data.tasks)],
      ['issues', asArray(snap.data.issues)],
      ['cards', asArray(snap.data.cards)],
      ['pulls', asArray(snap.data.pulls)],
      ['items', asArray(snap.data.items)],
    ];

    for (const [bucket, rows] of buckets) {
      rows.forEach((item, index) => {
        const title = text(item.title, item.summary, item.name, item.key);
        if (!title) return;
        const rawStatus = text(item.status, item.state, item.stage, item.column);
        const completed = item.completed === true || item.done === true;
        const status = mapTaskStatus(rawStatus, completed);
        tasks.push({
          id: `${src}:${bucket}:${item.id || item.key || index}`,
          title,
          source: src,
          status,
          rawStatus: rawStatus || null,
          priority: priorityFrom(item.priority),
          assignedTo: text(
            typeof item.assignee === 'string' ? item.assignee : item.assignee?.displayName,
            item.assignee?.name,
            item.assigned_to?.name,
            item.owner,
          ),
          dueDate: isoDate(item.due_on || item.duedate || item.dueDate || item.due || item.closedate),
          project: text(item.project?.name, item.project, item.repo, item.repository, item.board?.name, item.board),
          url: text(item.html_url, item.url),
        });
      });
    }
  }

  return tasks;
}

function tasksForProject(tasks: ExternalTask[], source: string, name: string, projectId?: string) {
  const needle = [name, projectId].filter(Boolean).map((v) => String(v).toLowerCase());
  return tasks.filter((task) => {
    if (task.source !== source || !task.project) return false;
    const project = task.project.toLowerCase();
    return needle.some((n) => n.length > 1 && (project === n || project.includes(n) || n.includes(project)));
  });
}

export function normalizeSnapshots(snapshots: ProviderSnapshot[]): IntegrationOverview {
  const projects: ExternalProject[] = [];
  const stakeholders: ExternalStakeholder[] = [];
  const deals: ExternalDeal[] = [];
  const financials: ExternalFinancial[] = [];
  const events: ExternalEvent[] = [];
  const notes: ExternalNote[] = [];
  const tasks = collectTasks(snapshots);

  for (const snap of snapshots) {
    const src = snap.provider;
    const meta = providerMeta(src);

    // ---- Project-like containers ----
    const projectSources: Array<[string, any[]]> = [
      ['projects', asArray(snap.data.projects)],
      ['boards', asArray(snap.data.boards)],
      ['repos', asArray(snap.data.repos)],
    ];

    for (const [bucket, rows] of projectSources) {
      rows.forEach((item, index) => {
        const name = text(item.name, item.full_name, item.key, item.title);
        if (!name) return;
        const projectId = text(item.id, item.key, item.full_name) || String(index);
        const completed = item.completed === true || item.archived === true;
        const closed = item.closed === true || item.state === 'closed';
        const rawStatus = text(item.status, item.state, item.projectTypeKey, item.closed ? 'closed' : undefined) || null;
        const related = tasksForProject(tasks, src, name, projectId);
        const done = related.filter((t) => t.status === 'DONE').length;
        // Prefer task completion when tasks exist, then use an imported
        // progress column ("50" or "50%"), and otherwise report zero.
        const providedProgress = firstNumber(String(item.progress ?? '').replace('%', ''));
        const progress = completed || closed
          ? 100
          : related.length
            ? Math.round((done / related.length) * 100)
            : providedProgress != null
              ? Math.max(0, Math.min(100, Math.round(providedProgress)))
              : 0;

        projects.push({
          id: `${src}:${bucket}:${projectId}`,
          name,
          source: src,
          sourceName: meta.name,
          sourceIcon: meta.icon,
          status: mapProjectStatus(rawStatus, completed, closed),
          rawStatus,
          priority: priorityFrom(item.priority) as ExternalProject['priority'],
          progress,
          taskCount: related.length,
          completedTaskCount: done,
          startDate: isoDate(item.startDate || item.start_on || item.created_at),
          deadline: isoDate(item.deadline || item.due_on || item.dueDate || item.targetDate || item.closedate),
          url: text(item.url, item.html_url),
          description: text(item.description, item.desc),
          workspace: text(item.workspace?.name, item.workspace, item.projectTypeKey, item.language),
          kind: 'external',
        });
      });
    }

    // ---- Contacts / people ----
    const peopleRows: Array<[string, any[]]> = [
      ['contacts', asArray(snap.data.contacts)],
      ['customers', asArray(snap.data.customers)],
      ['users', asArray(snap.data.users)],
    ];
    for (const [bucket, rows] of peopleRows) {
      rows.forEach((item, index) => {
        const name =
          text(item.name, item.fullName, item.full_name, item.displayName) ||
          [item.firstname, item.lastname].filter(Boolean).join(' ').trim() ||
          text(item.email);
        if (!name) return;
        stakeholders.push({
          id: `${src}:${bucket}:${item.id || item.email || index}`,
          name,
          source: src,
          sourceName: meta.name,
          email: text(item.email, item.Email, item.EmailAddress, item.emailAddress),
          phone: text(item.phone, item.Phone, item.PrimaryPhone),
          company: text(item.company, item.companyName, item.accountName, item.Account?.Name),
          role: text(item.role, item.title, item.Title, item.jobtitle, bucket === 'users' ? 'Workspace member' : undefined),
          type: bucket === 'users' ? 'OTHER' : 'CLIENT',
          notes: `Imported from ${meta.name}`,
        });
      });
    }

    // ---- Deals / opportunities ----
    for (const [bucket, rows] of [
      ['deals', asArray(snap.data.deals)],
      ['opportunities', asArray(snap.data.opportunities)],
    ] as Array<[string, any[]]>) {
      rows.forEach((item, index) => {
        const name = text(item.dealname, item.name, item.Name, item.title);
        if (!name) return;
        deals.push({
          id: `${src}:${bucket}:${item.id || index}`,
          name,
          source: src,
          amount: firstNumber(item.amount, item.Amount, item.value) || 0,
          stage: text(item.stage, item.stageLabel, item.StageName) || null,
          closeDate: isoDate(item.closedate, item.closeDate, item.CloseDate, item.closedDate),
        });
      });
    }

    // ---- Financial records ----
    asArray(snap.data.charges).forEach((item, index) => {
      // Stripe reports integer minor units (cents); other sources may report
      // decimal major units, so only divide when the amount is an integer.
      const raw = firstNumber(item.amount) || 0;
      const amount = src === 'stripe' && Number.isInteger(raw) ? raw / 100 : raw;
      financials.push({
        id: `${src}:charges:${item.id || index}`,
        type: 'INCOME',
        amount,
        currency: String(item.currency || 'USD').toUpperCase(),
        category: 'Payments',
        description: text(item.description, item.customer) || 'External payment',
        date: isoDate(item.createdAt || item.created) || new Date().toISOString(),
        status: text(item.status),
        source: src,
        sourceName: meta.name,
      });
    });

    asArray(snap.data.invoices).forEach((item, index) => {
      const amount = firstNumber(item.TotalAmt, item.total, item.amount, item.Amount, item.balance) || 0;
      const status = text(item.status, item.Status, item.balance > 0 ? 'open' : 'paid') || 'unknown';
      financials.push({
        id: `${src}:invoices:${item.id || index}`,
        type: 'INCOME',
        amount,
        currency: String(item.currency || 'USD').toUpperCase(),
        category: 'Invoices',
        description:
          text(item.DocNumber, item.InvoiceNumber, item.name, item.CustomerRef?.name, item.description) ||
          'Invoice',
        date: isoDate(item.PaymentDueDate, item.dueDate, item.TxnDate, item.date) || new Date().toISOString(),
        status,
        source: src,
        sourceName: meta.name,
      });
    });

    asArray(snap.data.transactions).forEach((item, index) => {
      const gross = item.amount && typeof item.amount === 'object' ? item.amount.value : item.amount;
      const amount = firstNumber(gross, item.total, item.net) || 0;
      const isExpense = String(item.type || item.transaction_type || '').toLowerCase().includes('payout');
      financials.push({
        id: `${src}:transactions:${item.id || item.transaction_id || index}`,
        type: isExpense ? 'EXPENSE' : 'INCOME',
        amount: Math.abs(amount),
        currency: String(item.currency_code || item.currency || 'USD').toUpperCase(),
        category: 'Transactions',
        description: text(item.description, item.transaction_info?.transaction_subject, item.payer?.email_address) || 'Transaction',
        date: isoDate(item.transaction_initiation_date, item.time, item.date) || new Date().toISOString(),
        status: text(item.status),
        source: src,
        sourceName: meta.name,
      });
    });

    asArray(snap.data.expenses).forEach((item, index) => {
      const amount = firstNumber(item.amount, item.TotalAmt, item.total) || 0;
      financials.push({
        id: `${src}:expenses:${item.id || index}`,
        type: 'EXPENSE',
        amount,
        currency: String(item.currency || 'USD').toUpperCase(),
        category: text(item.category, item.Category) || 'Expenses',
        description: text(item.description, item.name) || 'Expense',
        date: isoDate(item.date, item.TxnDate) || new Date().toISOString(),
        status: text(item.status),
        source: src,
        sourceName: meta.name,
      });
    });

    // ---- Calendar events ----
    asArray(snap.data.events).forEach((item, index) => {
      const start = isoDate(item.start || item.startTime);
      const end = isoDate(item.end || item.endTime) || start;
      if (!start || !end) return;
      const title = text(item.title, item.summary, item.name);
      if (!title) return;
      events.push({
        id: `${src}:events:${item.id || index}`,
        title,
        source: src,
        startTime: start,
        endTime: end,
        allDay: !String((item.start as any)?.dateTime || ''),
        location: text(item.location),
        meetingLink: text(item.hangoutLink, item.htmlLink, item.meetingLink),
        url: text(item.htmlLink, item.url),
        status: text(item.status) || 'SCHEDULED',
      });
    });

    // ---- Notes / documents ----
    for (const [bucket, rows] of [
      ['pages', asArray(snap.data.pages)],
      ['files', asArray(snap.data.files)],
      ['bases', asArray(snap.data.bases)],
    ] as Array<[string, any[]]>) {
      rows.forEach((item, index) => {
        const title = text(item.title, item.name, item.path);
        if (!title) return;
        notes.push({
          id: `${src}:${bucket}:${item.id || index}`,
          title,
          source: src,
          sourceName: meta.name,
          url: text(item.url, item.html_url, item.webViewLink),
          updatedAt: isoDate(item.last_edited_time, item.modifiedTime, item.modified, item.updated_at),
          kind: bucket === 'files' ? 'file' : 'page',
        });
      });
    }
  }

  const providers: IntegrationProviderStatus[] = snapshots.map((snap) => {
    const meta = providerMeta(snap.provider);
    return {
      id: snap.provider,
      name: meta.name,
      icon: meta.icon,
      accountName: snap.accountName,
      lastSync: snap.lastSync,
      source: snap.source || 'none',
      records: snap.totalRecords,
      datasets: Object.fromEntries(Object.entries(snap.data).map(([k, v]) => [k, v.length])),
      errors: snap.errors,
    };
  });

  const totals = {
    providers: providers.length,
    projects: projects.length,
    tasks: tasks.length,
    stakeholders: stakeholders.length,
    deals: deals.length,
    financials: financials.length,
    events: events.length,
    notes: notes.length,
    records: providers.reduce((sum, p) => sum + p.records, 0),
  };

  return {
    providers,
    projects,
    tasks,
    stakeholders,
    deals,
    financials,
    events,
    notes,
    totals,
    generatedAt: new Date().toISOString(),
  };
}
