// Install-as-app support: service worker + an install button that only shows when installing is possible.

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallEvent | null = null;
let onChange: () => void = () => {};

const standalone = () =>
  window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// listen at import time: the event can fire before the game finishes booting
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallEvent;
  onChange();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  onChange();
});

export function initPwa(btn: HTMLElement, toast: (t: string) => void) {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    // updateViaCache 'none': always fetch sw.js itself fresh, so a new build's worker is noticed right away
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' }).catch(() => {});
    console.info('Jahannam Diorama build', __BUILD_ID__);
  }
  // Chrome/Edge/Android give us a prompt; iOS Safari has none, so it gets a how-to toast instead
  const refresh = () => { btn.hidden = standalone() || !(deferred || isIos()); };
  onChange = refresh;
  refresh();
  btn.addEventListener('click', async () => {
    if (deferred) {
      const ev = deferred;
      deferred = null;
      await ev.prompt();
      await ev.userChoice;
      refresh();
    } else toast('Tap Share, then "Add to Home Screen"');
  });
}
