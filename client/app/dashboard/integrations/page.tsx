"use client";
import { debugError } from "@/lib/logger";
// app/dashboard/integrations/page.tsx

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { validateImportFile, IMPORT_ACCEPT } from "@/lib/importValidation";
import {
  Search,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Plug,
  Upload,
  Clock,
} from "lucide-react";

type AuthMethod = "csv" | "oauth2" | "oauth1" | "apiKey";

interface ProviderIntegration {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  authMethods: AuthMethod[];
  credentialFields?: Array<{ key: string; label: string; secret: boolean; required: boolean; placeholder?: string; help?: string }>;
  oauthConfigured: boolean;
  supportsRedirectAuth?: boolean;
  oauthFlavor?: "oauth2" | "oauth1" | null;
  apiKeyConfigured: boolean;
  missingServerCredentialEnv?: string[];
  missingOAuthEnv?: string[];
  clientIdEnv?: string;
  connected: boolean;
  /** Stored connection used an auth method this provider no longer supports. */
  needsReauth?: boolean;
  method: AuthMethod | null;
  accountName: string | null;
  lastSync: string | null;
  recordsImported: number;
  importRecordType: string | null;
  lastError: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  CRM: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  Finance: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  ERP: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  "Project Management": "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  Communication: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
  Productivity: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  "Business Suite": "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
  Data: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300",
};

export default function IntegrationsPage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [providers, setProviders] = useState<ProviderIntegration[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [notice, setNotice] = useState<{
    kind: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [importRecordType, setImportRecordType] = useState("auto");
  const [connectingProviderId, setConnectingProviderId] = useState<string | null>(null);

  const hasInitialized = useRef(false);
  const csvFileInput = useRef<HTMLInputElement>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  const flash = (kind: "success" | "error" | "info", text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 6000);
  };

  // ============ LOAD PROVIDERS ============
  const loadProviders = async () => {
    const t = token();
    if (!t) {
      setPageLoading(false);
      flash("error", "Please sign in to manage integrations.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/integrations`, {
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success && data.data?.integrations) {
        setProviders(data.data.integrations);
      } else {
        flash("error", data.message || "Failed to load integrations");
      }
    } catch (e) {
      debugError(e);
      flash("error", "Could not reach the server. Is the API running?");
    } finally {
      setPageLoading(false);
    }
  };

  const updateProvider = (id: string, patch: Partial<ProviderIntegration>) =>
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  // Pull every dataset for one provider right after it connects so pages and AI
  // have data immediately.
  const syncProviderData = async (providerId: string) => {
    const t = token();
    if (!t) return;
    try {
      const res = await fetch(`${API_URL}/api/integrations/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId }),
      });
      const data = await res.json();
      if (data.success) {
        const totals = data.data?.totals;
        flash("success", `Synced ${providerId}${totals ? ` — ${totals.records} records` : ""}`);
        await loadProviders();
      }
    } catch (e) {
      debugError("Provider sync failed", e);
    }
  };

  // ============ OAUTH ============
  const startOAuth = async (p: ProviderIntegration) => {
    const t = token();
    if (!t) {
      flash("error", "Please sign in to connect integrations.");
      return;
    }
    setConnectingProviderId(p.id);
    let redirecting = false;
    try {
      const res = await fetch(`${API_URL}/api/integrations/oauth/${p.id}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.authorizationUrl) {
        localStorage.setItem("pending_integration", p.id);
        redirecting = true;
        window.location.assign(data.data.authorizationUrl);
      } else {
        // The vendor refused the consent request (a deleted app key, for
        // example). Fall back to the credentials already in .env, which needs
        // no typing; only ask for a key when the server has none.
        if (p.apiKeyConfigured) {
          await connectWithServerCredentials(p);
        } else {
          flash("error", data.message || `Could not start OAuth for ${p.name}`);
          if ((p.credentialFields?.length ?? 0) > 0) openCredentialForm(p);
        }
      }
    } catch (e) {
      debugError(e);
      flash("error", "Could not start the OAuth flow.");
      if (p.apiKeyConfigured) await connectWithServerCredentials(p);
      else if ((p.credentialFields?.length ?? 0) > 0) openCredentialForm(p);
    } finally {
      if (!redirecting) setConnectingProviderId(null);
    }
  };

  const [showApiKeyForm, setShowApiKeyForm] = useState<string | null>(null);
  const [apiKeyFormData, setApiKeyFormData] = useState<Record<string, string>>({});
  const [apiKeySubmitting, setApiKeySubmitting] = useState(false);

  /** Reveals the credential form with empty inputs for one provider. */
  const openCredentialForm = (provider: ProviderIntegration) => {
    const initial: Record<string, string> = {};
    (provider.credentialFields || []).forEach((field) => {
      initial[field.key] = "";
    });
    setApiKeyFormData(initial);
    setShowApiKeyForm(provider.id);
  };

  // ============ CONNECT ============
  // Every provider except Airtable connects the same way a real-world app does:
  // the browser is sent to the vendor, the account owner approves access there,
  // and the vendor redirects back to this page. Airtable has no consent screen,
  // so it keeps the personal-access-token form.
  const needsRedirectAuth = (provider: ProviderIntegration) =>
    provider.supportsRedirectAuth ??
    provider.authMethods.some((method) => method === "oauth2" || method === "oauth1");

  // Connect with the credentials already configured on the server (.env). No
  // key ever reaches the browser and the account owner does not paste anything.
  const connectWithServerCredentials = async (provider: ProviderIntegration) => {
    const t = token();
    if (!t) { flash("error", "Please sign in to connect integrations."); return; }
    setConnectingProviderId(provider.id);
    try {
      const res = await fetch(`${API_URL}/api/integrations/credentials`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ provider: provider.id, source: "server" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || `Could not connect ${provider.name}`);
      if (data.data?.verified === false && data.data?.verifyMessage) {
        flash("error", `${provider.name} did not accept the stored credentials — ${data.data.verifyMessage}`);
      } else {
        flash("success", data.message || `Connected to ${provider.name}`);
      }
      await loadProviders();
      void syncProviderData(provider.id);
    } catch (error) {
      flash("error", error instanceof Error ? error.message : `Could not connect ${provider.name}`);
    } finally {
      setConnectingProviderId(null);
    }
  };

  const handleConnect = async (provider: ProviderIntegration) => {
    // Redirect only when the vendor flow is actually configured; otherwise a
    // server-side key (Stripe's platform secret) connects without a detour.
    if (needsRedirectAuth(provider) && provider.oauthConfigured) {
      await startOAuth(provider);
      return;
    }
    // Server-side credentials configured → connect with them, no typing.
    if (provider.apiKeyConfigured) {
      await connectWithServerCredentials(provider);
      return;
    }
    // 3. Manual API key form (provider has apiKey fields but no server env)
    if (provider.authMethods.includes('apiKey') && (provider.credentialFields?.length ?? 0) > 0) {
      openCredentialForm(provider);
      return;
    }
    if (needsRedirectAuth(provider)) {
      const missing = (provider.missingOAuthEnv ?? []).filter(Boolean);
      flash(
        "error",
        missing.length
          ? `${provider.name} needs ${missing.join(" and ")} on the server before its consent screen can open.`
          : `No consent screen is configured for ${provider.name}.`,
      );
      return;
    }
    const missingEnv = [...(provider.missingOAuthEnv ?? []), ...(provider.missingServerCredentialEnv ?? [])];
    if (missingEnv.length) {
      flash("error", `Configure ${missingEnv.join(", ")} in the server .env to connect ${provider.name}.`);
      return;
    }
    flash("error", `No connection method is configured for ${provider.name}.`);
  };

  // Handle API key form submission
  const handleApiKeySubmit = async (providerId: string) => {
    const t = token();
    if (!t) {
      flash("error", "Please sign in to connect integrations.");
      setShowApiKeyForm(null);
      return;
    }
    setApiKeySubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/integrations/credentials`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: providerId,
          credentials: apiKeyFormData,
          source: "user",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Could not connect to ${providerId}`);
      }
      if (data.data?.verified === false && data.data?.verifyMessage) {
        flash("error", `Credentials saved, but the provider rejected them — ${data.data.verifyMessage}`);
      } else {
        flash("success", data.message || `Connected to ${providerId}`);
      }
      await loadProviders();
      void syncProviderData(providerId);
    } catch (error) {
      flash("error", error instanceof Error ? error.message : `Could not connect to ${providerId}`);
    } finally {
      setApiKeySubmitting(false);
      setShowApiKeyForm(null);
    }
  };

  // ============ CSV / EXCEL IMPORT ============
  const importCsvFile = async (file: File) => {
    const t = token();
    if (!t) {
      flash("error", "Please sign in to import data.");
      return;
    }

    // Reject the wrong file type before it is uploaded.
    const check = await validateImportFile(file);
    if (!check.ok) {
      flash("error", check.reason);
      if (csvFileInput.current) csvFileInput.current.value = "";
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("provider", "csv-import");
    if (importRecordType !== "auto") fd.append("recordType", importRecordType);
    setCsvImporting(true);
    try {
      const res = await fetch(`${API_URL}/api/integrations/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Import failed");
      }
      const result = data.data as {
        rowsImported: number;
        stakeholdersCreated: number;
        recordType?: string;
      };
      const destination: Record<string, string> = {
        contacts: "the Network page",
        projects: "the Project Management page",
        tasks: "the Projects and AI views",
        deals: "the Network and AI views",
        invoices: "the Financials page",
        companies: "the AI context",
        generic: "the AI context",
      };
      const where = destination[result.recordType || ""] || "your workspace";
      flash(
        "success",
        result.stakeholdersCreated
          ? `Imported ${result.rowsImported} rows — created ${result.stakeholdersCreated} stakeholders in ${where}.`
          : `Imported ${result.rowsImported} rows from ${file.name} — available in ${where}.`,
      );
      await loadProviders();
    } catch (error) {
      flash("error", error instanceof Error ? error.message : `Could not import ${file.name}`);
    } finally {
      setCsvImporting(false);
      if (csvFileInput.current) csvFileInput.current.value = "";
    }
  };

  // ============ DISCONNECT / SYNC ============
  const handleDisconnect = async (p: ProviderIntegration) => {
    const t = token();
    if (!t) return;
    const res = await fetch(`${API_URL}/api/integrations/disconnect`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ appName: p.id }),
    });
    const data = await res.json();
    if (data.success) {
      flash("success", data.message || `Disconnected from ${p.name}`);
      updateProvider(p.id, {
        connected: false,
        method: null,
        accountName: null,
        recordsImported: 0,
        lastError: null,
      });
      await loadProviders();
    } else {
      flash("error", data.message || "Failed to disconnect");
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const t = token();
      const res = await fetch(`${API_URL}/api/integrations/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        const totals = data.data?.totals;
        flash(
          "success",
          totals && totals.records > 0
            ? `Synced ${totals.providers} integration${totals.providers === 1 ? "" : "s"} — ${totals.records} records`
            : data.message || "No new records were returned",
        );
        await loadProviders();
      } else {
        flash("error", data.message || "Sync failed");
      }
    } catch (e) {
      debugError(e);
      flash("error", "Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  // ============ INIT ============
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const params = new URLSearchParams(window.location.search);
    const ticket = params.get("integration");
    const clearOAuthParams = () => {
      params.delete("integration");
      const query = params.toString();
      const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", cleanUrl);
    };

    // The callback returns an opaque signed ticket, so the page has to ask the
    // server what happened. Nothing about the connection is readable — or
    // forgeable — from the URL itself.
    const handleOAuthResult = async () => {
      if (!ticket) return;
      let result: { provider?: string; status?: string; reason?: string; detail?: string } | null = null;
      try {
        const res = await fetch(`${API_URL}/api/integrations/oauth/result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket }),
        });
        const data = await res.json();
        result = data.success ? data.data : null;
        if (!result) {
          flash("error", data.message || "This integration result has expired. Please try connecting again.");
        }
      } catch (e) {
        debugError(e);
        flash("error", "Could not confirm the integration result. Please refresh the page.");
      } finally {
        clearOAuthParams();
      }

      const providerId = result?.provider;
      if (result?.status === "success") {
        flash("success", `Connected ${providerId} successfully. Syncing data…`);
        localStorage.removeItem("pending_integration");
        if (providerId) void syncProviderData(providerId);
        return;
      }

      if (result?.status === "cancelled") {
        // Declining a consent screen is not an error: the server already sent the
        // browser back to this page, so just confirm nothing changed.
        flash(
          "info",
          `${providerId || "The integration"} was not connected — no changes were made.`,
        );
        localStorage.removeItem("pending_integration");
        return;
      }

      if (result?.status === "error") {
        const reason = result.reason || "unknown_error";
        const detail = result.detail || "";
        const hints: Record<string, string> = {
        invalid_scope:
          "the provider rejected the requested scopes — check the scopes enabled on the OAuth app or set the provider's *_SCOPES env var",
        access_denied: "access was denied on the provider's consent screen",
        token_exchange_failed: "the provider did not return an access token — verify the client credentials and redirect URI",
        tenant_not_found: "no billing organisation was available for this login",
        site_not_found: "no Jira site was available for this login",
        state_expired: "the authorization took too long — please try again",
        not_configured:
          "the server is missing this provider's client id/secret — set them in the server environment and try again",
        state_mismatch: "the approval came back for a different provider — please start the connection again",
        missing_code: "the provider returned without an authorization code — please try again",
        redirect_uri_mismatch:
          "the redirect URI is not registered on the provider's OAuth app — add the callback URL shown in the server logs",
      };
      // Providers fail for setup reasons that are specific to their console, so
      // name the actual next step instead of a generic "access denied".
      const providerHints: Record<string, string> = {
        zoho:
          "the Zoho account you authorised has no Zoho CRM module. Enable Zoho CRM for that account/organisation, or import a CRM CSV export instead.",
        "google-calendar":
          "Google did not complete the handshake. Add the server callback URL as an authorised redirect URI on the Google OAuth client.",
      };
        const specific = providerId ? providerHints[providerId] : undefined;
        flash(
          "error",
          `Could not connect ${providerId}: ${specific || hints[reason] || reason.replace(/_/g, " ")}` +
            (detail ? ` Provider response: "${detail}".` : ""),
        );
        localStorage.removeItem("pending_integration");
      }
    };

    void handleOAuthResult();
    loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = ["All", ...Array.from(new Set(providers.map((p) => p.category)))];
  const filtered = providers.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const grouped = filtered.reduce((acc, p) => {
    (acc[p.category] ||= []).push(p);
    return acc;
  }, {} as Record<string, ProviderIntegration[]>);

  const connectedCount = providers.filter((p) => p.connected).length;
  // Newest successful sync across every connection, shown in the header so the
  // page reflects real state instead of advertising a feature that is not built.
  const lastSyncedAt = providers.reduce<string | null>(
    (latest, p) => (p.lastSync && (!latest || p.lastSync > latest) ? p.lastSync : latest),
    null,
  );

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="relative z-10 border-b border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h1>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search integrations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 w-48"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                {lastSyncedAt
                  ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
                  : "Not synced yet"}
              </div>
              <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={syncing}>
                {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 mb-16">
        {notice && (
          <div
            className={`mb-4 p-4 rounded-xl text-sm flex items-center gap-2 border ${
              notice.kind === "success"
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                : notice.kind === "info"
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
            }`}
          >
            {notice.kind === "error" ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            {notice.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Stat label="Available platforms" value={String(providers.length)} />
          <Stat label="Connected" value={String(connectedCount)} tone="green" />
          <Stat
            label="Records imported"
            value={String(providers.reduce((s, p) => s + (p.recordsImported || 0), 0))}
            tone="blue"
          />
        </div>

        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <Plug className="w-5 h-5 text-blue-600 dark:text-blue-300 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-800 dark:text-blue-200 font-medium">Connect your company systems</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Connect by approving access on the provider’s own site — nothing is stored until you say yes. Airtable takes a
                  personal access token, and any CSV or Excel export imports directly.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                aria-label="Import data type"
                value={importRecordType}
                onChange={(event) => setImportRecordType(event.target.value)}
                className="h-9 rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <option value="auto">Auto-detect</option>
                <option value="contacts">Contacts</option>
                <option value="projects">Projects</option>
                <option value="tasks">Tasks</option>
                <option value="deals">Deals</option>
                <option value="invoices">Invoices / Financials</option>
                <option value="companies">Companies</option>
                <option value="generic">Other rows</option>
              </select>
              <Button
                variant="outline"
                onClick={() => csvFileInput.current?.click()}
                disabled={csvImporting}
              >
                {csvImporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {csvImporting ? "Importing..." : "Import CSV / Excel"}
              </Button>
              <input
                ref={csvFileInput}
                type="file"
                accept={IMPORT_ACCEPT}
                className="hidden"                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void importCsvFile(file);
                    } else if (csvFileInput.current) {
                      csvFileInput.current.value = "";
                    }
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === c
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-white/10"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No integrations found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filter.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{category}</h2>
                <span className="text-sm text-gray-400 dark:text-gray-500">({items.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-4">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className={`h-fit bg-white dark:bg-slate-900 rounded-xl border p-5 transition-all duration-200 flex flex-col ${
                      p.connected
                        ? "border-green-500 dark:border-green-500/50 shadow-sm"
                        : "border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{p.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              CATEGORY_COLORS[p.category] || "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {p.category}
                          </span>
                        </div>
                      </div>
                      {p.connected && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{p.description}</p>

                    {p.needsReauth && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-3">
                        The saved connection was never approved on {p.name}&apos;s own consent screen — reconnect to authorize it.
                      </p>
                    )}

                    {p.lastError && !p.connected && (
                      <p className="text-[11px] text-red-600 dark:text-red-400 mb-3">
                        Last attempt failed: {p.lastError}
                      </p>
                    )}

                    {showApiKeyForm === p.id && (
                      <div className="mb-3 space-y-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Enter credentials for {p.name}</p>
                        {(p.credentialFields || []).map((field) => (
                          <div key={field.key}>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{field.label}{field.required && ' *'}</label>
                            <input
                              type={field.secret ? 'password' : 'text'}
                              value={apiKeyFormData[field.key] || ''}
                              onChange={(e) => setApiKeyFormData({ ...apiKeyFormData, [field.key]: e.target.value })}
                              placeholder={field.placeholder || field.label}
                              className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400"
                            />
                            {field.help && <p className="text-xs text-gray-400 mt-0.5">{field.help}</p>}
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApiKeySubmit(p.id)}
                            disabled={apiKeySubmitting}
                            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {apiKeySubmitting ? 'Connecting...' : 'Connect'}
                          </button>
                          <button
                            onClick={() => setShowApiKeyForm(null)}
                            className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.authMethods
                        .filter((method) => method === "oauth2" || method === "oauth1")
                        .map((method) => (
                          <span
                            key={method}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10"
                          >
                            {method === "oauth1" ? "OAuth 1.0a" : "OAuth 2.0"}
                          </span>
                        ))}
                      {p.apiKeyConfigured && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                          Configured API key
                        </span>
                      )}
                    </div>

                    <div className="mt-auto">
                      {p.connected ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 flex-shrink-0" />
                            Connected
                          </span>
                          {needsRedirectAuth(p) && p.oauthConfigured && (
                            <button
                              onClick={() => void handleConnect(p)}
                              disabled={connectingProviderId === p.id}
                              title={`Reopen ${p.name}'s consent screen`}
                              className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              {connectingProviderId === p.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                              Reconnect
                            </button>
                          )}
                          <button
                            onClick={() => handleDisconnect(p)}
                            className="ml-auto text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex-shrink-0"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => void handleConnect(p)}
                          disabled={connectingProviderId === p.id}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-all flex items-center justify-center gap-2 group"
                        >
                          {connectingProviderId === p.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {needsRedirectAuth(p) ? "Redirecting..." : "Connecting..."}
                            </>
                          ) : (
                            <>
                              Connect
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </>
                          )}
                        </button>
                      )}
                      {(p.credentialFields?.length ?? 0) > 0 && !p.apiKeyConfigured && showApiKeyForm !== p.id && (
                        <button
                          onClick={() => openCredentialForm(p)}
                          className="mt-2 w-full text-[11px] text-gray-500 dark:text-gray-400 underline hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {needsRedirectAuth(p)
                            ? `Consent screen not working? Enter ${p.name} credentials directly`
                            : `Enter ${p.name} credentials`}
                        </button>
                      )}
                      {p.recordsImported > 0 && (
                        <p className="text-[11px] text-gray-400 mt-2">{p.recordsImported} records imported</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {connectedCount === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-8 mt-4">
            <div className="text-6xl mb-4">🔌</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No integrations connected yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Connect a system to give your AI real company data to reason over. Any CSV or Excel export works
              immediately — no API access required.
            </p>
          </div>
        )}
      </main>

    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "blue" }) {
  const color =
    tone === "green"
      ? "text-green-600 dark:text-green-400"
      : tone === "blue"
        ? "text-blue-600 dark:text-blue-400"
        : "text-gray-900 dark:text-white";
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-white/10">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
