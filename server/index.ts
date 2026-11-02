import { randomUUID } from 'node:crypto';
import express, { type Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from './config/passport.js';
import authRoutes from './routes/auth.routes.js';
import integrationsRoutes from './routes/integrations.js';
import adminRoutes from './routes/admin.routes.js';
import aiRoutes from './routes/ai.routes.js';
import budgetRoutes from './routes/budget.routes.js';
import calendarRoutes from './routes/calendar.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import decisionRoutes from './routes/decision.routes.js';
import financialRoutes from './routes/financial.routes.js';
import focusRoutes from './routes/focus.routes.js';
import kpiRoutes from './routes/kpi.routes.js';
import noteRoutes from './routes/note.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import performanceRoutes from './routes/performance.routes.js';
import projectRoutes from './routes/project.routes.js';
import searchRoutes from './routes/search.routes.js';
import stakeholderRoutes from './routes/stakeholder.routes.js';
import supportRoutes from './routes/support.routes.js';
import taskRoutes from './routes/task.routes.js';
import teamRoutes from './routes/team.routes.js';
import userRoutes from './routes/user.routes.js';
import n8nTriggerRoutes from './routes/n8n/trigger.routes.js';
import n8nWebhookRoutes from './routes/n8n/webhook.routes.js';
import { errorHandler, liveness, metrics, readiness, requestLogger } from './middleware/health.js';
import { rateLimit } from './middleware/rateLimit.middleware.js';
import { logger } from './lib/logger.js';
import { withGracefulShutdown } from './lib/graceful-shutdown.js';

const app = express();
const allowedOrigins = new Set(
  [process.env.FRONTEND_URL || 'http://localhost:3000', ...(process.env.CORS_ORIGINS || '').split(',')]
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
);

const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
}
app.set('trust proxy', trustProxyHops);

app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS.'));
    },
  }),
);
app.use(express.json({ limit: process.env.BODY_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.BODY_LIMIT || '10mb' }));
app.use(passport.initialize());
app.use((req, res, next) => {
  const requestedId = req.header('x-request-id');
  const requestId =
    requestedId && /^[A-Za-z0-9._:-]{1,128}$/.test(requestedId) ? requestedId : randomUUID();
  res.setHeader('X-Request-Id', requestId);
  next();
});
app.use(requestLogger);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

app.get('/health', liveness);
app.get('/health/ready', readiness);
app.get('/metrics', metrics);

const apiRoutes: Array<[string, Router]> = [
  ['/api/auth', authRoutes],
  ['/api/integrations', integrationsRoutes],
  ['/api/admin', adminRoutes],
  ['/api/ai', aiRoutes],
  ['/api/budget', budgetRoutes],
  ['/api/calendar', calendarRoutes],
  ['/api/dashboard', dashboardRoutes],
  ['/api/decisions', decisionRoutes],
  ['/api/financial', financialRoutes],
  ['/api/focus', focusRoutes],
  ['/api/kpi', kpiRoutes],
  ['/api/notes', noteRoutes],
  ['/api/notifications', notificationRoutes],
  ['/api/performance', performanceRoutes],
  ['/api/projects', projectRoutes],
  ['/api/search', searchRoutes],
  ['/api/stakeholders', stakeholderRoutes],
  ['/api/support', supportRoutes],
  ['/api/tasks', taskRoutes],
  ['/api/team', teamRoutes],
  ['/api/user', userRoutes],
  ['/api/n8n', n8nTriggerRoutes],
  ['/api/n8n', n8nWebhookRoutes],
];
for (const [path, router] of apiRoutes) app.use(path, router);

// Keep previously registered OAuth callback URLs working during the callback
// path transition; the current API routes remain under /api/integrations.
app.use('/api/v1/integrations', integrationsRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});
app.use(errorHandler);

const port = Number(process.env.PORT || 5010);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('PORT must be a valid TCP port.');
}

export const server = app.listen(port, () => {
  logger.info('Server listening', { port: server.address() && typeof server.address() !== 'string' ? server.address().port : port });
});
export { app };

withGracefulShutdown(server);
