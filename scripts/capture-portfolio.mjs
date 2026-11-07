// Real browser captures, never edits of existing screenshots. Synthetic/local only.
import { chromium } from '@playwright/test';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const demo=process.env.SCREENSHOT_DEMO_URL??'http://127.0.0.1:4182';
const real=process.env.SCREENSHOT_FIXTURE_URL??'http://127.0.0.1:4181';
for(const address of [demo,real]) {
  const u=new URL(address);
  if(u.protocol!=='http:' || !['127.0.0.1','localhost'].includes(u.hostname)) throw new Error('Screenshots require an isolated local server.');
}
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH??'/usr/bin/chromium'});
try {
  const context=await browser.newContext({viewport:{width:1366,height:1024},deviceScaleFactor:1,hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'});
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(['127.0.0.1','localhost'].includes(url.hostname)) await route.continue();
    else await route.abort();
  });
  await context.addInitScript(()=>{localStorage.setItem('wb_lang','en');localStorage.setItem('wb_store_id','lisboa');});
  await mkdir(root+'docs/screenshots',{recursive:true});
  await mkdir(root+'public/screenshots',{recursive:true});
  const page=await context.newPage();
  const capture=async name=>{
    await page.waitForTimeout(1500); // Let JS-driven entrance animations settle; not a visual baseline update.
    await page.screenshot({path:root+`docs/screenshots/${name}.png`,animations:'disabled'});
    if(name!=='welcome') await copyFile(root+`docs/screenshots/${name}.png`,root+`public/screenshots/${name}.png`);
  };
  await page.goto(demo);await page.getByTestId('start-quiz').waitFor();await page.evaluate(()=>document.fonts.ready);
  await capture('attract');
  await page.getByTestId('start-quiz').click();await page.getByTestId('start-demo').waitFor();await capture('welcome');
  await page.getByTestId('start-demo').click();await page.getByTestId('dismiss-swipe-tutorial').click();
  await page.getByTestId('quiz-yes').waitFor();await capture('quiz');
  for(let i=0;i<8;i++) await page.getByTestId('quiz-yes').click();
  await page.getByTestId('claim-result').waitFor();await page.waitForFunction(()=>!/scanning/i.test(document.body.innerText));await capture('result');

  // Staff fixture is intentionally isolated from the public demo and all real APIs.
  const manager='93000000-0000-4000-8000-000000000001';
  await page.addInitScript(({manager,fixtureOrigin})=>{
    if(location.origin!==fixtureOrigin) return;
    const encode=value=>btoa(JSON.stringify(value)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    const now=Math.floor(Date.now()/1000);
    const user={id:manager,email:'manager@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},factors:[{id:manager,factor_type:'totp',status:'verified'}]};
    const access_token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:manager,iss:'https://placeholder.supabase.co/auth/v1',aud:'authenticated',role:'authenticated',aal:'aal2',amr:[{method:'totp',timestamp:now}],exp:now+3600,iat:now})+'.c3ludGhldGlj';
    sessionStorage.setItem('suaipe-staff-auth',JSON.stringify({access_token,refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,expires_at:now+3600,user}));
  },{manager,fixtureOrigin:new URL(real).origin});
  await page.route('https://placeholder.supabase.co/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    const fixture=path.endsWith('/get_my_store_role')?[{role:'manager',store_id:null}]
      :path.endsWith('/user')?{id:manager,email:'manager@example.invalid',aud:'authenticated',role:'authenticated',factors:[{id:manager,factor_type:'totp',status:'verified'}]}
      :path.includes('/custom_products')?[{id:'synthetic-catalog',name:'Demo product',description:'Synthetic portfolio fixture',price:'EUR 100',rating:4,tags:['tech'],faq:[],image_url:'/products/lumio-air.png'}]:[];
    await route.fulfill({json:fixture,headers:{'Content-Range':'0-0/1'}});
  });
  await page.goto(real+'/manager');
  await page.getByText('Demo product',{exact:true}).first().waitFor({timeout:15000});
  await page.evaluate(()=>{
    const label=document.createElement('div');label.textContent='DEMO · Synthetic catalog · No customer data';
    Object.assign(label.style,{position:'fixed',bottom:'10px',left:'10px',zIndex:'10000',background:'#0d1117',color:'#fff',padding:'8px 12px',border:'1px solid #22d3ee',borderRadius:'8px',fontSize:'14px'});document.body.appendChild(label);
  });
  await capture('manager');
  await writeFile(root+'docs/screenshots/provenance.json',JSON.stringify({date:new Date().toISOString(),engine:'Chromium '+browser.version(),dimensions:'1366x1024',source:'Actual application builds from this working tree; versioned by the containing commit',portfolio:['attract','welcome','quiz','result'],manager:'Authenticated synthetic fixture, all backend requests intercepted locally; not a hosted authorization test',external_requests:'blocked',customer_data:'none used'},null,2)+'\n');
  console.log('Captured 5 current views using synthetic data; replaced 4 public copies.');
} finally {await browser.close();}
