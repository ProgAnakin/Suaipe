import { test, expect } from '@playwright/test';

for (const marketing of [false,true]) {
  test(`result request preserves the separate marketing choice: ${marketing}`,async({page})=>{
    let submitted:Record<string,unknown>|undefined;
    await page.addInitScript(()=>{localStorage.setItem('wb_store_id','lisboa');localStorage.setItem('wb_lang','en');});
    await page.route('https://placeholder.supabase.co/rest/v1/**',async route=>{
      const resource=new URL(route.request().url()).pathname.split('/').pop();
      if (resource==='kiosk_ready') {await route.fulfill({json:true});return;}
      if (resource==='submit_quiz_session') {
        submitted=route.request().postDataJSON().p_payload;
        await route.fulfill({json:route.request().postDataJSON().p_request_id});return;
      }
      const rows=resource==='custom_products'?[{id:'synthetic-product',name:'Synthetic product',description:'Fixture only',price:'EUR 10',rating:4,tags:['tech'],faq:[]}]:[];
      await route.fulfill({json:resource==='record_quiz_event'?null:rows});
    });
    await page.goto('/');await page.getByTestId('start-quiz').click();
    const choices=page.getByRole('checkbox');await expect(choices).toHaveCount(2);
    await expect(choices.nth(0)).not.toBeChecked();await expect(choices.nth(1)).not.toBeChecked();
    const names=page.locator('input[type="text"]');await names.nth(0).fill('Synthetic');await names.nth(1).fill('Visitor');
    await page.locator('input[type="email"]').fill('synthetic@example.invalid');
    await page.getByTestId('start-real-quiz').click();
    await expect(page.getByTestId('dismiss-swipe-tutorial')).toHaveCount(0);
    await choices.nth(0).check();if(marketing) await choices.nth(1).check();
    await page.getByTestId('start-real-quiz').click();await page.getByTestId('dismiss-swipe-tutorial').click();
    for(let i=0;i<8;i++) {await expect(page.getByTestId('quiz-progress')).toContainText(String(i+1));await page.getByTestId('quiz-yes').click();}
    await page.getByTestId('claim-result').click();await expect(page.getByTestId('claim-success')).toBeVisible();
    expect(submitted).toMatchObject({email:'synthetic@example.invalid',marketing_opt_in:marketing,consent_notice_version:'2026-11-06'});
    if(marketing) expect(submitted?.marketing_notice_version).toBe('marketing-2026-11-07');
    else expect(submitted).not.toHaveProperty('marketing_notice_version');
  });
}
