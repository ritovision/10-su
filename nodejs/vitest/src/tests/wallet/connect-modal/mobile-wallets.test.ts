import {
  buildMobileWalletLaunchUrl,
  clearStoredMobileWallet,
  normalizeExplorerWallets,
  readStoredMobileWallet,
  resolveStoredMobileWallet,
  writeStoredMobileWallet,
} from '@web3/wallet/connect-modal/mobile-wallets.js';

describe('connect-modal/mobile-wallets.js', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14)',
      configurable: true,
    });
    Object.defineProperty(navigator, 'platform', {
      value: 'Linux armv81',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 1,
      configurable: true,
    });
  });

  it('normalizes and filters explorer wallets', () => {
    const wallets = normalizeExplorerWallets({
      listings: {
        okx: {
          id: 'okx',
          name: 'OKX Wallet',
          versions: ['2'],
          chains: ['eip155:1'],
          image_url: { sm: 'https://images.example/okx.png' },
          mobile: { native: 'okex://main', universal: 'https://www.okx.com/download?appendQuery=true' },
        },
        broken: {
          id: 'broken',
          name: 'Broken',
          versions: ['1'],
          chains: ['eip155:1'],
          image_url: { sm: 'https://images.example/broken.png' },
          mobile: { native: 'broken://', universal: '' },
        },
        solanaOnly: {
          id: 'sol',
          name: 'Sol Wallet',
          versions: ['2'],
          chains: ['solana:mainnet'],
          image_url: { sm: 'https://images.example/sol.png' },
          mobile: { native: 'sol://', universal: '' },
        },
        metamask: {
          id: 'metamask',
          name: 'MetaMask',
          versions: ['2'],
          chains: ['eip155:1'],
          image_url: { sm: 'https://images.example/metamask.png' },
          mobile: { native: 'metamask://', universal: 'https://metamask.app.link' },
        },
      },
    });

    expect(wallets).toEqual([
      expect.objectContaining({ id: 'metamask', name: 'MetaMask' }),
      expect.objectContaining({ id: 'okx', name: 'OKX Wallet' }),
    ]);
  });

  it('prefers native links on non-Apple mobile devices', () => {
    const url = buildMobileWalletLaunchUrl({
      id: 'metamask',
      name: 'MetaMask',
      iconUrl: '',
      nativeLink: 'metamask://',
      universalLink: 'https://metamask.app.link',
    }, 'wc:test-uri@2');

    expect(url).toBe('metamask://wc?uri=wc%3Atest-uri%402');
  });

  it('prefers universal links on iPhone-like devices', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
    });
    Object.defineProperty(navigator, 'platform', {
      value: 'iPhone',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      configurable: true,
    });

    const url = buildMobileWalletLaunchUrl({
      id: 'metamask',
      name: 'MetaMask',
      iconUrl: '',
      nativeLink: 'metamask://',
      universalLink: 'https://metamask.app.link',
    }, 'wc:test-uri@2');

    expect(url).toBe('https://metamask.app.link/wc?uri=wc%3Atest-uri%402');
  });

  it('stores only chooser wallet metadata and clears malformed storage', () => {
    writeStoredMobileWallet({
      id: 'rainbow',
      name: 'Rainbow',
      iconUrl: 'https://images.example/rainbow.png',
      nativeLink: 'rainbow://',
      universalLink: 'https://rnbwapp.com',
    });

    expect(readStoredMobileWallet()).toEqual(expect.objectContaining({
      id: 'rainbow',
      name: 'Rainbow',
      nativeLink: 'rainbow://',
    }));

    localStorage.setItem('su.wallet.mobileWallet.lastUsed', '{bad json');
    expect(readStoredMobileWallet()).toBeNull();
    expect(localStorage.getItem('su.wallet.mobileWallet.lastUsed')).toBeNull();
  });

  it('clears stale stored wallets when they no longer exist in the fetched list', () => {
    writeStoredMobileWallet({
      id: 'missing',
      name: 'Missing',
      iconUrl: '',
      nativeLink: 'missing://',
      universalLink: '',
    });

    expect(resolveStoredMobileWallet([
      {
        id: 'metamask',
        name: 'MetaMask',
        iconUrl: '',
        nativeLink: 'metamask://',
        universalLink: 'https://metamask.app.link',
      },
    ])).toBeNull();
    expect(localStorage.getItem('su.wallet.mobileWallet.lastUsed')).toBeNull();

    clearStoredMobileWallet();
  });
});
