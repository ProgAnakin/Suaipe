// Local contract check only. Deployment still requires a real Deno/gateway smoke test.
declare const Deno: { env: { get(name: string): string | undefined } };
declare module 'https://deno.land/std@0.208.0/http/server.ts' {
  export function serve(handler: (request: Request) => Response | Promise<Response>): void;
}
