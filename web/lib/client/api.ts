"use client";
/**
 * Browser side of the API. Every call returns the parsed body or throws ApiError
 * with the server's short reason (mapped to words by the strings files). A network
 * failure is reported as "no_signal".
 */
export class ApiError extends Error {
  constructor(
    public reason: string,
    public status: number,
    public extra: Record<string, unknown> = {},
  ) {
    super(reason);
  }
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("no_signal", 0);
  }
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    if (!res.ok) throw new ApiError(res.status === 504 ? "no_signal" : "server_error", res.status);
    return res as unknown as T;
  }
  const json = (await res.json()) as { ok: boolean; reason?: string } & Record<string, unknown>;
  if (!json.ok) {
    const { ok: _ok, reason, ...extra } = json;
    throw new ApiError(reason ?? "server_error", res.status, extra);
  }
  return json as T;
}

export const apiGet = <T>(path: string) => call<T>("GET", path);
export const apiPost = <T>(path: string, body: unknown = {}) => call<T>("POST", path, body);

/** POSTs and saves the PDF the server returns. The browser keeps no other copy. */
export async function downloadPdf(path: string, body: unknown, fallbackName: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("no_signal", 0);
  }
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/pdf")) {
    let reason = "server_error";
    let extra: Record<string, unknown> = {};
    try {
      const j = await res.json();
      reason = j.reason ?? reason;
      extra = j;
    } catch {
      /* not JSON */
    }
    throw new ApiError(reason, res.status, extra);
  }
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return res;
}
