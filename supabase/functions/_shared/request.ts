export async function readBoundedJson(request: Request, limit = 16384): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Invalid body');
  const chunks: Uint8Array[] = [];
  let length = 0;
  let timedOut = false;
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  const deadline = setTimeout(() => { timedOut = true; cancel(); }, 5_000);
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) throw new Error('Body too large');
      chunks.push(value);
    }
    if (timedOut) throw new Error('Body timed out');
  } catch (error) { cancel(); throw error; }
  finally { clearTimeout(deadline); reader.releaseLock(); }
  const data = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(data));
}
