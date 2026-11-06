export async function readBoundedJson(request: Request, limit = 16384): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Invalid body');
  const chunks: Uint8Array[] = [];
  let length = 0;
  let timedOut = false;
  const deadline = setTimeout(() => { timedOut = true; void reader.cancel(); }, 5_000);
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) throw new Error('Body too large');
      chunks.push(value);
    }
    if (timedOut) throw new Error('Body timed out');
  } catch (error) { await reader.cancel(); throw error; }
  finally { clearTimeout(deadline); }
  const data = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(data));
}
