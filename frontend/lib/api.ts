const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const u = localStorage.getItem("sm_user");
    if (!u) return "";
    const parsed = JSON.parse(u);
    return parsed.token ?? parsed.access_token ?? "";
  } catch { return ""; }
}

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api/v1${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
  if (res.status === 401) {
    localStorage.removeItem("sm_user");
    window.location.href = "/login";
    throw new Error("Sesi berakhir, silakan login ulang.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export interface IssueCreate {
  keyword: string;
  instagram_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  consent_given?: boolean;
}
export interface Issue {
  id: string; keyword: string;
  instagram_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  created_at: string;
}
export interface MonitoringReport {
  id: string; issue_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  overall_risk?: "low" | "medium" | "high" | "critical";
  risk_scores?: Record<string, number>;
  found_profiles?: Record<string, string>;
  flagged_content?: Array<{
    platform: string; content_snippet: string;
    category: string; severity: string; source_url?: string;
  }>;
  ai_summary?: string; error_message?: string;
  created_at: string; completed_at?: string;
  assessment_status?: "relevant" | "irrelevant";
  assessed_by?: string;
  assessed_by_name?: string;
  assessed_at?: string;
}

export const api = {
  createIssue:  (data: IssueCreate) =>
    req<Issue>("/issues/", { method: "POST", body: JSON.stringify(data) }),
  listIssues:   () => req<Issue[]>("/issues/"),
  getIssue:     (id: string) => req<Issue>(`/issues/${id}`),
  deleteIssue:  (id: string) => req<{ message: string }>(`/issues/${id}`, { method: "DELETE" }),
  getReport:    (issueId: string) => req<MonitoringReport>(`/reports/${issueId}`),
};

// ── Assessment ────────────────────────────────────────
export interface AssessmentUpdate {
  assessment_status: "relevant" | "irrelevant";
}
export const assessReport = (reportId: string, data: AssessmentUpdate) =>
  req<MonitoringReport>(`/reports/${reportId}/assess`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

// ── User Management ───────────────────────────────────
export interface AppUser {
  id: string; email: string; full_name: string;
  role: string; is_active: boolean; created_at: string;
}
export interface UserCreate {
  email: string; full_name: string; password: string; role?: string;
}
export interface UserUpdate {
  full_name?: string; email?: string; password?: string;
  role?: string; is_active?: boolean;
}
export const userApi = {
  list:   ()                          => req<AppUser[]>("/users/"),
  create: (d: UserCreate)             => req<AppUser>("/users/", { method: "POST", body: JSON.stringify(d) }),
  update: (id: string, d: UserUpdate) => req<AppUser>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(d) }),
  delete: (id: string)                => req<{ message: string }>(`/users/${id}`, { method: "DELETE" }),
};
