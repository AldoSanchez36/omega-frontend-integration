export type ReportListView = "summary" | "full";

export interface BuildReportesQueryOptions {
  userRole?: string;
  limit?: number;
  offset?: number;
  view?: ReportListView;
  startDate?: string;
  endDate?: string;
  planta_id?: string;
}

const DEFAULT_LIMIT_ADMIN = 600;
const DEFAULT_LIMIT_CLIENT = 200;
const DEFAULT_LIMIT_USER = 600;

export function getDefaultReportLimit(userRole?: string): number {
  const role = (userRole || "user").toLowerCase();
  if (role === "client") return DEFAULT_LIMIT_CLIENT;
  if (role === "admin") return DEFAULT_LIMIT_ADMIN;
  return DEFAULT_LIMIT_USER;
}

export function buildReportesQueryParams(options: BuildReportesQueryOptions = {}): URLSearchParams {
  const params = new URLSearchParams();
  const limit = options.limit ?? getDefaultReportLimit(options.userRole);
  const offset = options.offset ?? 0;
  const view = options.view ?? "summary";

  params.set("limit", String(limit));
  params.set("offset", String(offset));
  params.set("view", view);

  if (options.startDate) params.set("startDate", options.startDate);
  if (options.endDate) params.set("endDate", options.endDate);
  if (options.planta_id) params.set("planta_id", options.planta_id);

  return params;
}
