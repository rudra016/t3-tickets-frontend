// Shape of payloads returned by the FastAPI backend. Keep in lockstep with
// backend/app/routes/*.py and backend/app/services/analysis.py.

export type AnalysisStatus = "pending" | "running" | "completed" | "failed";

export type TicketStage =
  | "pending"
  | "fetching"
  | "cleaning"
  | "classifying"
  | "completed"
  | "failed";

export interface TicketListItem {
  id: string;
  ticket_number: string | null;
  subject: string | null;
  status: string | null;
  status_type: string | null;
  channel: string | null;
  department_id: string | null;
  created_time: string | null;
  closed_time: string | null;
  thread_count: string | null;
  comment_count: string | null;
  assignee_id: string | null;
}

export interface TicketListResponse {
  count: number;
  from: number;
  limit: number;
  department_id: string;
  tickets: TicketListItem[];
}

export type RunKind = "standard" | "validation";

export interface AnalysisRun {
  id: number;
  status: AnalysisStatus;
  kind?: RunKind;
  total_tickets: number;
  processed_tickets: number;
  failed_tickets: number;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export interface TicketLabels {
  t3_issue_origin?: string | null;
  t3_issue_resolution?: string | null;
  t3_issue_type?: string | null;
  t3_sub_issue_type?: string | null;
  responsible_dept?: string | null;
  vertical?: string | null;
  tech_needed?: string | boolean | null;
}

export interface TicketAnalysisSummary {
  ticket_id: string;
  ticket_number: string | null;
  status: TicketStage;
  stage: TicketStage | null;
  error: string | null;
  subject: string | null;
  property_name: string | null;
  location_id: string | null;
  labels: TicketLabels | null;
  inferred_issue_origin: string | null;
  inferred_issue_resolution: string | null;
  issue_summary: string | null;
  resolution: string | null;
  confidence: number | null;
  tech_visit_required: boolean | null;
  flags: string[] | null;
}

export interface AnalysisDetail {
  run: AnalysisRun;
  tickets: TicketAnalysisSummary[];
}

export interface CleanedTicket {
  ticket_id: string;
  ticket_number: string | null;
  subject: string | null;
  parsed_subject: {
    property_name: string | null;
    location_id: string | null;
    issue_fragment: string | null;
    timezone: string | null;
    account_type: string | null;
  } | null;
  status: string | null;
  status_type: string | null;
  channel: string | null;
  department_id: string | null;
  created_time: string | null;
  closed_time: string | null;
  thread_count: string | null;
  comment_count: string | null;
  labels: TicketLabels | null;
  comments: Array<{
    index: number;
    commented_time: string | null;
    author: string | null;
    is_public: boolean | null;
    text: string;
    collapsed_count?: number;
  }>;
  threads?: Array<{
    index: number;
    id: string | null;
    created_time: string | null;
    channel: string | null;
    direction: "in" | "out" | string | null;
    author: string | null;
    from: string | null;
    to: string | null;
    is_description: boolean;
    text: string;
  }>;
  conversation: string;
}

export interface TicketClassification {
  issue_summary?: string | null;
  troubleshooting_steps?: string[] | null;
  resolution?: string | null;
  inferred_issue_origin?: string | null;
  inferred_issue_resolution?: string | null;
  inferred_issue_type?: string | null;
  inferred_sub_issue_type?: string | null;
  tech_visit_required?: boolean | null;
  confidence?: number | null;
  reasoning?: string | null;
  flags?: string[] | null;
  _model?: string;
  _source?: "classifier" | "agent_labels" | string;
  _usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface HierarchyTicket {
  analysis_id: number;
  ticket_id: string;
  ticket_number: string | null;
  subject: string | null;
  confidence: number | null;
  source: "classifier" | "agent_labels" | string | null;
}

export interface HierarchyNode {
  label: string;
  count: number;
  children?: HierarchyNode[];
  tickets?: HierarchyTicket[];
}

export interface HierarchyResponse {
  dept_id: string;
  total_tickets: number;
  label_only_tickets: number;
  classifier_tickets: number;
  tree: HierarchyNode[];
}

export interface TicketAnalysisDetail {
  analysis_id: number;
  ticket_id: string;
  ticket_number: string | null;
  status: TicketStage;
  stage: TicketStage | null;
  error: string | null;
  cleaned: CleanedTicket | null;
  classification: TicketClassification | null;
}

export interface ExploreTicket {
  analysis_id: number;
  ticket_id: string;
  ticket_number: string | null;
  subject: string | null;
  property_name: string | null;
  location_id: string | null;
  account_type: string | null;
  status: string;
  labels: TicketLabels | null;
  inferred_issue_origin: string | null;
  inferred_issue_resolution: string | null;
  issue_summary: string | null;
  resolution: string | null;
  confidence: number | null;
  tech_visit_required: boolean | null;
  flags: string[] | null;
  completed_at: string | null;
}

export interface ExploreTicketsResponse {
  count: number;
  tickets: ExploreTicket[];
}

export interface DashboardResponse {
  analysis_id: number;
  total_completed: number;
  origin_distribution: Array<[string, number]>;
  resolution_distribution: Array<[string, number]>;
  account_type_distribution: Array<[string, number]>;
  tech_visit_rate: number | null;
  avg_confidence: number | null;
  avg_resolution_minutes: number | null;
  flags: Array<[string, number]>;
  label_agreement: {
    origin_matches: number;
    origin_compared: number;
    resolution_matches: number;
    resolution_compared: number;
  };
  low_confidence_tickets: Array<{
    ticket_id: string;
    ticket_number: string | null;
    subject: string | null;
    confidence: number;
    inferred_issue_origin: string | null;
  }>;
}

// SSE event contracts ------------------------------------------------------

export type AnalysisEventType =
  | "analysis.started"
  | "ticket.fetching"
  | "ticket.fetched"
  | "ticket.cleaning"
  | "ticket.cleaned"
  | "ticket.classifying"
  | "ticket.completed"
  | "ticket.failed"
  | "analysis.completed"
  | "analysis.failed";

export interface AnalysisEvent<T = Record<string, unknown>> {
  type: AnalysisEventType;
  data: T & { analysis_id: number; ticket_id?: string };
}
