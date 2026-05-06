import { switchToExpressPointWebView } from './contexts';
import { getEnvVar, getRequiredEnvVar } from './env';
import { DeviceConnectionPage } from '../pages/DeviceConnectionPage';
import { LoginPage } from '../pages/LoginPage';

export async function dismissAndroidCompatibilityDialog(): Promise<void> {
  await driver.switchContext('NATIVE_APP').catch(() => {});

  const dontShowAgain = await $('//*[@text="Don\'t Show Again"]');
  if (await dontShowAgain.isDisplayed().catch(() => false)) {
    await dontShowAgain.click();
    await driver.pause(500);
    return;
  }

  const okButton = await $('android=new UiSelector().text("OK")');
  if (await okButton.isDisplayed().catch(() => false)) {
    await okButton.click();
    await driver.pause(500);
  }
}

export async function waitForIonicApp(): Promise<void> {
  await dismissAndroidCompatibilityDialog();
  await switchToExpressPointWebView();
  await browser.waitUntil(async () => {
    return await browser.execute(() => !!document.querySelector('ion-app'));
  }, {
    timeout: 30000,
    timeoutMsg: 'ion-app was not visible in the WebView.',
  });
}

export async function waitForLoadingOverlay(): Promise<void> {
  await browser.waitUntil(async () => {
    return await browser.execute(() => {
      return Array.from(document.querySelectorAll<HTMLElement>('ion-loading'))
        .every(el => {
          const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          const style = getComputedStyle(el);
          return !visible
            || el.getAttribute('aria-hidden') === 'true'
            || el.classList.contains('overlay-hidden')
            || style.display === 'none'
            || style.visibility === 'hidden'
            || style.opacity === '0';
        });
    });
  }, {
    timeout: 30000,
    timeoutMsg: 'Ionic loading overlay did not disappear.',
  });
}

export async function visibleTextIncludes(text: string | RegExp): Promise<boolean> {
  const source = typeof text === 'string' ? text : text.source;
  const flags = typeof text === 'string' ? '' : text.flags;
  const isRegex = text instanceof RegExp;

  return await browser.execute(({ source, flags, isRegex }) => {
    const matches = isRegex
      ? (value: string) => new RegExp(source, flags).test(value)
      : (value: string) => value.includes(source);

    return Array.from(document.querySelectorAll<HTMLElement>('body *')).some(el => {
      const value = el.innerText?.trim() ?? '';
      const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      return visible && matches(value);
    });
  }, { source, flags, isRegex });
}

export async function waitForText(text: string | RegExp, timeout = 20000): Promise<void> {
  await browser.waitUntil(() => visibleTextIncludes(text), {
    timeout,
    timeoutMsg: `Text was not visible: ${text}`,
  });
}

export async function seedOpenSessionForToday(): Promise<number> {
  return await browser.execute(async () => {
    const now = new Date();
    const openDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

    return await new Promise<number>((resolve) => {
      const request = indexedDB.open('_pouch_EXP_TRANSACTIONS');
      request.onerror = () => resolve(0);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('by-sequence', 'readwrite');
        const store = tx.objectStore('by-sequence');
        let updated = 0;

        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) return;

          const doc = cursor.value;
          if (
            /^OpenSession--/.test(doc._doc_id_rev ?? '') &&
            doc.isStillOpen === true
          ) {
            doc.OpenDate = openDate;
            doc.OpenDateWithTime = now.getTime();
            doc.OpenSessionDate = now.getTime();
            cursor.update(doc);
            updated += 1;
          }

          cursor.continue();
        };

        tx.oncomplete = () => {
          db.close();
          resolve(updated);
        };
        tx.onerror = () => {
          db.close();
          resolve(updated);
        };
      };
    });
  });
}

export async function loginToExpressPointApp(): Promise<void> {
  await waitForIonicApp();

  const district = new DeviceConnectionPage();
  await district.searchAndSelectDistrict(
    getRequiredEnvVar('EP_DISTRICT_NAME'),
    getEnvVar('EP_DISTRICT_SEARCH', { required: false }),
  );
  await district.connect();

  const login = new LoginPage();
  await login.loginWithPrimeroEdge(
    getRequiredEnvVar('EP_USERNAME'),
    getRequiredEnvVar('EP_PASSWORD'),
  );

  await waitForText(/Serving Options for/i, 30000);
}
