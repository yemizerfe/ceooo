import { Router } from 'express';
import multer from 'multer';
import { IntegrationController } from '../controllers/integration.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { syncAllProviders, syncProvider, getIntegrationOverview } from '../services/integrationSync.service.js';
import { readIntegrationTicket } from '../services/integrationResultTicket.service.js';

const router = Router();
const integrationController = new IntegrationController();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ==================== Public: OAuth result ticket ====================
// The callback redirects here with a signed, five-minute `integration` ticket.
// The page exchanges it for the outcome, so no connection details ever sit in
// the address bar where they could be edited or shared.
router.post('/oauth/result', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const result = readIntegrationTicket(typeof req.body?.ticket === 'string' ? req.body.ticket : null);
  if (!result) {
    return res.status(400).json({
      success: false,
      message: 'This integration result has expired. Please try connecting again.',
    });
  }
  return res.json({ success: true, data: result });
});

// ==================== Public: OAuth callback ====================
// The provider redirects the browser here without a bearer token; the user is
// identified by the signed `state` param. Must be declared before auth.
router.get('/oauth/:provider/callback', (req, res) => integrationController.oauthCallback(req, res));
// Keep the callback path used by existing provider registrations public too.
router.get('/:provider/callback', (req, res) => integrationController.oauthCallback(req, res));

// ==================== Everything else requires auth ====================
router.use(authenticate);

// GET /api/integrations - Provider catalog (methods + connection status)
router.get('/', (req, res) => integrationController.getIntegrations(req, res));

// POST /api/integrations/oauth/:provider/start - Return the authorization URL
router.post('/oauth/:provider/start', (req, res) => integrationController.startOAuth(req, res));

// POST /api/integrations/credentials - Save an API key / access token
router.post('/credentials', (req, res) => integrationController.saveCredentials(req, res));

// POST /api/integrations/import - CSV/Excel import (preview or commit)
router.post('/import', upload.single('file'), (req, res) => integrationController.importIntegrationFile(req, res));

// POST /api/integrations/connect - Legacy; now reports required methods
router.post('/connect', (req, res) => integrationController.connectIntegration(req, res));

// POST /api/integrations/disconnect - Remove a connection + credentials
router.post('/disconnect', (req, res) => integrationController.disconnectIntegration(req, res));

// POST /api/integrations/sync - Fetch and persist every connected provider's data
router.post('/sync', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const provider = req.body?.provider ? String(req.body.provider) : null;
    if (provider) {
      const result = await syncProvider(userId, provider);
      return res.json({
        success: true,
        data: { results: [result], totals: { providers: 1, records: result.records, synced: result.status === 'synced' || result.status === 'partial' ? 1 : 0, failed: result.status === 'error' ? 1 : 0 } },
        message: `Synced ${result.provider}: ${result.records} records`,
      });
    }
    const data = await syncAllProviders(userId);
    const message =
      data.totals.providers === 0
        ? 'No integrations connected yet — connect a tool or import a CSV'
        : data.totals.records === 0
          ? `Checked ${data.totals.providers} integration${data.totals.providers === 1 ? '' : 's'} — no new records returned`
          : `Synced ${data.totals.providers} integration${data.totals.providers === 1 ? '' : 's'} — ${data.totals.records} records`;
    res.json({ success: true, data, message });
  } catch (e) {
    console.error('Integration sync failed:', e);
    res.status(500).json({ success: false, message: 'Failed to sync integrations' });
  }
});

// GET /api/integrations/ai/data - Data for AI analysis. Declared BEFORE
// /:appName/data, otherwise Express matches appName="ai".
router.get('/ai/data', (req, res) => integrationController.getIntegrationDataForAI(req, res));

// GET /api/integrations/overview - Everything from every connected provider,
// normalised into page-ready buckets (projects, contacts, financials, events...)
router.get('/overview', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const overview = await getIntegrationOverview(userId);
    res.json({ success: true, data: overview });
  } catch (e) {
    console.error('Integration overview failed:', e);
    res.status(500).json({ success: false, message: 'Failed to load integration data' });
  }
});

// GET /api/integrations/projects - Project items from all connected providers
router.get('/projects', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const overview = await getIntegrationOverview(userId);
    res.json({
      success: true,
      data: overview.projects,
      count: overview.projects.length,
      providers: overview.providers,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch integration projects' });
  }
});

// GET /api/integrations/:appName/data - Fetch data from a connected integration
router.get('/:appName/data', (req, res) => integrationController.fetchIntegrationData(req, res));

export default router;
