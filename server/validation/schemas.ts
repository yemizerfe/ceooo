// validation/schemas.ts
// Central Zod validation schemas for ceooo.
// Usage: import { signUpSchema, projectCreateSchema } from '../validation/schemas.ts';
//        router.post('/', validateZod(projectCreateSchema), handler);
import { z } from 'zod';

/* ============================================================
 *  Shared utilities
 * ============================================================ */
export const idParamSchema = z.object({ id: z.string().min(1) });
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export const uuidSchema = z.string().uuid();

/* ============================================================
 *  Auth / User
 * ============================================================ */
export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().optional(),
  companyName: z.string().optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).default('OWNER'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
  timezone: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().max(1000).optional(),
});

export const userOnboardingSchema = z.object({
  onboardingCompleted: z.boolean(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).optional(),
  companyName: z.string().optional(),
  companyIndustry: z.string().optional(),
  companySize: z.string().optional(),
});

export const deactivateAccountSchema = z.object({
  password: z.string().min(1),
  reason: z.string().max(1000).optional(),
});

/* ============================================================
 *  Organization / Company
 * ============================================================ */
export const organizationUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().max(2000).optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  website: z.string().url().optional(),
  mission: z.string().max(2000).optional(),
  vision: z.string().max(2000).optional(),
  goals: z.array(z.string().max(500)).max(20).optional(),
});

export const memberInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
  message: z.string().max(1000).optional(),
});

export const memberRoleChangeSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
});

/* ============================================================
 *  Dashboard
 * ============================================================ */
export const dashboardQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d', 'ytd', 'all', 'custom']).default('30d'),
  from: z.string().optional(),
  to: z.string().optional(),
});

/* ============================================================
 *  Projects / Milestones / Tasks
 * ============================================================ */
const ProjectStatus = z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'PAUSED']);
const Priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: Priority.default('MEDIUM'),
  status: ProjectStatus.default('PLANNING'),
  ownerId: uuidSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().nonnegative().optional(),
  tags: z.array(z.string().max(100)).max(30).optional(),
  memberIds: z.array(uuidSchema).max(200).optional(),
  objectiveId: uuidSchema.optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial();

const MilestoneStatus = z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED']);

export const milestoneCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().optional(),
  status: MilestoneStatus.default('TODO'),
  progress: z.number().min(0).max(100).default(0),
  projectId: uuidSchema,
});

export const milestoneUpdateSchema = milestoneCreateSchema.partial().omit({ projectId: true });

const TaskStatus = z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED']);

export const taskCreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  status: TaskStatus.default('TODO'),
  priority: Priority.default('MEDIUM'),
  assigneeId: uuidSchema.optional(),
  dueDate: z.string().optional(),
  projectId: uuidSchema.optional(),
  milestoneId: uuidSchema.optional(),
  objectiveId: uuidSchema.optional(),
  keyResultId: uuidSchema.optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(100)).max(30).optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial();

/* ============================================================
 *  Objectives / Key Results / KPIs
 * ============================================================ */
const ObjectiveStatus = z.enum(['DRAFT', 'ACTIVE', 'AT_RISK', 'COMPLETED', 'ARCHIVED']);

export const objectiveCreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  ownerId: uuidSchema.optional(),
  priority: Priority.default('MEDIUM'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: ObjectiveStatus.default('DRAFT'),
  progress: z.number().min(0).max(100).optional(),
  period: z.string().optional(),
});

export const objectiveUpdateSchema = objectiveCreateSchema.partial();

export const keyResultCreateSchema = z.object({
  objectiveId: uuidSchema,
  name: z.string().min(1).max(300),
  currentValue: z.number().default(0),
  targetValue: z.number().positive(),
  unit: z.string().max(50).default('%'),
  deadline: z.string().optional(),
  ownerId: uuidSchema.optional(),
});

export const keyResultUpdateSchema = keyResultCreateSchema.partial().omit({ objectiveId: true });

export const kpiCreateSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  currentValue: z.number().default(0),
  targetValue: z.number().optional(),
  unit: z.string().max(50).default('#'),
  category: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  ownerId: uuidSchema.optional(),
  dataSource: z.string().optional(),
  integrationId: uuidSchema.optional(),
  baselineValue: z.number().optional(),
});

export const kpiUpdateSchema = kpiCreateSchema.partial();

export const kpiValueSchema = z.object({
  value: z.number(),
  recordedAt: z.string().optional(),
  note: z.string().max(1000).optional(),
});

/* ============================================================
 *  Finance / Budget
 * ============================================================ */
const BudgetStatus = z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED']);

export const budgetCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  amount: z.number().nonnegative(),
  currency: z.string().max(10).default('USD'),
  period: z.string().optional(),
  category: z.string().optional(),
  status: BudgetStatus.default('ACTIVE'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  projectId: uuidSchema.optional(),
});

export const budgetUpdateSchema = budgetCreateSchema.partial();

export const budgetSpentSchema = z.object({
  spent: z.number().nonnegative(),
  note: z.string().max(500).optional(),
});

export const forecastSchema = z.object({
  months: z.coerce.number().int().min(1).max(36).default(3),
  method: z.enum(['linear', 'weighted', 'last3', 'yoy']).default('linear'),
});

const TransactionType = z.enum(['INCOME', 'EXPENSE']);

export const transactionCreateSchema = z.object({
  type: TransactionType,
  amount: z.number().positive(),
  currency: z.string().max(10).default('USD'),
  category: z.string().optional(),
  description: z.string().max(2000).optional(),
  date: z.string().default(() => new Date().toISOString()),
  projectId: uuidSchema.optional(),
  budgetId: uuidSchema.optional(),
  stakeholderId: uuidSchema.optional(),
  reference: z.string().optional(),
});

export const transactionUpdateSchema = transactionCreateSchema.partial();

export const financialDashboardSchema = z.object({
  range: z.enum(['7d', '30d', '90d', 'ytd', 'all', 'custom']).default('30d'),
});

/* ============================================================
 *  Calendar / Events
 * ============================================================ */
export const eventCreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  type: z.enum(['MEETING', 'CALL', 'DEADLINE', 'EVENT', 'REMINDER', 'REVIEW']).default('MEETING'),
  startAt: z.string(),
  endAt: z.string().optional(),
  location: z.string().max(500).optional(),
  link: z.string().url().optional(),
  attendeeIds: z.array(uuidSchema).max(100).optional(),
  stakeholderIds: z.array(uuidSchema).max(100).optional(),
  projectId: uuidSchema.optional(),
  reminder: z.string().optional(),
  notes: z.string().max(5000).optional(),
  allDay: z.boolean().default(false),
});

export const eventUpdateSchema = eventCreateSchema.partial();

/* ============================================================
 *  Stakeholders
 * ============================================================ */
export const stakeholderCreateSchema = z.object({
  name: z.string().min(1).max(200),
  organization: z.string().max(300).optional(),
  position: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  category: z.enum(['CLIENT', 'INVESTOR', 'PARTNER', 'SUPPLIER', 'ADVISOR', 'EMPLOYEE', 'CUSTOMER', 'OTHER']).default('OTHER'),
  relationshipStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'AT_RISK']).default('ACTIVE'),
  importance: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  notes: z.string().max(5000).optional(),
  lastInteractionAt: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
  tags: z.array(z.string().max(100)).max(50).optional(),
});

export const stakeholderUpdateSchema = stakeholderCreateSchema.partial();

export const interactionCreateSchema = z.object({
  stakeholderId: uuidSchema,
  type: z.enum(['MEETING', 'CALL', 'EMAIL', 'MESSAGE', 'DEAL', 'FOLLOW_UP', 'NOTE']).default('MEETING'),
  summary: z.string().max(5000),
  occurredAt: z.string().default(() => new Date().toISOString()),
  outcome: z.string().max(2000).optional(),
  nextFollowUpAt: z.string().optional(),
  eventId: uuidSchema.optional(),
});

export const dealCreateSchema = z.object({
  stakeholderId: uuidSchema,
  title: z.string().min(1).max(300),
  value: z.number().nonnegative(),
  currency: z.string().max(10).default('USD'),
  status: z.enum(['LEAD', 'PROSPECT', 'NEGOTIATION', 'WON', 'LOST']).default('LEAD'),
  expectedCloseAt: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
  notes: z.string().max(5000).optional(),
});

/* ============================================================
 *  Notes
 * ============================================================ */
export const noteCreateSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().max(20000),
  category: z.string().optional(),
  tags: z.array(z.string().max(100)).max(50).optional(),
  projectId: uuidSchema.optional(),
  calendarEventId: uuidSchema.optional(),
  stakeholderId: uuidSchema.optional(),
  pinned: z.boolean().default(false),
});

export const noteUpdateSchema = noteCreateSchema.partial();

/* ============================================================
 *  AI
 * ============================================================ */
export const aiQuestionSchema = z.object({
  question: z.string().min(1).max(5000),
  conversationId: uuidSchema.optional(),
  contextScope: z.enum(['ALL', 'PROJECTS', 'FINANCE', 'KPIS', 'OKRS', 'TASKS', 'CALENDAR', 'STAKEHOLDERS', 'DECISIONS']).array().optional(),
  stream: z.boolean().default(false),
});

export const aiGenerateInsightsSchema = z.object({
  types: z.enum(['PROJECT_RISK', 'BUDGET_RISK', 'KPI_RISK', 'GOAL_RISK', 'DEADLINE_RISK', 'PRIORITY', 'PERFORMANCE_SUMMARY', 'OPPORTUNITY']).array().optional(),
  force: z.boolean().default(false),
});

/* ============================================================
 *  Notifications
 * ============================================================ */
export const notificationPreferenceSchema = z.object({
  taskDeadlines: z.boolean().optional(),
  overdueTasks: z.boolean().optional(),
  upcomingMeetings: z.boolean().optional(),
  projectDeadlines: z.boolean().optional(),
  kpiAlerts: z.boolean().optional(),
  okrAlerts: z.boolean().optional(),
  budgetAlerts: z.boolean().optional(),
  aiInsights: z.boolean().optional(),
  stakeholderFollowups: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
});

export const markNotificationsReadSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(500).optional(),
  all: z.boolean().default(false),
});

/* ============================================================
 *  Search
 * ============================================================ */
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  scope: z.enum(['PROJECTS', 'TASKS', 'OBJECTIVES', 'KPIS', 'STAKEHOLDERS', 'NOTES', 'DECISIONS', 'CALENDAR', 'ALL']).array().optional(),
  limit: z.coerce.number().int().positive().max(100).default(30),
});
