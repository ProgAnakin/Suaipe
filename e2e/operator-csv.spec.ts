import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { createCsv } from '../src/lib/csv';

// This is an isolated UI fixture, not proof of hosted Auth/RLS authorization.
test.use({serviceWorkers:'block'});
test('operator import reports a partial save and retries only remaining rows',async({page})=>{
  const writes:string[]=[];let deniedOnce=false;
  await page.route('**/*',async route=>{
    const host=new URL(route.request().url()).hostname;
    if(['127.0.0.1','localhost'].includes(host)) await route.continue();else await route.abort();
  });
  await page.routeWebSocket(/supabase\.co/,socket=>socket.close());
  await page.addInitScript(()=>{
    localStorage.setItem('wb_store_id','lisboa');localStorage.setItem('wb_lang','en');
    const id='94000000-0000-4000-8000-000000000001',now=Math.floor(Date.now()/1000);
    const encode=(value:unknown)=>btoa(JSON.stringify(value)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    const user={id,email:'manager@example.invalid',aud:'authenticated',role:'authenticated',factors:[{id,factor_type:'totp',status:'verified'}]};
    const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:id,aal:'aal2',role:'authenticated',aud:'authenticated',exp:now+3600,iat:now,amr:[{method:'totp',timestamp:now}]})+'.Zml4dHVyZQ';
    sessionStorage.setItem('suaipe-staff-auth',JSON.stringify({access_token:token,refresh_token:'fixture',token_type:'bearer',expires_in:3600,expires_at:now+3600,user}));
  });
  await page.route('https://placeholder.supabase.co/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/product_settings') && route.request().method()==='POST') {
      const raw=route.request().postDataJSON(),row=Array.isArray(raw)?raw[0]:raw;
      writes.push(row.product_id);
      if(row.product_id==='two'&&!deniedOnce) {deniedOnce=true;await route.fulfill({status:403,json:{message:'Fixture save refused',code:'42501'}});}
      else await route.fulfill({status:204});
      return;
    }
    const data=path.endsWith('/get_my_store_role')?[{role:'manager',store_id:null}]
      :path.endsWith('/user')?{id:'94000000-0000-4000-8000-000000000001',email:'manager@example.invalid',factors:[{id:'fixture',factor_type:'totp',status:'verified'}]}
      :path.endsWith('/custom_products')?['one','two'].map((id,i)=>({id,name:i?'Demo Beta':'Demo Alpha',description:'Synthetic fixture',price:i?'€60':'€50',rating:4,tags:['tech'],faq:[]})):[];
    await route.fulfill({json:data});
  });
  await page.goto('/manager');await expect(page.getByText('Demo Alpha',{exact:true})).toBeVisible();
  await page.locator('input[type="file"][accept=".csv"]').setInputFiles({name:'prices.csv',mimeType:'text/csv',buffer:Buffer.from(createCsv([['product_id','price'],['one','€80'],['two','€90']]))});
  const dialog=page.getByRole('dialog',{name:'Confirm price update'});
  await dialog.getByRole('button',{name:'Apply 2',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'Apply 1',exact:true})).toBeEnabled();
  await expect(dialog.getByText('Demo Beta',{exact:true})).toBeVisible();
  await expect(dialog.getByText('Demo Alpha',{exact:true})).toHaveCount(0);
  expect(writes).toEqual(['one','two']);
  await dialog.getByRole('button',{name:'Apply 1',exact:true}).click();await expect(dialog).toBeHidden();
  expect(writes).toEqual(['one','two','two']);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'CSV Template',exact:true}).click();
  const stream=await(await downloadPromise).createReadStream();if(!stream) throw new Error('Expected a local template download.');
  const chunks:Buffer[]=[];for await(const chunk of stream) chunks.push(Buffer.from(chunk));
  const file=Buffer.concat(chunks).toString('utf8');expect(file).toContain('"€80"');expect(file).toContain('"€90"');
});
