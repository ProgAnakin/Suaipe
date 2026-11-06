import { test, expect } from '@playwright/test';
test('synthetic walkthrough completes without any Supabase traffic', async ({ page }) => {
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
  for (let i=0;i<8;i++) await page.getByTestId('quiz-yes').click();
  await page.getByTestId('claim-result').click();
  await expect(page.getByTestId('claim-success')).toContainText('demo@example.invalid');
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
