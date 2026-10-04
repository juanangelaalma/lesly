import { expect, test } from '@playwright/test';

test('login menampilkan form yang dapat digunakan dan menjaga validasi browser', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Masuk ke akun' })).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveAttribute('type', 'email');
  await expect(page.getByLabel('Kata sandi')).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByLabel('Email')).toBeFocused();
  await page.getByLabel('Email').fill('guru@example.com');
  await page.getByLabel('Kata sandi').fill('password-validasi');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByText('Aplikasi belum terhubung ke Supabase. Lengkapi konfigurasi lingkungan untuk masuk.')).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue('guru@example.com');
});

test('pemulihan kata sandi memiliki jalur kembali dan validasi email', async ({ page }) => {
  await page.goto('/forgot-password');
  await expect(page.getByRole('heading', { name: 'Lupa kata sandi?' })).toBeVisible();
  await page.getByRole('button', { name: 'Kirim tautan pemulihan' }).click();
  await expect(page.getByLabel('Email')).toBeFocused();
  await page.getByLabel('Email').fill('guru@example.com');
  await page.getByRole('button', { name: 'Kirim tautan pemulihan' }).click();
  await expect(page.getByText('Aplikasi belum terhubung ke Supabase. Lengkapi konfigurasi lingkungan untuk melanjutkan.')).toBeVisible();
  await page.getByRole('link', { name: 'Kembali ke masuk' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('halaman guru mengarahkan akun tanpa sesi ke halaman masuk', async ({ page }) => {
  await page.goto('/today');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Masuk ke akun' })).toBeVisible();
});

test('kata sandi baru menolak konfirmasi yang berbeda sebelum menyimpan', async ({ page }) => {
  await page.goto('/update-password');
  const password = page.getByLabel('Kata sandi baru');
  await password.fill('kata-sandi-panjang');
  await page.getByLabel('Ulangi kata sandi').fill('kata-sandi-berbeda');
  await page.getByRole('button', { name: 'Simpan kata sandi baru' }).click();
  await expect(page.getByText('Kata sandi belum sama.')).toBeVisible();
  await expect(password).toHaveValue('kata-sandi-panjang');
});

test('tata letak tidak meluap secara horizontal pada viewport aktif', async ({ page }) => {
  await page.goto('/login');
  const dimensions = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});
