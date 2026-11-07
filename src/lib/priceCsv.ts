import { isValidPrice } from './validators';
export interface PriceUpdate { productId:string;newPrice:string }

/** Bounded CSV with quoted commas/escaped quotes. Reject malformed imports in full. */
export function parsePriceCsv(input:string,knownIds:ReadonlySet<string>):PriceUpdate[] {
  if(new TextEncoder().encode(input).length>1024*1024) throw new Error('CSV must be at most 1 MB.');
  const text=input.replace(/^\uFEFF/,'');
  const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
  const cell=()=>{row.push(field.trim());field='';closed=false;};
  const finish=()=>{cell();if(row.some(Boolean)) rows.push(row);row=[];if(rows.length>5001) throw new Error('At most 5000 products per import.');};
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted) {if(c==='"') {if(text[i+1]==='"'){field+='"';i++;}else {quoted=false;closed=true;}} else field+=c;}
    else if(c===',') cell();
    else if(c==='\n'||c==='\r') {if(c==='\r'&&text[i+1]==='\n') i++;finish();}
    else if(c==='"') {if(field || closed) throw new Error('Invalid CSV quoting.');quoted=true;}
    else if(closed) {if(c.trim()) throw new Error('Invalid CSV quoting.');}
    else field+=c;
  }
  if(quoted) throw new Error('Unclosed CSV quote.');
  if(field||row.length||closed) finish();
  const header=rows.shift();
  if(!header || header.length!==2 || header[0]!=='product_id'||header[1]!=='price') throw new Error('Expected product_id,price header.');
  if(!rows.length) throw new Error('CSV contains no price rows.');
  const seen=new Set<string>();
  return rows.map(columns=>{
    if(columns.length!==2) throw new Error('Expected two columns per product.');
    let productId=columns[0];const newPrice=columns[1];
    // Round-trip the spreadsheet-protection apostrophe only for a known ID.
    if(!knownIds.has(productId) && productId.startsWith("'") && /^[\s]*[=+\-@|%]/.test(productId.slice(1))) productId=productId.slice(1).trim();
    if(!knownIds.has(productId)||seen.has(productId)||newPrice.length>32||!isValidPrice(newPrice)) throw new Error('Unknown/duplicate product or invalid price.');
    seen.add(productId);return {productId,newPrice};
  });
}

/** Stop on the first failed/ambiguous save; successful rows are never reported pending. */
export async function applyPriceUpdates(rows:PriceUpdate[],save:(id:string,price:string)=>Promise<boolean>) {
  let saved=0;
  for(const row of rows) {
    try {if(!await save(row.productId,row.newPrice)) break;}catch {break;}
    saved++;
  }
  return {saved,remaining:rows.slice(saved)};
}
