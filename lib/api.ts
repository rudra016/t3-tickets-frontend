// Typed client for the FastAPI backend. All paths flow through apiFetch so
// the base URL is configured in one place.

import type {
  AnalysisDetail,
  AnalysisRun,
  DashboardResponse,
  ExploreTicketsResponse,
  TicketAnalysisDetail,
  TicketListResponse,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// UI-only marker: lets proxy.ts know the user *thinks* they're authenticated
// so the gate can let them past /login without calling the backend. Not a
// security boundary — the backend still enforces auth on every request via
// the real HttpOnly session cookie (which lives on the backend origin and is
// invisible to this middleware).
const AUTH_MARKER = "t3_logged_in";

function setLoggedInMarker() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_MARKER}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function clearLoggedInMarker() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_MARKER}=; path=/; max-age=0; SameSite=Lax`;
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    // Send the session cookie on every request so protected endpoints work.
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    // Session expired or forged — bounce to login so the UI doesn't get stuck.
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      !path.startsWith("/api/auth/")
    ) {
      clearLoggedInMarker();
      const next = encodeURIComponent(
        window.location.pathname + window.location.search
      );
      window.location.href = `/login?next=${next}`;
    }
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, `API ${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  listTickets: (params: {
    limit?: number;
    from?: number;
    status?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.from) qs.set("from", String(params.from));
    if (params.status) qs.set("status", params.status);
    const q = qs.toString();
    return apiFetch<TicketListResponse>(`/api/tickets${q ? `?${q}` : ""}`);
  },

  startAnalysis: (ticketIds: string[]) =>
    apiFetch<AnalysisRun>("/api/analyses", {
      method: "POST",
      body: JSON.stringify({ ticket_ids: ticketIds }),
    }),

  listAnalyses: () =>
    apiFetch<{ analyses: AnalysisRun[] }>("/api/analyses"),

  getAnalysis: (id: number) =>
    apiFetch<AnalysisDetail>(`/api/analyses/${id}`),

  getTicketAnalysis: (analysisId: number, ticketId: string) =>
    apiFetch<TicketAnalysisDetail>(
      `/api/analyses/${analysisId}/tickets/${ticketId}`
    ),

  getDashboard: (analysisId: number) =>
    apiFetch<DashboardResponse>(`/api/analyses/${analysisId}/dashboard`),

  listExploreTickets: () =>
    apiFetch<ExploreTicketsResponse>("/api/explore/tickets"),

  // ---- Validation flow ----
  // Same classifier brain as the main flow; runs are tagged kind=validation
  // so they don't mix into the standard analyses/explore views.
  randomValidationTickets: (limit: 10 | 20 | 30) =>
    apiFetch<TicketListResponse & { pool_size: number; limit: number }>(
      `/api/validate/tickets/random?limit=${limit}`
    ),

  startValidation: (ticketIds: string[]) =>
    apiFetch<AnalysisRun>("/api/validate/analyses", {
      method: "POST",
      body: JSON.stringify({ ticket_ids: ticketIds }),
    }),

  listValidationRuns: () =>
    apiFetch<{ analyses: AnalysisRun[] }>("/api/validate/analyses"),

  listValidationTickets: () =>
    apiFetch<ExploreTicketsResponse>("/api/validate/explore/tickets"),

  login: async (username: string, password: string) => {
    const res = await apiFetch<{ username: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setLoggedInMarker();
    return res;
  },

  logout: async () => {
    try {
      return await apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" });
    } finally {
      // Always clear the UI marker even if the server call fails, so the
      // proxy gate stops letting us past /login.
      clearLoggedInMarker();
    }
  },

  me: () => apiFetch<{ username: string }>("/api/auth/me"),
};

export { ApiError };
