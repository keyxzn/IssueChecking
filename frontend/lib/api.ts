const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const u = localStorage.getItem("hr_user");
    if (!u) return "";
    const parsed = JSON.parse(u);
    // Support both {token: "..."} and {access_token: "..."}
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
    localStorage.removeItem("hr_user");
    window.location.href = "/login";
    throw new Error("Sesi berakhir, silakan login ulang.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export interface CandidateCreate {
  full_name: string; email: string; phone?: string;
  linkedin_url?: string; instagram_url?: string;
  twitter_url?: string; facebook_url?: string;
  consent_given: boolean;
}
export interface Candidate {
  id: string; full_name: string; email: string; phone?: string;
  linkedin_url?: string; instagram_url?: string;
  twitter_url?: string; facebook_url?: string; created_at: string;
}
export interface ScreeningReport {
  id: string; candidate_id: string;
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
}

export const api = {
  createCandidate: (data: CandidateCreate) =>
    req<Candidate>("/candidates/", { method: "POST", body: JSON.stringify(data) }),
  listCandidates: () => req<Candidate[]>("/candidates/"),
  getCandidate:   (id: string) => req<Candidate>(`/candidates/${id}`),
  deleteCandidate:(id: string) => req<{ message: string }>(`/candidates/${id}`, { method: "DELETE" }),
  getReport:      (candidateId: string) => req<ScreeningReport>(`/reports/${candidateId}`),
};