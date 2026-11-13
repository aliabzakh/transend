import { NextResponse } from "next/server";
import { ChainError } from "../stellar/submit";
import { escrowErrorName } from "../stellar/escrow";

/** An error with a status and a short machine reason the UI maps to a string. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public reason: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(reason);
  }
}

export const ok = <T extends object>(body: T, status = 200) => NextResponse.json({ ok: true, ...body }, { status });
export const fail = (status: number, reason: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: false, reason, ...extra }, { status });

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route: known errors become `{ ok: false, reason }`; nothing secret is echoed back. */
export function route<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.reason, e.extra);
      const name = escrowErrorName(e);
      if (name) return fail(409, `contract_${name}`);
      if (e instanceof ChainError) {
        console.error("chain error:", e.message);
        return fail(502, "no_signal");
      }
      console.error(e);
      return fail(500, "server_error");
    }
  };
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "bad_input");
  }
}
