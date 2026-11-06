/// <reference types="node" />
// @vitest-environment node
import { safeTemplateHtml, spreadsheetText } from '../../supabase/functions/_shared/contentSafety';
import { readBoundedJson } from '../../supabase/functions/_shared/request';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

// Exercise the real handler with network/runtime boundaries replaced.
function fixture(options: { reserved?: boolean; networkFailure?: boolean; completionFailure?: boolean } = {}) {
  let handler!: (request: Request) => Promise<Response>;
  const updates: Record<string, unknown>[] = [];
  const canonical = { id: 'session-id', email: 'real@example.com', nome: 'Test', cognome: 'Customer', store_id: 'lisboa',
    product_name: 'Product', product_price: '€90', discount_percent: 8, discount_code: 'SUP-1234567808', match_percent: 85, language: 'en' };
  const rpc = vi.fn(async () => ({ data: options.reserved === false ? null : canonical, error: null }));
  const from = vi.fn(() => {
    let columns = '';
    let update: Record<string, unknown> | undefined;
    const query = {
      select(value: string) { columns = value; return query; },
      update(value: Record<string, unknown>) { update = value; updates.push(value); return query; },
      eq() { return query; },
      maybeSingle: async () => ({ data: columns === 'email' ? { email: canonical.email } : null, error: null }),
      then(resolve: (v: unknown) => unknown) { return Promise.resolve({ error: update?.email_status === 'sent' && options.completionFailure ? { message: 'offline' } : null }).then(resolve); },
    };
    return query;
  });
  const fetch = vi.fn(async () => {
    if (options.networkFailure) throw new Error('connection lost');
    return new Response(JSON.stringify({ messageId: 'accepted-id' }), { status: 201 });
  });
  const source = readFileSync('supabase/functions/on-session-created/index.ts', 'utf8').replace(/^import .*;\n/gm, '');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  new Function('serve', 'createClient', 'Deno', 'fetch', 'safeTemplateHtml', 'spreadsheetText', 'readBoundedJson', js)(
    (fn: typeof handler) => { handler = fn; }, () => ({ rpc, from }),
    { env: { get: (key: string) => key === 'WEBHOOK_SECRET' ? 'test-secret' : undefined } }, fetch, safeTemplateHtml, spreadsheetText, readBoundedJson,
  );
  const request = (secret = 'test-secret') => new Request('https://example.com', { method: 'POST',
    headers: { 'x-webhook-secret': secret, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'INSERT', record: { id: 'session-id', email: 'tampered@example.com' } }),
  });
  return { handler, request, fetch, rpc, updates };
}
describe('email webhook', () => {
  it('rejects missing authentication before database or email access', async () => {
    const f = fixture(); await f.handler(f.request(''));
    expect(f.rpc).not.toHaveBeenCalled(); expect(f.fetch).not.toHaveBeenCalled();
  });
  it('does not resend an already reserved session', async () => {
    const f = fixture({ reserved: false }); await f.handler(f.request());
    expect(f.fetch).not.toHaveBeenCalled();
  });
  it('uses the stored recipient and records provider acceptance', async () => {
    const f = fixture(); expect((await f.handler(f.request())).status).toBe(200);
    const call = f.fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(call[1].body)).to[0].email).toBe('real@example.com');
    expect(f.updates).toContainEqual({ email_sent: true, email_status: 'sent', email_provider_id: 'accepted-id' });
  });
  it('marks ambiguous transport failures for reconciliation', async () => {
    const f = fixture({ networkFailure: true });
    expect((await f.handler(f.request())).status).toBe(503);
    expect(f.updates).toContainEqual({ email_status: 'uncertain' });
  });
  it('reports failure when provider acceptance cannot be persisted', async () => {
    const f = fixture({ completionFailure: true });
    expect((await f.handler(f.request())).status).toBe(503);
    expect(f.fetch).toHaveBeenCalledTimes(1);
  });
});
