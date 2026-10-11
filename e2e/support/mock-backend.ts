// A small, deterministic stand-in for the Supabase backend, used by the browser
// tests (and by the docs-screenshot capture) so the REAL app can be driven end to
// end without a database: PostgREST tables, RPCs, auth, Edge Functions.
//
// It is intentionally strict where the app is: it keeps a request log, enforces
// primary-key uniqueness on inserts, and can inject faults per endpoint (HTTP
// errors, dropped connections, hangs, malformed bodies, slow answers, and the
// nasty one — "lost response": the server applies the write, the client never
// hears back), which is how the retry / duplicate-row / stuck-spinner bugs get
// reproduced.
//
// Nothing here talks to a real service. Every request to a `*.supabase.co` host
// is answered from memory.
import type { BrowserContext, Request, Route } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { products } from "../../src/data/products";
import { questions } from "../../src/data/questions";

export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type Fault =
  | { kind: "status"; status: number; body?: unknown }
  /** the connection fails (fetch() rejects with a TypeError) */
  | { kind: "abort" }
  /** the request is never answered */
  | { kind: "hang" }
  /** HTTP 200 with a JSON content-type but a body that is not JSON */
  | { kind: "malformed" }
  /** answered normally, but `ms` late */
  | { kind: "delay"; ms: number }
  /** the write is applied on the server, but the client never gets the response */
  | { kind: "lost-response" };

export interface FaultOptions {
  /** HTTP method to match (any when omitted) */
  method?: string;
  /** how many matching requests are hit by the fault (default: all of them) */
  times?: number;
  /** let this many matching requests through first */
  skip?: number;
}

export interface LoggedRequest {
  n: number;
  method: string;
  /** pathname, e.g. /rest/v1/quiz_sessions */
  path: string;
  query: string;
  body: unknown;
  /** which fault (if any) was applied */
  fault?: string;
  /** performance-style timestamp, ms since the backend was installed */
  at: number;
}

interface FaultRule {
  path: RegExp;
  method?: string;
  fault: Fault;
  remaining: number;
  skip: number;
}

type RpcHandler = (args: Row, req: LoggedRequest) => unknown;

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "*",
  "access-control-expose-headers": "content-range, content-type",
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── fixtures built from the repo's own bundled data ─────────────────────────────────────────────
/** The bundled demo catalogue as `custom_products` rows (the table the real kiosk reads). */
export function seedCatalog(): Row[] {
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    rating: p.rating,
    image_url: p.image,
    video_url: null,
    tags: p.tags,
    faq: p.faq,
    status: "active",
  }));
}

/** The 8 bundled questions as `quiz_cards` rows (Italian text only, like a fresh install). */
export function seedCards(): Row[] {
  return questions.slice(0, 8).map((q, i) => ({
    id: q.id,
    emoji: q.emoji,
    image_url: null,
    tag: q.category,
    sort_order: i + 1,
    active: true,
    text_it: q.text,
    text_en: null,
    text_pt: null,
    text_es: null,
    text_fr: null,
  }));
}

export function seedTables(): Record<string, Row[]> {
  return {
    custom_products: seedCatalog(),
    quiz_cards: seedCards(),
    product_settings: [],
    product_global_status: [],
    quiz_sessions: [],
    quiz_funnel_events: [],
    email_template: [],
  };
}

// ── PostgREST filter emulation (eq/neq/gt/gte/lt/lte/in/is/like/ilike, order, limit, offset) ─────
const RESERVED = new Set(["select", "order", "limit", "offset", "or", "and", "columns", "on_conflict"]);

/** Numbers compare as numbers, ISO timestamps as instants, everything else as text. */
function cmp(value: unknown, arg: string): number {
  const asTime = (v: unknown) => (typeof v === "string" && /^\d{4}-\d\d-\d\dT/.test(v) ? Date.parse(v) : Number.NaN);
  const [a, b] = [asTime(value), asTime(arg)];
  if (!Number.isNaN(a) && !Number.isNaN(b)) return a - b;
  const [x, y] = [Number(value), Number(arg)];
  if (!Number.isNaN(x) && !Number.isNaN(y)) return x - y;
  return String(value).localeCompare(arg);
}

function matchesOp(value: unknown, op: string, arg: string): boolean {
  switch (op) {
    case "eq": return String(value) === arg;
    case "neq": return String(value) !== arg;
    case "gt": return cmp(value, arg) > 0;
    case "gte": return cmp(value, arg) >= 0;
    case "lt": return cmp(value, arg) < 0;
    case "lte": return cmp(value, arg) <= 0;
    case "is": return arg === "null" ? value == null : String(value) === arg;
    case "in": {
      const list = arg.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
      return list.includes(String(value));
    }
    case "like":
    case "ilike": {
      const re = new RegExp("^" + arg.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$", op === "ilike" ? "i" : "");
      return re.test(String(value ?? ""));
    }
    default: return true;
  }
}

function applyFilters(rows: Row[], params: URLSearchParams): Row[] {
  let out = rows;
  for (const [key, raw] of params.entries()) {
    if (RESERVED.has(key)) continue;
    const m = raw.match(/^(not\.)?([a-z]+)\.(.*)$/s);
    if (!m) continue;
    const [, neg, op, arg] = m;
    out = out.filter((r) => matchesOp(r[key], op, arg) !== !!neg);
  }
  return out;
}

function applyOrder(rows: Row[], order: string | null): Row[] {
  if (!order) return rows;
  const keys = order.split(",").map((s) => {
    const [col, dir = "asc"] = s.split(".");
    return { col, desc: dir === "desc" };
  });
  return [...rows].sort((a, b) => {
    for (const { col, desc } of keys) {
      const av = a[col], bv = b[col];
      if (av === bv) continue;
      const cmp = av == null ? -1 : bv == null ? 1 : av < bv ? -1 : 1;
      return desc ? -cmp : cmp;
    }
    return 0;
  });
}

// ── the backend ─────────────────────────────────────────────────────────────────────────────────
export class MockBackend {
  readonly tables: Record<string, Row[]>;
  readonly requests: LoggedRequest[] = [];
  readonly rpc = new Map<string, RpcHandler>();
  readonly functions = new Map<string, (body: Row) => { status?: number; body: unknown }>();
  private readonly rules: FaultRule[] = [];
  private readonly t0 = Date.now();
  private n = 0;

  constructor(tables: Record<string, Row[]> = seedTables()) {
    this.tables = tables;
    // by default nobody is in e-mail cooldown
    this.rpc.set("check_email_cooldown", () => [{ in_cooldown: false, hours_remaining: 0 }]);
  }

  /** Inject a fault on every request whose path matches `path` (a RegExp or a string contained in the pathname). */
  fail(path: RegExp | string, fault: Fault, opts: FaultOptions = {}): this {
    this.rules.push({
      path: typeof path === "string" ? new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) : path,
      method: opts.method?.toUpperCase(),
      fault,
      remaining: opts.times ?? Infinity,
      skip: opts.skip ?? 0,
    });
    return this;
  }

  clearFaults(): void { this.rules.length = 0; }

  /** Requests whose pathname contains `part` (and optionally a method). */
  calls(part: string | RegExp, method?: string): LoggedRequest[] {
    return this.requests.filter((r) =>
      (typeof part === "string" ? r.path.includes(part) : part.test(r.path)) &&
      (!method || r.method === method.toUpperCase()));
  }

  rows(table: string): Row[] { return this.tables[table] ?? (this.tables[table] = []); }

  /** Resolves once at least `count` requests matching `part` have been logged. */
  async waitFor(part: string | RegExp, { count = 1, method, timeout = 15_000 }: { count?: number; method?: string; timeout?: number } = {}): Promise<void> {
    const t = Date.now();
    while (this.calls(part, method).length < count) {
      if (Date.now() - t > timeout) throw new Error(`mock backend: timed out waiting for ${count}× ${String(part)} (saw ${this.calls(part, method).length})`);
      await sleep(25);
    }
  }

  // ── request handling ───────────────────────────────────────────────────────────────────────────
  async handle(route: Route, request: Request): Promise<void> {
    const url = new URL(request.url());
    const method = request.method();
    if (method === "OPTIONS") return void route.fulfill({ status: 204, headers: CORS });

    let body: unknown = undefined;
    const raw = request.postData();
    if (raw) { try { body = JSON.parse(raw); } catch { body = raw; } }
    const entry: LoggedRequest = {
      n: ++this.n, method, path: url.pathname, query: url.search, body, at: Date.now() - this.t0,
    };
    this.requests.push(entry);

    const rule = this.rules.find((r) => r.path.test(url.pathname) && (!r.method || r.method === method) && r.remaining > 0 && (r.skip > 0 ? (r.skip--, false) : true));
    if (rule) {
      rule.remaining--;
      entry.fault = rule.fault.kind;
      switch (rule.fault.kind) {
        case "status":
          return void route.fulfill({
            status: rule.fault.status, headers: { ...CORS, "content-type": "application/json" },
            body: JSON.stringify(rule.fault.body ?? { code: String(rule.fault.status), message: `injected HTTP ${rule.fault.status}` }),
          });
        case "abort": return void route.abort("failed");
        case "hang": return; // never answered
        case "malformed": return void route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json" }, body: '{"oops": [' });
        case "delay": await sleep(rule.fault.ms); break;
        case "lost-response": {
          await this.respond(route, request, url, entry, body, /* dropResponse */ true);
          return;
        }
      }
    }
    await this.respond(route, request, url, entry, body, false);
  }

  private json(route: Route, data: unknown, status = 200, extra: Record<string, string> = {}, drop = false) {
    if (drop) return route.abort("failed");
    return route.fulfill({ status, headers: { ...CORS, "content-type": "application/json", ...extra }, body: JSON.stringify(data) });
  }

  private async respond(route: Route, request: Request, url: URL, entry: LoggedRequest, body: unknown, drop: boolean): Promise<void> {
    const p = url.pathname;
    const method = request.method();

    // RPC
    let m = p.match(/^\/rest\/v1\/rpc\/([\w]+)$/);
    if (m) {
      const fn = this.rpc.get(m[1]);
      return void this.json(route, fn ? fn((body ?? {}) as Row, entry) : null, 200, {}, drop);
    }

    // PostgREST tables
    m = p.match(/^\/rest\/v1\/([\w]+)$/);
    if (m) {
      const table = m[1];
      const rows = this.rows(table);
      const prefer = request.headers()["prefer"] ?? "";
      if (method === "GET" || method === "HEAD") {
        const filtered = applyOrder(applyFilters(rows, url.searchParams), url.searchParams.get("order"));
        const total = filtered.length;
        const offset = Number(url.searchParams.get("offset") ?? 0);
        const limitParam = url.searchParams.get("limit");
        const limit = limitParam == null ? 1000 /* PostgREST's default max-rows on Supabase */ : Number(limitParam);
        const page = filtered.slice(offset, offset + limit);
        const range = `${page.length ? `${offset}-${offset + page.length - 1}` : "*"}/${total}`;
        const extra: Record<string, string> = /count=/.test(prefer) ? { "content-range": range } : {};
        if ((request.headers()["accept"] ?? "").includes("vnd.pgrst.object")) {
          if (page.length !== 1) return void this.json(route, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }, 406, extra, drop);
          return void this.json(route, page[0], 200, extra, drop);
        }
        if (method === "HEAD") return void route.fulfill({ status: 200, headers: { ...CORS, ...extra }, body: "" });
        return void this.json(route, page, 200, extra, drop);
      }
      if (method === "POST") {
        const incoming = (Array.isArray(body) ? body : [body]) as Row[];
        const stored: Row[] = [];
        for (const r of incoming) {
          const row = { id: r.id ?? randomUUID(), created_at: new Date().toISOString(), ...r };
          if (rows.some((x) => x.id === row.id)) {
            if (/ignore-duplicates/.test(prefer)) continue;
            return void this.json(route, { code: "23505", message: `duplicate key value violates unique constraint "${table}_pkey"` }, 409, {}, drop);
          }
          rows.push(row);
          stored.push(row);
        }
        if (/return=representation/.test(prefer)) return void this.json(route, stored, 201, {}, drop);
        return void (drop ? route.abort("failed") : route.fulfill({ status: 201, headers: CORS, body: "" }));
      }
      if (method === "PATCH") {
        const hit = applyFilters(rows, url.searchParams);
        hit.forEach((r) => Object.assign(r, body as Row));
        return void this.json(route, /return=representation/.test(prefer) ? hit : null, /return=representation/.test(prefer) ? 200 : 204, {}, drop);
      }
      if (method === "DELETE") {
        const hit = new Set(applyFilters(rows, url.searchParams));
        this.tables[table] = rows.filter((r) => !hit.has(r));
        return void (drop ? route.abort("failed") : route.fulfill({ status: 204, headers: CORS, body: "" }));
      }
    }

    // Edge Functions
    m = p.match(/^\/functions\/v1\/([\w-]+)$/);
    if (m) {
      const fn = this.functions.get(m[1]);
      const out = fn ? fn((body ?? {}) as Row) : { status: 200, body: { ok: true } };
      return void this.json(route, out.body, out.status ?? 200, {}, drop);
    }

    // anything else (auth, storage, realtime long-poll…): an empty, successful answer
    return void this.json(route, [], 200, {}, drop);
  }
}

/** Route every `*.supabase.co` request of the context to a fresh (or given) mock backend. */
export async function installMockBackend(context: BrowserContext, backend: MockBackend = new MockBackend()): Promise<MockBackend> {
  await context.route(/^https:\/\/[^/]*\.supabase\.co\//, (route, request) => backend.handle(route, request));
  return backend;
}
