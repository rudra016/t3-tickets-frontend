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

  login: (username: string, password: string) =>
    apiFetch<{ username: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () => apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  me: () => apiFetch<{ username: string }>("/api/auth/me"),
};

export { ApiError };
