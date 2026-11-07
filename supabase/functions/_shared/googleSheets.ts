/** A configured Apps Script endpoint may redirect only to Google's documented content host. */
function permitted(url: string): URL {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port ||
      !['script.google.com','script.googleusercontent.com'].includes(parsed.hostname)) throw new Error('Invalid relay destination');
  return parsed;
}
export async function sendToSheets(endpoint: string, body: Record<string,string>, transport: typeof fetch = fetch): Promise<void> {
  let url=permitted(endpoint);
  let method='POST';
  const signal=AbortSignal.timeout(15_000);
  for (let hop=0;hop<4;hop++) {
    const response=await transport(url,{method,headers:method==='POST'?{'Content-Type':'application/json'}:{},
      ...(method==='POST'?{body:JSON.stringify(body)}:{}),redirect:'manual',signal});
    if (response.status>=300 && response.status<400) {
      const location=response.headers.get('location');
      if (!location) throw new Error('Invalid relay redirect');
      url=permitted(new URL(location,url).href);
      if ([301,302,303].includes(response.status)) method='GET';
      continue;
    }
    if (!response.ok) throw new Error('Relay failed');
    return;
  }
  throw new Error('Too many relay redirects');
}
