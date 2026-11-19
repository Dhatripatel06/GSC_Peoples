import { expect, test } from '@playwright/test';

test('home page renders the foundation screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'GSC Peoples' })).toBeVisible();
});

test('web health endpoint responds', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBe(true);
});
