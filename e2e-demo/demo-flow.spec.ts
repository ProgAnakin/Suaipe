import { test, expect } from '@playwright/test';
import { translations } from '../src/i18n/translations';
test('synthetic walkthrough completes without any Supabase traffic', async ({ page }) => {
  await page.addInitScript(()=>localStorage.setItem('wb_lang','en'));
  const backendRequests: string[] = [];
  await page.route(/^https:\/\/[^/]+\.supabase\.co\//, async route => {
    backendRequests.push(route.request().url());
    await route.abort();
  });
  page.on('websocket', socket => { if (socket.url().includes('.supabase.co')) backendRequests.push(socket.url()); });
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('DEMO');
  await page.getByTestId('start-quiz').click();
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  await page.getByTestId('start-demo').click();
  await page.getByTestId('dismiss-swipe-tutorial').click();
  await expect(page.getByRole('status')).toContainText('DEMO');
  await expect(page.getByText(translations.en.questions[1],{exact:true})).toBeVisible();
  for (let i=0;i<8;i++) {
    await expect(page.getByTestId('quiz-progress')).toContainText(String(i+1));
    await page.getByTestId('quiz-yes').click();
  }
  await expect(page.getByRole('status')).toContainText('DEMO');
  await page.getByTestId('claim-result').click();
  await expect(page.getByTestId('claim-success')).toContainText('demo@example.invalid');
  await expect(page.getByTestId('claim-success')).toContainText('no email sent');
  expect(backendRequests).toEqual([]);
  await page.getByTestId('restart-quiz').click();
  await expect(page.getByTestId('start-quiz')).toBeVisible();
});

test('demo staff routes never ask for real credentials', async ({page}) => {
  for (const path of ['/manager','/stats','/consulente','/reset-password']) {
    await page.goto(path);
    await expect(page.getByRole('status')).toHaveText('DEMO');
    await expect(page.locator('input[type="password"],input[type="email"]')).toHaveCount(0);
  }
});
