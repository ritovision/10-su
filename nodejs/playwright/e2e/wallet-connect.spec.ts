import { test, expect } from '@playwright/test';
import { setupTest } from '../wallet';
import { walletConfigFromEnv, logE2eEnvOnce } from '../env';

test.describe('Wallet connect modal', () => {
  test('opens from the Connect Wallet button and connects via the stub', async ({ page }) => {
    logE2eEnvOnce();

    const setup = await setupTest(page, {
      clearStorage: true,
      injectWallet: true,
      walletConfig: walletConfigFromEnv,
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await setup.waitForWagmi();

    const connectButton = page.locator('#connect-wallet');
    await expect(connectButton).toBeVisible({ timeout: 10_000 });
    await connectButton.click();

    const listHeading = page.getByRole('heading', { name: /connect your wallet/i });
    await expect(listHeading).toBeVisible({ timeout: 10_000 });

    const walletButton = page.getByRole('button', { name: new RegExp(walletConfigFromEnv.walletName, 'i') });
    await expect(walletButton).toBeVisible({ timeout: 10_000 });
    await walletButton.click();

    const connectingHeading = page.getByRole('heading', { name: /connecting/i });
    await expect(connectingHeading).toBeVisible({ timeout: 10_000 });

    // Wait for connection to complete - the connect button text changes to "Connected"
    await expect(connectButton).toContainText(/connected/i, { timeout: 15_000 });

    // Wait for modal to fully close (let the animation complete)
    await expect(listHeading).not.toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(500); // Extra buffer for modal close animation

    // Click the connect button again to open the account modal
    await connectButton.click();

    // Now we should see the account modal with disconnect button
    const accountHeading = page.getByRole('heading', { name: /^wallet$/i });
    await expect(accountHeading).toBeVisible({ timeout: 10_000 });

    const disconnectButton = page.getByRole('button', { name: /^disconnect wallet$/i });
    await expect(disconnectButton).toBeVisible({ timeout: 15_000 });
  });
});
