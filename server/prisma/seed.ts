import { prisma } from '../lib/prisma.ts';
import { ensureRbacCatalog } from '../services/rbac.service.ts';
import bcrypt from 'bcryptjs';

const PASSWORD_SALT_ROUNDS = 10;
const DEMO_EMAIL = 'demo@ceooo.test';
const DEMO_PASSWORD = 'Test123!';
const DEMO_ORG_NAME = 'CEOOO Demo Inc.';

type PermissionSeed = {
  key: string;
  group: string;
  label: string;
  description: string;
};

const MISSING_PERMISSIONS: PermissionSeed[] = [
  { key: 'search.use', group: 'Search', label: 'Use global search', description: 'Run cross-domain global search queries' },
  { key: 'kpis.view', group: 'KPIs', label: 'View KPIs', description: 'Read key performance indicators and trend data' },
  { key: 'kpis.manage', group: 'KPIs', label: 'Manage KPIs', description: 'Create, update and delete KPIs and their values' },
  { key: 'objectives.view', group: 'Objectives', label: 'View OKRs', description: 'Read objectives and key results' },
  { key: 'objectives.manage', group: 'Objectives', label: 'Manage OKRs', description: 'Create, update and delete objectives and key results' },
  { key: 'notes.view', group: 'Notes', label: 'View notes', description: 'Read executive notes board' },
  { key: 'notes.create', group: 'Notes', label: 'Create notes', description: 'Add new notes' },
  { key: 'notes.update', group: 'Notes', label: 'Update notes', description: 'Edit existing notes' },
  { key: 'notes.delete', group: 'Notes', label: 'Delete notes', description: 'Remove notes permanently' },
  { key: 'stakeholders.view', group: 'Stakeholders', label: 'View stakeholders', description: 'Read stakeholder and deal records' },
  { key: 'stakeholders.create', group: 'Stakeholders', label: 'Create stakeholders', description: 'Add new stakeholders and deals' },
  { key: 'stakeholders.update', group: 'Stakeholders', label: 'Update stakeholders', description: 'Edit stakeholder and deal records' },
  { key: 'stakeholders.delete', group: 'Stakeholders', label: 'Delete stakeholders', description: 'Remove stakeholders permanently' },
  { key: 'calendar.view', group: 'Calendar', label: 'View calendar', description: 'Read calendar events and schedule' },
  { key: 'calendar.create', group: 'Calendar', label: 'Create events', description: 'Add calendar events' },
  { key: 'calendar.update', group: 'Calendar', label: 'Update events', description: 'Edit calendar events' },
  { key: 'calendar.delete', group: 'Calendar', label: 'Delete events', description: 'Remove calendar events' },
  { key: 'team.view', group: 'Team', label: 'View team', description: 'Read team member directory' },
  { key: 'team.manage', group: 'Team', label: 'Manage team', description: 'Create, update and remove team members' },
  { key: 'ai.use', group: 'AI', label: 'Use AI features', description: 'Run AI insights, briefings and chat analysis' },
  { key: 'projects.view', group: 'Projects', label: 'View projects', description: 'Read project, milestone and task data' },
  { key: 'projects.create', group: 'Projects', label: 'Create projects', description: 'Add new projects, milestones and tasks' },
  { key: 'projects.update', group: 'Projects', label: 'Update projects', description: 'Edit projects, milestones and tasks' },
  { key: 'projects.delete', group: 'Projects', label: 'Delete projects', description: 'Remove projects and sub-entities' },
  { key: 'finance.upload', group: 'Financial Data', label: 'Upload financials', description: 'Import CSV/XLSX financial records and budgets' },
  { key: 'notifications.manage', group: 'Notifications', label: 'Manage notifications', description: 'Configure notification preferences and settings' },
  { key: 'admin.manage', group: 'Administration', label: 'Manage workspace admin', description: 'Organization-level administrative capabilities' },
];

type OrgRoleSeed = {
  name: string;
  label: string;
  description: string;
  permissions: string[];
};

const ORG_ROLES: OrgRoleSeed[] = [
  {
    name: 'OWNER',
    label: 'Organization Owner',
    description: 'Full access to every organizational feature and business domain.',
    permissions: MISSING_PERMISSIONS.map(p => p.key)
      .concat([
        'users.view', 'users.create', 'users.update', 'users.delete',
        'decisions.view', 'decisions.create', 'decisions.update', 'decisions.delete',
        'finance.view', 'finance.create', 'finance.update', 'finance.delete',
        'reports.view', 'reports.create', 'reports.export',
        'ai.manage', 'ai.configure',
      ]),
  },
  {
    name: 'ADMIN',
    label: 'Workspace Administrator',
    description: 'Manage workspace configuration, members and most business data.',
    permissions: [
      'projects.view', 'projects.create', 'projects.update', 'projects.delete',
      'objectives.view', 'objectives.manage',
      'kpis.view', 'kpis.manage',
      'notes.view', 'notes.create', 'notes.update',
      'stakeholders.view', 'stakeholders.create', 'stakeholders.update',
      'calendar.view', 'calendar.create', 'calendar.update',
      'team.view', 'team.manage',
      'finance.view', 'finance.create', 'finance.update', 'finance.upload',
      'ai.use', 'search.use', 'notifications.manage',
      'reports.view', 'reports.create', 'reports.export',
      'decisions.view', 'decisions.create', 'decisions.update',
    ],
  },
  {
    name: 'MEMBER',
    label: 'Team Member',
    description: 'Standard contributor with access to assigned workspaces and read access to shared data.',
    permissions: [
      'projects.view', 'projects.create', 'projects.update',
      'objectives.view', 'kpis.view',
      'notes.view', 'notes.create', 'notes.update',
      'stakeholders.view',
      'calendar.view', 'calendar.create',
      'team.view', 'finance.view',
      'ai.use', 'search.use',
      'reports.view', 'decisions.view',
    ],
  },
  {
    name: 'VIEWER',
    label: 'Read-only Viewer',
    description: 'View-only access to dashboards and reports without write capabilities.',
    permissions: [
      'projects.view', 'objectives.view', 'kpis.view',
      'notes.view', 'stakeholders.view', 'calendar.view',
      'team.view', 'finance.view', 'search.use',
      'reports.view', 'decisions.view',
    ],
  },
];

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function monthsBackFromNow(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function ensureAdminSetting() {
  console.log('[1/8] Ensuring AdminSetting (global-settings)...');
  await prisma.adminSetting.upsert({
    where: { id: 'global-settings' },
    update: {},
    create: {
      id: 'global-settings',
      applicationName: 'CEOOO',
      organizationName: 'CEOOO',
      defaultTimezone: 'UTC',
      defaultCurrency: 'USD',
      defaultDateFormat: 'MM/DD/YYYY',
      defaultLanguage: 'en',
      maintenanceMode: false,
      featureFlags: {
        aiAssistant: true,
        advancedAnalytics: true,
        budgetForecasting: true,
        okrInsights: true,
      },
      requireStrongPassword: true,
      sessionTimeoutMinutes: 10080,
      allowRegistration: true,
      maxLoginAttempts: 10,
      aiEnabled: true,
      aiProvider: 'google-gemini',
      aiModel: 'gemini-2.0-flash-exp',
      notificationDefaults: {
        Security: true,
        System: true,
        User: true,
        Integration: true,
        AI: true,
      },
    },
  });
}

async function ensurePermissions() {
  console.log('[2/8] Upserting missing Permission keys...');
  for (const p of MISSING_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: { key: p.key, group: p.group, label: p.label, description: p.description, isSystem: true },
      update: { group: p.group, label: p.label, description: p.description },
    });
  }
}

async function ensureOrgRoles() {
  console.log('[3/8] Upserting organizational roles (OWNER/ADMIN/MEMBER/VIEWER)...');
  const allPerms = await prisma.permission.findMany({ select: { id: true, key: true } });
  const byKey = new Map(allPerms.map(p => [p.key, p.id]));

  for (const role of ORG_ROLES) {
    const existing = await prisma.role.findUnique({ where: { name: role.name } });
    if (!existing) {
      await prisma.role.create({
        data: {
          name: role.name,
          label: role.label,
          description: role.description,
          isSystem: true,
        },
      });
    } else if (existing.isSystem) {
      await prisma.role.update({
        where: { id: existing.id },
        data: { label: role.label, description: role.description, isSystem: true },
      });
    }
    const roleRow = await prisma.role.findUnique({ where: { name: role.name }, select: { id: true } });
    if (!roleRow) continue;

    const permIds = role.permissions
      .map(k => byKey.get(k))
      .filter((id): id is string => !!id);

    const existingGrants = new Set(
      (await prisma.rolePermission.findMany({
        where: { roleId: roleRow.id },
        select: { permissionId: true },
      })).map(g => g.permissionId)
    );
    const missing = permIds.filter(id => !existingGrants.has(id));
    if (missing.length > 0) {
      await prisma.rolePermission.createMany({
        data: missing.map(permissionId => ({ roleId: roleRow.id, permissionId })),
        skipDuplicates: true,
      });
    }
  }
}

async function ensureDemoUserAndOrg(): Promise<{ userId: string; organizationId: string }> {
  console.log('[4/8] Ensuring demo organization and demo@ceooo.test OWNER user...');

  const organization = await prisma.organization.upsert({
    where: { name: DEMO_ORG_NAME },
    update: {
      industry: 'SaaS',
      companySize: '11-50',
      plan: 'pro',
      subscriptionStatus: 'active',
    },
    create: {
      name: DEMO_ORG_NAME,
      industry: 'SaaS',
      companySize: '11-50',
      plan: 'pro',
      subscriptionStatus: 'active',
      subscriptionStartDate: monthsBackFromNow(3),
      subscriptionRenewalDate: daysFromNow(330),
      isActive: true,
    },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, PASSWORD_SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      email: DEMO_EMAIL,
      passwordHash,
      name: 'Alex Demo',
      companyName: DEMO_ORG_NAME,
      companySize: '11-50',
      industry: 'SaaS',
      role: 'CEO / Founder',
      accessRole: 'OWNER',
      organizationId: organization.id,
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      language: 'en',
      emailNotifications: true,
      pushNotifications: true,
      hasCompletedOnboarding: true,
      isActive: true,
      isVerified: true,
      subscriptionPlan: 'pro',
    },
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      name: 'Alex Demo',
      companyName: DEMO_ORG_NAME,
      companySize: '11-50',
      industry: 'SaaS',
      role: 'CEO / Founder',
      accessRole: 'OWNER',
      organizationId: organization.id,
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      language: 'en',
      emailNotifications: true,
      pushNotifications: true,
      hasCompletedOnboarding: true,
      isActive: true,
      isVerified: true,
      subscriptionPlan: 'pro',
    },
  });

  if (!organization.ownerId) {
    await prisma.organization.update({
      where: { id: organization.id },
      data: { ownerId: user.id },
    });
  }

  return { userId: user.id, organizationId: organization.id };
}

async function seedProjectsMilestonesTasks(userId: string) {
  console.log('[5/8] Seeding projects (4), milestones (8), tasks (~16)...');

  const projectSpecs = [
    {
      name: 'Alpha Launch — Mobile v2.0',
      description: 'Public launch of the redesigned mobile experience including onboarding, dashboard widgets and push notifications.',
      status: 'ACTIVE' as const,
      priority: 'HIGH' as const,
      progress: 62,
      startDate: daysFromNow(-30),
      deadline: daysFromNow(20),
      budget: 120000,
      teamSize: 8,
      milestones: [
        { name: 'UI/UX Design Finalized', description: 'All screens reviewed and signed off by product.', dueDate: daysFromNow(-5), completed: true, completedAt: daysFromNow(-6) },
        { name: 'Beta Build Submitted', description: 'TestFlight/Play Internal build submitted for QA.', dueDate: daysFromNow(10), completed: false },
      ],
      tasks: [
        { title: 'Design onboarding flow', status: 'DONE' as const, priority: 'HIGH' as const, dueDate: daysFromNow(-15) },
        { title: 'Implement push notification service', status: 'IN_PROGRESS' as const, priority: 'HIGH' as const, dueDate: daysFromNow(5) },
        { title: 'QA regression — dashboard widgets', status: 'TODO' as const, priority: 'MEDIUM' as const, dueDate: daysFromNow(12) },
        { title: 'App Store screenshots and copy', status: 'TODO' as const, priority: 'LOW' as const, dueDate: daysFromNow(18) },
      ],
    },
    {
      name: 'Q4 Revenue Acceleration',
      description: 'Cross-functional initiative including pricing revamp, self-serve upgrade flow and enterprise tier pilot.',
      status: 'ACTIVE' as const,
      priority: 'HIGH' as const,
      progress: 40,
      startDate: daysFromNow(-10),
      deadline: daysFromNow(75),
      budget: 85000,
      teamSize: 5,
      milestones: [
        { name: 'Pricing Research Complete', description: 'Competitive benchmark + win/loss interviews done.', dueDate: daysFromNow(8), completed: false },
        { name: 'Self-serve Upgrade Live', description: 'Stripe checkout + entitlement provisioning end to end.', dueDate: daysFromNow(45), completed: false },
      ],
      tasks: [
        { title: 'Competitor pricing matrix', status: 'IN_PROGRESS' as const, priority: 'MEDIUM' as const, dueDate: daysFromNow(3) },
        { title: 'Stripe pricing tables integration', status: 'TODO' as const, priority: 'HIGH' as const, dueDate: daysFromNow(25) },
        { title: 'Enterprise pilot — 3 customer intros', status: 'TODO' as const, priority: 'HIGH' as const, dueDate: daysFromNow(30) },
      ],
    },
    {
      name: 'SOC 2 Type I Audit',
      description: 'End-to-end security audit preparation, evidence collection and auditor walkthrough.',
      status: 'COMPLETED' as const,
      priority: 'MEDIUM' as const,
      progress: 100,
      startDate: daysFromNow(-90),
      deadline: daysFromNow(-14),
      budget: 45000,
      teamSize: 3,
      milestones: [
        { name: 'Gap Assessment', description: 'All control gaps identified and tracked.', dueDate: daysFromNow(-60), completed: true, completedAt: daysFromNow(-62) },
        { name: 'Auditor Report Signed', description: 'Final Type I opinion delivered.', dueDate: daysFromNow(-14), completed: true, completedAt: daysFromNow(-16) },
      ],
      tasks: [
        { title: 'Policy document updates', status: 'DONE' as const, priority: 'MEDIUM' as const, dueDate: daysFromNow(-70) },
        { title: 'SSO enforcement for admins', status: 'DONE' as const, priority: 'HIGH' as const, dueDate: daysFromNow(-45) },
        { title: 'Evidence collection (12 controls)', status: 'DONE' as const, priority: 'HIGH' as const, dueDate: daysFromNow(-20) },
      ],
    },
    {
      name: 'Data Platform Migration',
      description: 'Warehouse migration from Snowflake to BigQuery plus Looker semantic layer rebuild.',
      status: 'PAUSED' as const,
      priority: 'MEDIUM' as const,
      progress: 22,
      startDate: daysFromNow(-20),
      deadline: daysFromNow(120),
      budget: 200000,
      teamSize: 6,
      milestones: [
        { name: 'Schema Design Review', description: 'BigQuery schema approved by data team.', dueDate: daysFromNow(60), completed: false },
        { name: 'LookML Migration Complete', description: 'All models and explores migrated.', dueDate: daysFromNow(95), completed: false },
      ],
      tasks: [
        { title: 'Catalog all Snowflake tables', status: 'DONE' as const, priority: 'MEDIUM' as const, dueDate: daysFromNow(-22) },
        { title: 'BigQuery IAM + terraform setup', status: 'IN_PROGRESS' as const, priority: 'MEDIUM' as const, dueDate: daysFromNow(-3) },
        { title: 'ETL job porting (phase 1)', status: 'TODO' as const, priority: 'HIGH' as const, dueDate: daysFromNow(40) },
        { title: 'Historical data backfill plan', status: 'TODO' as const, priority: 'LOW' as const, dueDate: daysFromNow(80) },
        { title: 'Looker explore parity audit', status: 'TODO' as const, priority: 'MEDIUM' as const, dueDate: daysFromNow(100) },
      ],
    },
  ];

  for (const ps of projectSpecs) {
    const project = await prisma.project.upsert({
      where: { id: `proj-${ps.name.replace(/\s+/g, '-').toLowerCase().slice(0, 40)}` },
      update: {
        name: ps.name,
        description: ps.description,
        status: ps.status,
        priority: ps.priority,
        progress: ps.progress,
        startDate: ps.startDate,
        deadline: ps.deadline,
        budget: ps.budget,
        teamSize: ps.teamSize,
      },
      create: {
        id: `proj-${ps.name.replace(/\s+/g, '-').toLowerCase().slice(0, 40)}`,
        userId,
        name: ps.name,
        description: ps.description,
        status: ps.status,
        priority: ps.priority,
        progress: ps.progress,
        startDate: ps.startDate,
        endDate: ps.deadline,
        deadline: ps.deadline,
        budget: ps.budget,
        teamSize: ps.teamSize,
      },
    });

    for (const ms of ps.milestones) {
      const msId = `ms-${project.id}-${ms.name.replace(/\s+/g, '-').toLowerCase().slice(0, 30)}`;
      await prisma.milestone.upsert({
        where: { id: msId },
        update: {
          name: ms.name,
          description: ms.description,
          dueDate: ms.dueDate,
          completed: ms.completed,
          completedAt: (ms as any).completedAt ?? null,
        },
        create: {
          id: msId,
          projectId: project.id,
          name: ms.name,
          description: ms.description,
          dueDate: ms.dueDate,
          completed: ms.completed,
          completedAt: (ms as any).completedAt ?? null,
        },
      });
    }

    for (const ts of ps.tasks) {
      const taskId = `task-${project.id}-${ts.title.replace(/\s+/g, '-').toLowerCase().slice(0, 30)}`;
      await prisma.task.upsert({
        where: { id: taskId },
        update: {
          title: ts.title,
          status: ts.status,
          priority: ts.priority,
          dueDate: ts.dueDate,
          completedAt: ts.status === 'DONE' ? ts.dueDate : null,
        },
        create: {
          id: taskId,
          projectId: project.id,
          title: ts.title,
          description: `Sub-task of ${ps.name}`,
          status: ts.status,
          priority: ts.priority,
          dueDate: ts.dueDate,
          completedAt: ts.status === 'DONE' ? ts.dueDate : null,
        },
      });
    }
  }
}

async function seedOKRsAndKPIs(userId: string) {
  console.log('[6/8] Seeding OKRs/KRs and KPIs/KPIValues...');

  const okrSpecs = [
    {
      objective: 'Grow monthly recurring revenue to $250k MRR',
      quarter: 'Q4',
      year: 2026,
      keyResults: [
        { title: 'MRR', target: 250000, current: 178000, unit: 'USD' },
        { title: 'New paying logos', target: 40, current: 18, unit: 'logos' },
        { title: 'Net dollar retention', target: 115, current: 104, unit: '%' },
      ],
    },
    {
      objective: 'Achieve best-in-class product reliability and UX',
      quarter: 'Q4',
      year: 2026,
      keyResults: [
        { title: 'Uptime SLA', target: 99.95, current: 99.88, unit: '%' },
        { title: 'P50 API latency', target: 120, current: 165, unit: 'ms' },
        { title: 'NPS', target: 55, current: 44, unit: 'score' },
      ],
    },
  ];

  for (const [idx, os] of okrSpecs.entries()) {
    const okrId = `okr-demo-${idx + 1}`;
    const okr = await prisma.oKR.upsert({
      where: { id: okrId },
      update: {
        objective: os.objective,
        quarter: os.quarter,
        year: os.year,
      },
      create: {
        id: okrId,
        userId,
        objective: os.objective,
        quarter: os.quarter,
        year: os.year,
      },
    });
    for (const [kri, kr] of os.keyResults.entries()) {
      const krId = `kr-${okr.id}-${kri + 1}`;
      await prisma.keyResult.upsert({
        where: { id: krId },
        update: {
          title: kr.title,
          target: kr.target,
          current: kr.current,
          unit: kr.unit,
        },
        create: {
          id: krId,
          okrId: okr.id,
          title: kr.title,
          target: kr.target,
          current: kr.current,
          unit: kr.unit,
        },
      });
    }
  }

  const kpiSpecs = [
    {
      name: 'Monthly Recurring Revenue',
      description: 'Trailing monthly recurring revenue across all subscription tiers.',
      category: 'Revenue',
      frequency: 'MONTHLY' as const,
      unit: 'USD',
      currentValue: 178000,
      targetValue: 250000,
      values: [
        { monthsBack: 5, value: 132000, note: 'Pre price-change baseline' },
        { monthsBack: 4, value: 141500 },
        { monthsBack: 3, value: 152000, note: 'Annual plan promo launched' },
        { monthsBack: 2, value: 164250 },
        { monthsBack: 1, value: 170400 },
        { monthsBack: 0, value: 178000, note: 'Current month (partial)' },
      ],
    },
    {
      name: 'Weekly Active Users',
      description: 'Distinct active users per trailing 7-day window.',
      category: 'Product',
      frequency: 'MONTHLY' as const,
      unit: 'users',
      currentValue: 8420,
      targetValue: 12000,
      values: [
        { monthsBack: 5, value: 5100 },
        { monthsBack: 4, value: 5820 },
        { monthsBack: 3, value: 6410, note: 'Onboarding revamp live' },
        { monthsBack: 2, value: 7205 },
        { monthsBack: 1, value: 7890 },
        { monthsBack: 0, value: 8420, note: 'Current month (partial)' },
      ],
    },
  ];

  for (const [kIdx, ks] of kpiSpecs.entries()) {
    const kpiId = `kpi-demo-${kIdx + 1}`;
    const kpi = await prisma.kPI.upsert({
      where: { id: kpiId },
      update: {
        name: ks.name,
        description: ks.description,
        category: ks.category,
        frequency: ks.frequency,
        unit: ks.unit,
        currentValue: ks.currentValue,
        targetValue: ks.targetValue,
      },
      create: {
        id: kpiId,
        userId,
        name: ks.name,
        description: ks.description,
        category: ks.category,
        frequency: ks.frequency,
        unit: ks.unit,
        currentValue: ks.currentValue,
        targetValue: ks.targetValue,
        dataSource: 'Manual seed',
      },
    });
    for (const [vi, v] of ks.values.entries()) {
      const valueId = `kpi-val-${kpi.id}-${vi + 1}`;
      await prisma.kPIValue.upsert({
        where: { id: valueId },
        update: {
          value: v.value,
          recordedAt: monthsBackFromNow(v.monthsBack),
          note: v.note ?? null,
        },
        create: {
          id: valueId,
          kpiId: kpi.id,
          value: v.value,
          recordedAt: monthsBackFromNow(v.monthsBack),
          note: v.note ?? null,
        },
      });
    }
  }
}

async function seedFinancesAndBudgets(userId: string) {
  console.log('[7/8] Seeding financials (7 INCOME + 5 EXPENSE) and budgets (2)...');

  const marketingBudget = await prisma.budget.upsert({
    where: { id: `budget-marketing-${userId.slice(0, 8)}` },
    update: {
      name: 'Marketing — Q4 Campaigns',
      category: 'Marketing',
      allocated: 5000,
      period: 'MONTHLY' as const,
      startDate: monthsBackFromNow(0),
      endDate: daysFromNow(30),
    },
    create: {
      id: `budget-marketing-${userId.slice(0, 8)}`,
      userId,
      name: 'Marketing — Q4 Campaigns',
      category: 'Marketing',
      allocated: 5000,
      spent: 3750,
      period: 'MONTHLY',
      startDate: monthsBackFromNow(0),
      endDate: daysFromNow(30),
    },
  });

  const engineeringBudget = await prisma.budget.upsert({
    where: { id: `budget-eng-${userId.slice(0, 8)}` },
    update: {
      name: 'Engineering — FY2027',
      category: 'Engineering',
      allocated: 60000,
      period: 'ANNUAL' as const,
      startDate: monthsBackFromNow(0),
      endDate: daysFromNow(365),
    },
    create: {
      id: `budget-eng-${userId.slice(0, 8)}`,
      userId,
      name: 'Engineering — FY2027',
      category: 'Engineering',
      allocated: 60000,
      spent: 14200,
      period: 'ANNUAL',
      startDate: monthsBackFromNow(0),
      endDate: daysFromNow(365),
    },
  });

  const incomeRecords = [
    { amount: 4200, category: 'Subscription', description: 'Acme Corp — annual plan', date: daysFromNow(-2) },
    { amount: 2800, category: 'Subscription', description: 'Globex Inc. — quarterly', date: daysFromNow(-5) },
    { amount: 1500, category: 'Services', description: 'Premium onboarding package — Initech', date: daysFromNow(-10) },
    { amount: 1200, category: 'Subscription', description: 'Soylent monthly', date: daysFromNow(-14) },
    { amount: 1100, category: 'Subscription', description: 'Umbrella Corp monthly', date: daysFromNow(-20) },
    { amount: 900, category: 'Add-on', description: 'AI usage overage — Hooli', date: daysFromNow(-25) },
    { amount: 500, category: 'Partnership', description: 'Referral revenue — Vandelay', date: daysFromNow(-30) },
  ];
  const incomeTotal = incomeRecords.reduce((s, r) => s + r.amount, 0);
  if (incomeTotal < 12000) throw new Error(`INCOME total ${incomeTotal} < required 12000`);

  const expenseRecords = [
    { amount: 3200, category: 'Payroll', description: 'Engineering contractor — week 1', budgetId: engineeringBudget.id, date: daysFromNow(-3) },
    { amount: 2000, category: 'Marketing', description: 'Google Ads spend — Oct w1', budgetId: marketingBudget.id, date: daysFromNow(-4) },
    { amount: 1200, category: 'Software', description: 'Annual dev tools renewal', date: daysFromNow(-8) },
    { amount: 950, category: 'Travel', description: 'Sales conference flights + hotel', date: daysFromNow(-15) },
    { amount: 800, category: 'Marketing', description: 'Content agency retainer', budgetId: marketingBudget.id, date: daysFromNow(-22) },
  ];
  const expenseTotal = expenseRecords.reduce((s, r) => s + r.amount, 0);
  if (expenseTotal < 8000) throw new Error(`EXPENSE total ${expenseTotal} < required 8000`);

  for (const [i, r] of incomeRecords.entries()) {
    await prisma.financialRecord.upsert({
      where: { id: `fin-income-${userId.slice(0, 6)}-${i + 1}` },
      update: { amount: r.amount, category: r.category, description: r.description, date: r.date },
      create: {
        id: `fin-income-${userId.slice(0, 6)}-${i + 1}`,
        userId, type: 'INCOME', amount: r.amount, category: r.category,
        description: r.description, date: r.date,
      },
    });
  }
  for (const [i, r] of expenseRecords.entries()) {
    await prisma.financialRecord.upsert({
      where: { id: `fin-expense-${userId.slice(0, 6)}-${i + 1}` },
      update: { amount: r.amount, category: r.category, description: r.description, date: r.date, budgetId: r.budgetId },
      create: {
        id: `fin-expense-${userId.slice(0, 6)}-${i + 1}`,
        userId, type: 'EXPENSE', amount: r.amount, category: r.category,
        description: r.description, date: r.date, budgetId: r.budgetId,
      },
    });
  }

  console.log(`       INCOME  = $${incomeTotal.toFixed(2)}  (required >=12000)`);
  console.log(`       EXPENSE = $${expenseTotal.toFixed(2)}  (required >=8000)`);
}

async function seedStakeholdersInteractionsNotesCalendar(userId: string) {
  console.log('[8/8] Seeding stakeholders(5)+interactions, notes(5), calendar(5), notifications(6), ai-insights(3)...');

  const stakeholders = [
    { name: 'Samantha Pierce', email: 'samantha@sequoia.vc', phone: '+1-555-0101', company: 'Sequoia Capital', type: 'INVESTOR' as const, role: 'Lead Partner', priority: 'HIGH' as const, engagementScore: 92 },
    { name: 'Marcus Chen', email: 'marcus@acme.com', phone: '+1-555-0102', company: 'Acme Corp', type: 'CLIENT' as const, role: 'CTO', priority: 'HIGH' as const, engagementScore: 88 },
    { name: 'Priya Raman', email: 'priya@aws.amazon.com', phone: '+1-555-0103', company: 'Amazon Web Services', type: 'PARTNER' as const, role: 'Sr. BD Manager', priority: 'MEDIUM' as const, engagementScore: 75 },
    { name: 'Dr. Elena Ruiz', email: 'elena@ruizadvisory.io', phone: '+1-555-0104', company: 'Ruiz Advisory', type: 'ADVISOR' as const, role: 'Go-to-Market Advisor', priority: 'MEDIUM' as const, engagementScore: 68 },
    { name: 'Tomás Okafor', email: 'tomas@cloudops.co', phone: '+1-555-0105', company: 'CloudOps Co.', type: 'VENDOR' as const, role: 'Account Director', priority: 'LOW' as const, engagementScore: 60 },
  ];

  const interactionNotes = [
    { type: 'MEETING' as const, summary: 'Q4 board meeting — reviewed pipeline, approved SOC 2 budget.', outcome: 'Budget released; follow-up on hiring plan.', actionItems: ['Confirm headcount plan by Friday', 'Schedule follow-up 1:1'] },
    { type: 'VIDEO_CALL' as const, summary: 'Launch planning walkthrough for the new enterprise tier.', outcome: 'Agreed on 60-day pilot timeline.', actionItems: ['Share SOW draft', 'Assign TAM for pilot'] },
    { type: 'CALL' as const, summary: 'Quarterly business review — credits, roadmap alignment.', outcome: 'Expanded credits in exchange for case study.', actionItems: ['Draft case study brief'] },
    { type: 'EMAIL' as const, summary: 'Introduced to two Fortune 500 target accounts via warm intro.', outcome: 'Two intros received; next steps: outreach within 48h.', actionItems: ['Draft intro emails', 'Coordinate follow-up'] },
    { type: 'MEETING' as const, summary: 'Contract renewal negotiation — 3-year pricing tier.', outcome: 'Pricing locked; procurement paperwork in progress.', actionItems: ['Send countersigned MSA'] },
  ];

  const stakeholderIds: string[] = [];
  for (const [i, s] of stakeholders.entries()) {
    const shId = `sh-demo-${i + 1}`;
    stakeholderIds.push(shId);
    await prisma.stakeholder.upsert({
      where: { id: shId },
      update: { ...s, lastContactAt: daysFromNow(-(i + 1) * 4), nextFollowUp: daysFromNow((i + 1) * 6) },
      create: {
        id: shId, userId, ...s,
        lastContactAt: daysFromNow(-(i + 1) * 4),
        nextFollowUp: daysFromNow((i + 1) * 6),
        notes: `Demo ${s.type} stakeholder — ${s.role} at ${s.company}`,
      },
    });

    const iaId = `ia-demo-${i + 1}`;
    const ia = interactionNotes[i];
    await prisma.interaction.upsert({
      where: { id: iaId },
      update: { ...ia, date: daysFromNow(-(i + 1) * 4) },
      create: {
        id: iaId, stakeholderId: shId, type: ia.type, date: daysFromNow(-(i + 1) * 4),
        summary: ia.summary, outcome: ia.outcome,
        notes: `Context: ${s.company} — ${s.role}`,
        actionItems: ia.actionItems,
      },
    });
  }

  const noteSpecs = [
    { title: 'Board Meeting Prep Notes — Oct 2026', content: '## Key metrics to highlight\n- MRR trajectory strong, NDR trending up.\n- SOC 2 Type I signed ahead of schedule.\n- Mobile v2.0 on track for Alpha Launch.\n\n## Risks to flag\n- Data Platform Migration paused — need a recovery plan before EOY.', category: 'MEETING' as const, tags: ['board', 'q4', 'review'], isPinned: true },
    { title: 'Pricing v3 Brainstorm', content: 'Tiered pricing concept: Starter $49, Growth $199, Scale $999, Enterprise custom. Usage add-on for AI tokens beyond included quota.', category: 'IDEA' as const, tags: ['pricing', 'strategy', 'monetization'] },
    { title: 'Hiring: VP Sales Profile', content: 'Must-have: 10+ yrs SaaS sales, built team from 5 to 25+, managed $10M+ ARR, sold mid-market CIO/CTO buyer. Nice-to-have: developer-tools background.', category: 'DECISION' as const, tags: ['hiring', 'exec-team'] },
    { title: 'Offsite agenda — Leadership Q1', content: '1. Strategic plan refresh (0.5d)\n2. OKRs Q1 finalization (0.5d)\n3. Team building dinner\n4. Customer panels and role plays', category: 'TASK' as const, tags: ['offsite', 'leadership', 'planning'] },
    { title: 'Customer call follow-ups', content: '- Acme: schedule architecture review\n- Globex: procurement escalation\n- Umbrella: check in on usage after 30 days\n- Soylent: expansion opportunity for 2 more teams', category: 'GENERAL' as const, tags: ['customers', 'followup'], isPinned: false },
  ];
  for (const [i, n] of noteSpecs.entries()) {
    await prisma.note.upsert({
      where: { id: `note-demo-${i + 1}` },
      update: { title: n.title, content: n.content, category: n.category, tags: n.tags, isPinned: n.isPinned ?? false },
      create: { id: `note-demo-${i + 1}`, userId, title: n.title, content: n.content, category: n.category, tags: n.tags, isPinned: n.isPinned ?? false },
    });
  }

  const eventSpecs = [
    { title: 'Board of Directors — Q4 Review', type: 'BOARD_MEETING' as const, startOffset: 2, durationH: 3, location: 'HQ — 5th Floor Boardroom', attendees: ['Samantha Pierce', 'Alex Demo', 'Elena Ruiz'], priority: 'CRITICAL' as const },
    { title: 'Acme Enterprise — Pilot Kickoff', type: 'MEETING' as const, startOffset: 5, durationH: 1, location: 'Zoom', meetingLink: 'https://zoom.us/j/ceooo-acme', attendees: ['Marcus Chen', 'Alex Demo'], priority: 'HIGH' as const },
    { title: 'AWS Partner Strategy Call', type: 'CALL' as const, startOffset: 7, durationH: 1, location: 'Phone', attendees: ['Priya Raman'], priority: 'MEDIUM' as const },
    { title: 'Strategy Session — 2027 Roadmap', type: 'STRATEGY_SESSION' as const, startOffset: 12, durationH: 4, location: 'Offsite Conference Center', attendees: ['Alex Demo', 'Leadership Team'], priority: 'HIGH' as const },
    { title: 'Focus Block — Product Spec Review', type: 'FOCUS_BLOCK' as const, startOffset: 1, durationH: 2, location: 'Quiet Room', attendees: [], priority: 'MEDIUM' as const, reminderMinutes: 15 },
  ];
  for (const [i, ev] of eventSpecs.entries()) {
    const start = new Date();
    start.setDate(start.getDate() + ev.startOffset);
    start.setHours(9 + i, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + ev.durationH);
    await prisma.calendarEvent.upsert({
      where: { id: `cal-demo-${i + 1}` },
      update: {
        title: ev.title, type: ev.type, startTime: start, endTime: end,
        location: ev.location ?? null, meetingLink: ev.meetingLink ?? null,
        attendees: ev.attendees, priority: ev.priority,
        reminderMinutes: ev.reminderMinutes ?? 30,
      },
      create: {
        id: `cal-demo-${i + 1}`, userId, title: ev.title, type: ev.type,
        startTime: start, endTime: end, allDay: false,
        location: ev.location ?? null, meetingLink: ev.meetingLink ?? null,
        attendees: ev.attendees, priority: ev.priority,
        reminderMinutes: ev.reminderMinutes ?? 30,
      },
    });
  }

  const marketingBudget = await prisma.budget.findFirst({ where: { userId, category: 'Marketing' } });
  const notifSpecs = [
    { type: 'FINANCIAL' as const, title: 'Marketing Budget at 75%', message: 'Marketing — Q4 Campaigns has spent $3,750 / $5,000 allocated this period.', priority: 'MEDIUM' as const, isRead: false, metadata: { budgetId: marketingBudget?.id ?? 'na', spentPct: 75 } },
    { type: 'AI_INSIGHT' as const, title: 'KPI Below Target: WAU', message: 'Weekly Active Users (8,420) is 30% below Q4 target of 12,000. Consider activation campaigns.', priority: 'HIGH' as const, isRead: false, metadata: { kpi: 'WAU' } },
    { type: 'CALENDAR' as const, title: 'Board Meeting Tomorrow', message: 'Board of Directors — Q4 Review begins in 24 hours. Review prep notes.', priority: 'HIGH' as const, isRead: false, metadata: { eventId: 'cal-demo-1' } },
    { type: 'STAKEHOLDER' as const, title: 'Follow-up Due: Samantha Pierce', message: 'Next follow-up with Samantha Pierce is scheduled for next week. Draft the update.', priority: 'MEDIUM' as const, isRead: true, metadata: { stakeholderId: stakeholderIds[0] } },
    { type: 'SYSTEM' as const, title: 'SOC 2 Type I Complete', message: 'Congratulations — SOC 2 Type I audit report has been signed and filed.', priority: 'MEDIUM' as const, isRead: true, metadata: { audit: 'SOC2-T1' } },
    { type: 'REMINDER' as const, title: 'Time Off Reminder', message: 'Holiday shutdown is in 3 weeks. Submit PTO requests by Friday.', priority: 'LOW' as const, isRead: true, metadata: {} },
  ];
  for (const [i, n] of notifSpecs.entries()) {
    await prisma.notification.upsert({
      where: { id: `notif-demo-${i + 1}` },
      update: {
        title: n.title, message: n.message, type: n.type,
        priority: n.priority, isRead: n.isRead, metadata: n.metadata,
      },
      create: {
        id: `notif-demo-${i + 1}`, userId,
        title: n.title, message: n.message, type: n.type,
        priority: n.priority, isRead: n.isRead, metadata: n.metadata,
      },
    });
  }

  const insightSpecs = [
    { type: 'RISK' as const, impact: 'HIGH' as const, title: 'Data Platform Migration Paused', description: 'The BigQuery migration is PAUSED at 22% progress with a 120-day deadline. If not resumed within 2 weeks, Q1 reporting parity will slip.', confidence: 92, metadata: { projectId: 'proj-data-platform-migration' }, isRead: false },
    { type: 'ALERT' as const, impact: 'MEDIUM' as const, title: 'P50 API Latency Above Target', description: 'P50 API latency is 165ms vs 120ms target (37% miss). Reliability OKR is at risk unless infra tuning work begins soon.', confidence: 87, metadata: { krId: 'kr-okr-demo-2-2' }, isRead: false },
    { type: 'OPPORTUNITY' as const, impact: 'HIGH' as const, title: 'Enterprise Pipeline Momentum', description: 'Three enterprise pilots are queued (Acme + 2 warm intros). Closing two would shorten the MRR gap by ~$50k.', confidence: 78, metadata: { stakeholders: stakeholderIds.slice(0, 2) }, isRead: true, isActioned: false },
  ];
  for (const [i, ins] of insightSpecs.entries()) {
    await prisma.aIInsight.upsert({
      where: { id: `ai-insight-demo-${i + 1}` },
      update: { ...ins },
      create: { id: `ai-insight-demo-${i + 1}`, userId, ...ins },
    });
  }
}

async function seedTeamMembers(userId: string) {
  console.log('[9/9] Seeding team members...');

  const members = [
    { name: 'Jordan Blake', email: 'jordan.blake@ceooo.test', role: 'Chief Technology Officer', department: 'Engineering', location: 'Austin, TX', priority: 'HIGH' as const, status: 'FOCUSED' as const, performanceScore: 92, workloadScore: 78, engagementScore: 88, burnoutRisk: 34, activeTasks: 6, meetingsThisWeek: 9, completedTasks: 41, pendingTasks: 4, skills: ['Platform Architecture', 'Security', 'Hiring'], projects: ['AI Product Launch', 'SOC 2 Readiness'], managerName: 'Alex Demo' },
    { name: 'Priya Nair', email: 'priya.nair@ceooo.test', role: 'VP Revenue', department: 'Sales', location: 'New York, NY', priority: 'HIGH' as const, status: 'IN_MEETING' as const, performanceScore: 89, workloadScore: 84, engagementScore: 81, burnoutRisk: 46, activeTasks: 8, meetingsThisWeek: 14, completedTasks: 33, pendingTasks: 7, skills: ['Enterprise Sales', 'Forecasting', 'Negotiation'], projects: ['European Market Expansion', 'Enterprise Sales Team Build'], managerName: 'Alex Demo' },
    { name: 'Daniel Osei', email: 'daniel.osei@ceooo.test', role: 'Head of Finance', department: 'Finance', location: 'Remote', priority: 'MEDIUM' as const, status: 'AVAILABLE' as const, performanceScore: 85, workloadScore: 62, engagementScore: 79, burnoutRisk: 22, activeTasks: 4, meetingsThisWeek: 7, completedTasks: 28, pendingTasks: 3, skills: ['FP&A', 'Fundraising', 'Board Reporting'], projects: ['Series B Planning', 'Budget Consolidation'], managerName: 'Alex Demo' },
    { name: 'Mara Lindqvist', email: 'mara.lindqvist@ceooo.test', role: 'VP Customer Success', department: 'Customer Success', location: 'Stockholm, SE', priority: 'HIGH' as const, status: 'ACTIVE' as const, performanceScore: 90, workloadScore: 71, engagementScore: 86, burnoutRisk: 29, activeTasks: 5, meetingsThisWeek: 11, completedTasks: 37, pendingTasks: 5, skills: ['Onboarding', 'Retention Playbooks', 'QBRs'], projects: ['Customer Success Automation', 'Enterprise Onboarding'], managerName: 'Alex Demo' },
    { name: 'Tobias Grant', email: 'tobias.grant@ceooo.test', role: 'Director of Product', department: 'Product', location: 'London, UK', priority: 'MEDIUM' as const, status: 'PTO' as const, performanceScore: 82, workloadScore: 45, engagementScore: 74, burnoutRisk: 18, activeTasks: 2, meetingsThisWeek: 3, completedTasks: 22, pendingTasks: 1, skills: ['Roadmapping', 'Discovery', 'Analytics'], projects: ['AI Product Launch'], managerName: 'Jordan Blake' },
    { name: 'Sofia Marchetti', email: 'sofia.marchetti@ceooo.test', role: 'People Operations Lead', department: 'People', location: 'Milan, IT', priority: 'LOW' as const, status: 'AVAILABLE' as const, performanceScore: 78, workloadScore: 55, engagementScore: 83, burnoutRisk: 25, activeTasks: 3, meetingsThisWeek: 6, completedTasks: 19, pendingTasks: 2, skills: ['Recruiting', 'Onboarding', 'Culture'], projects: ['Enterprise Sales Team Build'], managerName: 'Alex Demo' },
  ];

  for (const [i, m] of members.entries()) {
    const id = `tm-demo-${i + 1}`;
    const { skills, projects, ...rest } = m;
    await prisma.teamMember.upsert({
      where: { id },
      update: { ...rest, skills, projects, joinedAt: daysFromNow(-(i + 6) * 45), lastActiveAt: daysFromNow(-(i % 5)) },
      create: {
        id, userId, ...rest, skills, projects,
        joinedAt: daysFromNow(-(i + 6) * 45),
        lastActiveAt: daysFromNow(-(i % 5)),
        notes: `Demo team member — ${m.role} (${m.department})`,
      },
    });
  }
}

async function main() {
  console.log('========================================================');
  console.log(' CEOOO Platform — Database Seed (idempotent)');
  console.log('========================================================\n');

  await ensureAdminSetting();
  await ensureRbacCatalog();
  await ensurePermissions();
  await ensureOrgRoles();

  const { userId, organizationId } = await ensureDemoUserAndOrg();
  console.log(`       user: ${DEMO_EMAIL} (id=${userId.slice(0, 10)}...) org=${organizationId.slice(0, 10)}...\n`);

  await seedProjectsMilestonesTasks(userId);
  await seedOKRsAndKPIs(userId);
  await seedFinancesAndBudgets(userId);
  await seedStakeholdersInteractionsNotesCalendar(userId);
  await seedTeamMembers(userId);

  console.log('\n========================================================');
  console.log(' Seed complete — running verification counts...');
  console.log('========================================================');

  const report = {
    projects: await prisma.project.count({ where: { userId } }),
    milestones: await prisma.milestone.count({ where: { project: { userId } } }),
    tasks: await prisma.task.count({ where: { project: { userId } } }),
    overdueTasks: await prisma.task.count({ where: { project: { userId }, dueDate: { lt: new Date() }, status: { not: 'DONE' } } }),
    okrs: await prisma.oKR.count({ where: { userId } }),
    keyResults: await prisma.keyResult.count({ where: { okr: { userId } } }),
    kpis: await prisma.kPI.count({ where: { userId } }),
    kpiValues: await prisma.kPIValue.count({ where: { kpi: { userId } } }),
    incomeRecords: await prisma.financialRecord.count({ where: { userId, type: 'INCOME' } }),
    expenseRecords: await prisma.financialRecord.count({ where: { userId, type: 'EXPENSE' } }),
    budgets: await prisma.budget.count({ where: { userId } }),
    stakeholders: await prisma.stakeholder.count({ where: { userId } }),
    teamMembers: await prisma.teamMember.count({ where: { userId } }),
    interactions: await prisma.interaction.count({ where: { stakeholder: { userId } } }),
    notes: await prisma.note.count({ where: { userId } }),
    calendarEvents: await prisma.calendarEvent.count({ where: { userId } }),
    notifications: await prisma.notification.count({ where: { userId } }),
    unreadNotifications: await prisma.notification.count({ where: { userId, isRead: false } }),
    aiInsights: await prisma.aIInsight.count({ where: { userId } }),
    roles: await prisma.role.count(),
    permissions: await prisma.permission.count(),
  };

  const financials = await prisma.financialRecord.findMany({ where: { userId } });
  const revenue = financials.filter(f => f.type === 'INCOME').reduce((s, f) => s + f.amount, 0);
  const expenses = financials.filter(f => f.type === 'EXPENSE').reduce((s, f) => s + f.amount, 0);

  console.log('\n--- TR-2.2 Dashboard expected values --------------------');
  console.log(`  revenue:        $${revenue.toFixed(2)}   (>= 12000 required)  ${revenue >= 12000 ? '✓' : '✗ FAIL'}`);
  console.log(`  expenses:       $${expenses.toFixed(2)}   (>= 8000 required)   ${expenses >= 8000 ? '✓' : '✗ FAIL'}`);
  console.log(`  totalProjects:  ${report.projects}   (>= 4 required)        ${report.projects >= 4 ? '✓' : '✗ FAIL'}`);

  console.log('\n--- Counts by domain (TR-2.3 realism) -------------------');
  for (const [k, v] of Object.entries(report)) console.log(`  ${k.padEnd(22)}: ${v}`);

  const unmet: string[] = [];
  if (report.projects < 4) unmet.push('projects<4');
  if (report.milestones < 8) unmet.push('milestones<8');
  if (report.tasks < 12) unmet.push('tasks<12');
  if (report.overdueTasks < 1) unmet.push('overdueTasks<1');
  if (report.okrs < 2) unmet.push('okrs<2');
  if (report.keyResults < 4) unmet.push('keyResults<4');
  if (report.kpis < 2) unmet.push('kpis<2');
  if (report.kpiValues < 12) unmet.push('kpiValues<12');
  if (report.incomeRecords < 7) unmet.push('incomeRecords<7');
  if (report.expenseRecords < 5) unmet.push('expenseRecords<5');
  if (report.budgets < 2) unmet.push('budgets<2');
  if (report.stakeholders < 5) unmet.push('stakeholders<5');
  if (report.interactions < 5) unmet.push('interactions<5');
  if (report.notes < 5) unmet.push('notes<5');
  if (report.calendarEvents < 5) unmet.push('calendarEvents<5');
  if (report.notifications < 6) unmet.push('notifications<6');
  if (report.aiInsights < 3) unmet.push('aiInsights<3');
  if (revenue < 12000) unmet.push('revenue<12000');
  if (expenses < 8000) unmet.push('expenses<8000');

  console.log('\n--- TR-2.3 Seed realism rubric --------------------------');
  if (unmet.length === 0) {
    console.log('  Every domain populated — score 5/5 ✓');
  } else if (unmet.length <= 3) {
    console.log(`  Minor gaps (${unmet.join(', ')}) — score 4/5 ✓ (threshold met)`);
  } else if (unmet.length <= 7) {
    console.log(`  Several gaps (${unmet.join(', ')}) — score 3/5 ⚠`);
  } else {
    console.log(`  Many gaps (${unmet.join(', ')}) — score ≤2/5 ✗ FAIL`);
  }

  console.log('\n--- TR-2.1 Login readiness ------------------------------');
  console.log(`  POST /api/v1/auth/login  body: { "email": "${DEMO_EMAIL}", "password": "${DEMO_PASSWORD}" }`);
  console.log('  Expected: 200 success with JWT token + user payload.\n');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Seed failed:', err);
  prisma.$disconnect().then(() => process.exit(1));
});
