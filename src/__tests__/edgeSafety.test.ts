// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { safeTemplateHtml, spreadsheetText } from '../../supabase/functions/_shared/contentSafety';
import { readBoundedJson } from '../../supabase/functions/_shared/request';

describe('Server output boundaries', () => {
  it('preserves emphasis but cannot emit attributes or executable tags', () => {
    const result = safeTemplateHtml('<strong>Hello</strong><img src=x onerror=alert(1)><script>alert(1)</script>');
    expect(result).toContain('<strong>Hello</strong>');
    expect(result).not.toContain('<img'); expect(result).not.toContain('<script>');
    expect(safeTemplateHtml('<span onclick=x>Text</span>')).not.toContain('<span onclick');
    expect(safeTemplateHtml('&lt;script&gt;')).toContain('&amp;lt;');
    expect(safeTemplateHtml('<strong style="color:red" onclick="bad()">Hello</strong>')).toBe('<strong>Hello</strong>');
  });
  it('neutralizes formulas before relaying contacts to Sheets', () => {
    expect(spreadsheetText('\t=1+1')).toBe("' =1+1");
    expect(spreadsheetText('Jane')).toBe('Jane');
  });
});
describe('Streaming request limit', () => {
  it('accepts a small JSON request', async () => {
    expect(await readBoundedJson(new Request('https://example.com',{method:'POST',body:'{"ok":true}'}))).toEqual({ok:true});
  });
  it('rejects a body without trusting Content-Length', async () => {
    await expect(readBoundedJson(new Request('https://example.com',{method:'POST',body:JSON.stringify({data:'a'.repeat(1000)})}),100)).rejects.toThrow('Body too large');
  });
});
