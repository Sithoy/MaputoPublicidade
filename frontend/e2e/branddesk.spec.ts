import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';

async function register(page: Page) {
  const email = `ci-${randomUUID()}@example.test`;
  const password = randomUUID() + '!aA9';
  await page.goto('/area-cliente/registo');
  await page.getByLabel('Nome', { exact: true }).fill('Cliente');
  await page.getByLabel('Apelido', { exact: true }).fill('CI');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Palavra-passe', { exact: true }).fill(password);
  await page.getByLabel('Confirmar palavra-passe', { exact: true }).fill(password);
  await page.locator('input[name="accept_terms"]').check();
  await page.getByRole('button', { name: 'Criar conta e entrar' }).click();
  await expect(page).toHaveURL(/\/area-cliente$/);
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('mp_access_token')))).toBe(true);
  return { email, password };
}

async function token(page: Page) {
  const value = await page.evaluate(() => localStorage.getItem('mp_access_token'));
  if (!value) throw new Error('Expected an authenticated test account');
  return value;
}

test('client registration, real session and subsequent login', async ({ page }) => {
  const account = await test.step('Given a new client, when they register, then BrandDesk opens', () => register(page));
  await test.step('Then their real API session survives a reload', async () => {
    await page.reload();
    await expect(page).toHaveURL(/\/area-cliente$/);
    const response = await page.request.get('/api/auth/me/', { headers: { Authorization: `Bearer ${await token(page)}` } });
    expect(response.status()).toBe(200);
    expect((await response.json()).email).toBe(account.email);
  });
  await test.step('When they start a new browser session, their credentials still work', async () => {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/area-cliente/login');
    await page.getByLabel('E-mail', { exact: true }).fill(account.email);
    await page.getByLabel('Palavra-passe', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Entrar no BrandDesk' }).click();
    await expect(page).toHaveURL(/\/area-cliente$/);
  });
});

test('brand files stay private and deletion succeeds without a JSON error', async ({ page, browser }) => {
  await register(page);
  await page.goto('/area-cliente/marca');
  await page.getByRole('button', { name: 'Adicionar material' }).click();
  const name = `Logo CI ${randomUUID()}`;
  await page.getByLabel('Nome *', { exact: true }).fill(name);
  await page.getByLabel('Ficheiro *', { exact: true }).setInputFiles({
    name: 'logo.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1sAAAAASUVORK5CYII=', 'base64'),
  });
  const [upload] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/api/brand-assets/') && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Guardar material' }).click(),
  ]);
  expect(upload.status()).toBe(201);
  const asset: { id: number; file: string } = await upload.json();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  const file = await page.request.get(asset.file, { headers: { Authorization: `Bearer ${await token(page)}` } });
  expect(file.status()).toBe(200);
  expect(file.headers()['content-type']).toContain('image/png');

  const otherContext = await browser.newContext({ baseURL: 'http://127.0.0.1:3108' });
  try {
    const otherPage = await otherContext.newPage();
    await register(otherPage);
    const forbidden = await otherPage.request.get(asset.file, { headers: { Authorization: `Bearer ${await token(otherPage)}` } });
    expect(forbidden.status()).toBe(404);
  } finally { await otherContext.close(); }

  page.once('dialog', dialog => void dialog.accept());
  const [deletion] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith(`/api/brand-assets/${asset.id}/`) && response.request().method() === 'DELETE'),
    page.getByRole('button', { name: `Remover ${name}`, exact: true }).click(),
  ]);
  expect(deletion.status()).toBe(204);
  await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
  await expect(page.getByText(/Unexpected end of JSON|Failed to execute 'json'/)).toHaveCount(0);
});
