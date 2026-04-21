// EventSource wrapper for the analysis stream. Works for both live runs and
// replay-on-reconnect (the backend buffers recent events per analysis).

import { API_BASE } from "./api";
import type { AnalysisEvent, AnalysisEventType } from "./types";

const KNOWN_EVENTS: AnalysisEventType[] = [
  "analysis.started",
  "ticket.fetching",
  "ticket.fetched",
  "ticket.cleaning",
  "ticket.cleaned",
  "ticket.classifying",
  "ticket.completed",
  "ticket.failed",
  "analysis.completed",
  "analysis.failed",
];

export function subscribeAnalysis(
  analysisId: number,
  onEvent: (evt: AnalysisEvent) => void,
  onError?: (err: Event) => void
): () => void {
  const url = `${API_BASE}/api/analyses/${analysisId}/stream`;
  // withCredentials sends the session cookie so the protected stream auth
  // check succeeds under the same policy as our fetch() calls.
  const source = new EventSource(url, { withCredentials: true });

  for (const type of KNOWN_EVENTS) {
    source.addEventListener(type, (raw) => {
      const me = raw as MessageEvent<string>;
      try {
        const data = JSON.parse(me.data);
        onEvent({ type, data });
      } catch (e) {
        console.error("Failed to parse SSE event", type, e);
      }
    });
  }

  source.onerror = (e) => {
    onError?.(e);
    // Browser will auto-reconnect; don't close aggressively.
  };

  return () => source.close();
}
