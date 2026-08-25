// Test Link: https://dev.azure.com/Cybersoft-Technologies-Inc/PrimeroEdge%20Classic/_testPlans/define?planId=115128&suiteId=115134

import {
  loginToExpressPointApp,
  seedOpenSessionForToday,
  waitForText,
} from '../../utils/helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

const HOMEROOM_PARAMS = {
  grade: 'ALL',
  homeroom: 'Anil-PEI',
  mealType: 'Breakfast',
  item: 'Breakfast Meal',
} as const;

const ROSTER_PARAMS = {
  roster: 'AZAR-SPORTS-ROASTER',
  mealType: 'Breakfast',
  item: 'Breakfast Meal',
} as const;

const ALA_CARTE = { category: 'Fruits-test', item: 'Apple' } as const;
const ADD_FUNDS_KEYS = ['7', '0', '0'];

type BulkSalesMode = 'homeroom' | 'roster';

// ─── Core DOM helpers ─────────────────────────────────────────────────────────
// Ionic shadow DOM elements are flaky with $().click(). We drive most
// interactions through browser.execute() so clicks fire DOM events directly.

async function pause(ms: number): Promise<void> {
  await browser.pause(ms);
}

/** Click an element found by querySelectorAll + optional text match. */
async function domClick(selector: string, matchText?: string): Promise<boolean> {
  return await browser.execute(
    (sel: string, text: string) => {
      const els = Array.from(document.querySelectorAll<HTMLElement>(sel));
      const target = text
        ? els.find(e => (e.textContent || '').toLowerCase().includes(text.toLowerCase()))
        : els[0];
      if (target) {
        target.click();
        return true;
      }
      return false;
    },
    selector,
    matchText ?? '',
  );
}

/**
 * Click a custom dropdown item (ion-item inside app-classroom-sale ion-list)
 * that contains labelContains in its text, then pick optionText from the
 * ion-popover that opens.
 */
async function chooseFromDropdown(labelContains: string, optionText: string): Promise<void> {
  // Click the dropdown row — prefer inside an open modal, fall back to the form.
  const opened = await browser.execute((label: string) => {
    const modal = document.querySelector<HTMLElement>(
      'ion-modal.show-modal, ion-modal[class*="show"]',
    );
    const scope: Element = modal ?? document.querySelector('app-classroom-sale') ?? document.body;
    const items = Array.from(scope.querySelectorAll<HTMLElement>('ion-list ion-item'));
    const target = items.find(el =>
      (el.textContent || '').toLowerCase().includes(label.toLowerCase()),
    );
    if (target) {
      target.click();
      return true;
    }
    return false;
  }, labelContains);

  if (!opened) {
    throw new Error(`Dropdown row not found for label: ${labelContains}`);
  }

  // Wait for popover overlay
  await browser.waitUntil(
    async () =>
      await browser.execute(() => {
        return Array.from(document.querySelectorAll<HTMLElement>('ion-popover')).some(p => {
          const visible = !!(p.offsetWidth || p.offsetHeight || p.getClientRects().length);
          return visible;
        });
      }),
    { timeout: 8000, timeoutMsg: `Dropdown popover did not open for label: ${labelContains}` },
  );

  // Click matching option (exact match, case-insensitive)
  const picked = await browser.execute((option: string) => {
    const popover = document.querySelector<HTMLElement>('ion-popover');
    if (!popover) return false;
    const items = Array.from(popover.querySelectorAll<HTMLElement>('ion-item'));
    const target = items.find(el => {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return text === option.toLowerCase();
    });
    if (target) {
      target.click();
      return true;
    }
    return false;
  }, optionText);

  if (!picked) {
    throw new Error(`Dropdown option not found: ${optionText} for label: ${labelContains}`);
  }

  // Wait for popover to dismiss
  await browser.waitUntil(
    async () =>
      await browser.execute(() => {
        const popovers = Array.from(document.querySelectorAll<HTMLElement>('ion-popover'));
        if (popovers.length === 0) return true;
        return popovers.every(p => {
          const visible = !!(p.offsetWidth || p.offsetHeight || p.getClientRects().length);
          return !visible;
        });
      }),
    { timeout: 8000, timeoutMsg: 'Dropdown popover did not dismiss' },
  );
}

function parseDollarAmount(text: string | null): number {
  return parseFloat((text ?? '').replace(/[^0-9.]/g, '')) || 0;
}

async function modalDollarAmount(label: string): Promise<number> {
  const value = await browser.execute((targetLabel: string) => {
    const modal = document.querySelector<HTMLElement>('ion-modal');
    if (!modal) return '';

    const directText = (el: Element) =>
      Array.from(el.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent ?? '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

    const labels = Array.from(modal.querySelectorAll<HTMLElement>('*'));
    const labelEl = labels.find(
      el => directText(el).toLowerCase() === targetLabel.toLowerCase(),
    );
    const sibling = labelEl?.nextElementSibling as HTMLElement | null;
    if (sibling) {
      const siblingText = directText(sibling);
      if (siblingText) return siblingText;
      if (sibling.textContent) return sibling.textContent;
    }

    const parentChildren = labelEl?.parentElement
      ? (Array.from(labelEl.parentElement.children) as HTMLElement[])
      : [];
    const labelIndex = labelEl ? parentChildren.indexOf(labelEl) : -1;
    return labelIndex >= 0 ? parentChildren[labelIndex + 1]?.textContent ?? '' : '';
  }, label);

  return parseDollarAmount(value as string);
}

async function firstStudentCardVisible(timeoutMs = 15000): Promise<void> {
  await browser.waitUntil(
    async () =>
      await browser.execute(() => {
        const card = document.querySelector<HTMLElement>('ion-row[custom-list] ion-card');
        if (!card) return false;
        return !!(card.offsetWidth || card.offsetHeight || card.getClientRects().length);
      }),
    { timeout: timeoutMs, timeoutMsg: 'First student card not visible' },
  );
}

async function clickFirstStudentCheckbox(): Promise<boolean> {
  return await browser.execute(() => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>('ion-row[custom-list] ion-card'),
    );
    const selectable = cards.find(c => c.querySelector('ion-checkbox'));
    if (!selectable) return false;
    const checkbox = selectable.querySelector<HTMLElement>('ion-checkbox');
    if (!checkbox) return false;
    checkbox.click();
    return true;
  });
}

async function clickStudentActionButton(iconName: 'add' | 'logo-usd'): Promise<boolean> {
  return await browser.execute((icon: string) => {
    const card = document.querySelector<HTMLElement>('ion-row[custom-list] ion-card');
    if (!card) return false;
    const btn = Array.from(card.querySelectorAll<HTMLElement>('ion-button')).find(b => {
      return !!b.querySelector(`ion-icon[name="${icon}"]`);
    });
    if (!btn) return false;
    btn.click();
    return true;
  }, iconName);
}

async function selectableStudentCount(): Promise<number> {
  return await browser.execute(() => {
    return Array.from(
      document.querySelectorAll<HTMLElement>('ion-row[custom-list] ion-card'),
    ).filter(c => !!c.querySelector('ion-checkbox')).length;
  });
}

async function servedStudentCount(): Promise<number> {
  return await browser.execute(() => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>('ion-row[custom-list] ion-card'),
    );
    return cards.filter(card =>
      card.querySelector(
        'ion-icon[name*="checkmark"], ion-icon[aria-label*="checkmark"], [aria-label*="checkmark"]',
      ) || !card.querySelector('ion-checkbox'),
    ).length;
  });
}

async function waitForToastIfPresent(): Promise<void> {
  const appeared = await browser
    .waitUntil(
      async () =>
        await browser.execute(() => {
          const toast = document.querySelector<HTMLElement>('ion-toast');
          if (!toast) return false;
          return !!(toast.offsetWidth || toast.offsetHeight || toast.getClientRects().length);
        }),
      { timeout: 2000, timeoutMsg: 'no toast' },
    )
    .then(() => true)
    .catch(() => false);

  if (!appeared) return;

  await browser
    .waitUntil(
      async () =>
        await browser.execute(() => {
          const toasts = Array.from(document.querySelectorAll<HTMLElement>('ion-toast'));
          return toasts.every(t => {
            const visible = !!(t.offsetWidth || t.offsetHeight || t.getClientRects().length);
            return !visible;
          });
        }),
      { timeout: 15000, timeoutMsg: 'toast did not dismiss' },
    )
    .catch(() => {});
}

async function clickModalButtonByText(text: RegExp | string): Promise<boolean> {
  const pattern = text instanceof RegExp ? text : new RegExp(`^\\s*${text}\\s*$`, 'i');
  return await browser.execute(
    ({ source, flags }: { source: string; flags: string }) => {
      const re = new RegExp(source, flags);
      const modal = document.querySelector<HTMLElement>('ion-modal');
      if (!modal) return false;
      const btn = Array.from(modal.querySelectorAll<HTMLElement>('ion-button, button')).find(b => {
        const t = (b.innerText || b.textContent || '').trim();
        return re.test(t);
      });
      if (!btn) return false;
      btn.click();
      return true;
    },
    { source: pattern.source, flags: pattern.flags || 'i' },
  );
}

async function clickModalKeypadDigit(digit: string): Promise<boolean> {
  return await browser.execute((d: string) => {
    const modal = document.querySelector<HTMLElement>('ion-modal');
    if (!modal) return false;
    const btn = Array.from(modal.querySelectorAll<HTMLElement>('ion-button, button')).find(b => {
      const t = (b.innerText || b.textContent || '').replace(/\s+/g, ' ').trim();
      return t === d;
    });
    if (!btn) return false;
    btn.click();
    return true;
  }, digit);
}

async function clickModalText(text: string): Promise<boolean> {
  return await browser.execute((target: string) => {
    const modal = document.querySelector<HTMLElement>('ion-modal');
    if (!modal) return false;
    const els = Array.from(modal.querySelectorAll<HTMLElement>('*'));
    const match = els.find(el => {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      return t === target;
    });
    if (!match) return false;
    match.click();
    return true;
  }, text);
}

async function modalIsVisible(): Promise<boolean> {
  return await browser.execute(() => {
    const modal = document.querySelector<HTMLElement>('ion-modal');
    if (!modal) return false;
    return !!(modal.offsetWidth || modal.offsetHeight || modal.getClientRects().length);
  });
}

async function waitForModalVisible(timeoutMs = 8000): Promise<void> {
  await browser.waitUntil(modalIsVisible, {
    timeout: timeoutMs,
    timeoutMsg: 'Modal did not appear',
  });
}

async function waitForModalHidden(timeoutMs = 10000): Promise<void> {
  await browser
    .waitUntil(async () => !(await modalIsVisible()), {
      timeout: timeoutMs,
      timeoutMsg: 'Modal did not dismiss',
    })
    .catch(() => {});
}

// ─── Navigation ───────────────────────────────────────────────────────────────

async function navigateToBulkSales(): Promise<void> {
  // Wait for service state to settle (~3s) before reading menu.
  await pause(3000);
  await seedOpenSessionForToday();

  // Click the "Bulk Sales" menu item.
  const clicked = await browser.execute(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('ion-item[detail]'));
    const target = items.find(el =>
      (el.textContent || '').toLowerCase().includes('bulk sales'),
    );
    if (target) {
      target.click();
      return true;
    }
    return false;
  });
  if (!clicked) throw new Error('Bulk Sales menu item not found');

  await pause(3000);

  // If Opening Balance screen appeared, confirm it.
  const hasOpenBalance = await browser.execute(() => {
    return Array.from(document.querySelectorAll<HTMLElement>('h1, h2, ion-title, *')).some(el => {
      const t = (el.textContent || '').trim().toLowerCase();
      const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      return visible && t === 'opening balance';
    });
  });

  if (hasOpenBalance) {
    await domClick('ion-button', 'open service');
    await pause(4000);
    const stillOpening = await browser.execute(() => {
      return Array.from(document.querySelectorAll<HTMLElement>('*')).some(el => {
        const t = (el.textContent || '').trim().toLowerCase();
        const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        return visible && t === 'opening balance';
      });
    });
    if (stillOpening) {
      await domClick('ion-button', 'open service');
      await pause(4000);
    }

    const onBulkSales = await browser.execute(() => {
      return !!document.querySelector('ion-segment-button[value="by_homeroom"]');
    });
    if (!onBulkSales) {
      await browser.execute(() => {
        const items = Array.from(document.querySelectorAll<HTMLElement>('ion-item[detail]'));
        items.find(el => (el.textContent || '').toLowerCase().includes('bulk sales'))?.click();
      });
    }
  }

  await browser.waitUntil(
    async () =>
      await browser.execute(() => {
        const seg = document.querySelector<HTMLElement>('ion-segment-button[value="by_homeroom"]');
        return !!seg && !!(seg.offsetWidth || seg.offsetHeight || seg.getClientRects().length);
      }),
    { timeout: 20000, timeoutMsg: 'Bulk Sales form did not load' },
  );
}

// ─── Load Students ────────────────────────────────────────────────────────────

async function loadStudentsByHomeroom(params: typeof HOMEROOM_PARAMS): Promise<void> {
  await domClick('ion-segment-button[value="by_homeroom"]');
  await pause(500);

  await chooseFromDropdown('Grade', params.grade);
  await chooseFromDropdown('Homeroom', params.homeroom);
  await chooseFromDropdown('Meal Type', params.mealType);
  await chooseFromDropdown('Item', params.item);

  await domClick('ion-button', 'load students');
  await firstStudentCardVisible(15000);
}

async function loadStudentsByRoster(params: typeof ROSTER_PARAMS): Promise<void> {
  await pause(1500);

  await domClick('ion-segment-button[value="by_specialroster"]');
  await pause(800);

  // Verify the tab actually switched
  const switched = await browser.execute(() => {
    const seg = document.querySelector<HTMLElement>(
      'ion-segment-button[value="by_specialroster"]',
    );
    return seg?.getAttribute('aria-selected') === 'true';
  });
  if (!switched) {
    await domClick('ion-segment-button[value="by_specialroster"]');
    await pause(500);
  }

  await chooseFromDropdown('Roster', params.roster);
  await chooseFromDropdown('Meal Type', params.mealType);
  await chooseFromDropdown('Item', params.item);

  await domClick('ion-button', 'load students');
  await firstStudentCardVisible(15000);
}

// ─── Step Helpers ─────────────────────────────────────────────────────────────

/** Step 2 — verify Cancel returns to the form, then reload students. */
async function verifyCancelAndLoadExistingSelection(): Promise<void> {
  await domClick('ion-button', 'cancel');
  await waitForText(/Perform meal sales/i, 8000);
  await domClick('ion-button', 'load students');
  await firstStudentCardVisible(15000);
}

/** Step 3 — check first student checkbox, record sale. */
async function recordSaleForOneStudent(): Promise<void> {
  const servedBefore = await servedStudentCount();
  const selectable = await selectableStudentCount();

  if (selectable === 0) {
    expect(servedBefore).toBeGreaterThan(0);
    return;
  }

  const checked = await clickFirstStudentCheckbox();
  if (!checked) throw new Error('Could not click first student checkbox');

  await browser.waitUntil(
    async () =>
      await browser.execute(() => {
        const card = Array.from(
          document.querySelectorAll<HTMLElement>('ion-row[custom-list] ion-card'),
        ).find(c => c.querySelector('ion-checkbox'));
        return card?.querySelector('ion-checkbox')?.getAttribute('aria-checked') === 'true';
      }),
    { timeout: 5000, timeoutMsg: 'Checkbox did not become checked' },
  );

  await domClick('ion-button', 'record sales');
  await waitForToastIfPresent();

  // After recording, the app navigates back to the bulk sales form. Reload.
  const backOnForm = await browser
    .execute(() => {
      return Array.from(document.querySelectorAll<HTMLElement>('*')).some(el => {
        const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        return visible && /perform meal sales/i.test((el.textContent || '').trim());
      });
    })
    .catch(() => false);

  if (backOnForm) {
    await domClick('ion-button', 'load students');
  }
  await firstStudentCardVisible(15000);
}

/** Step 4 — open $ modal, enter amount, verify newBalance, confirm. */
async function addFundsToStudent(digits: string[]): Promise<void> {
  await firstStudentCardVisible(15000);
  const opened = await clickStudentActionButton('logo-usd');
  if (!opened) throw new Error('Could not click Add Funds button');

  await waitForModalVisible(8000);

  const currentBalance = await modalDollarAmount('Current Balance');

  for (const digit of digits) {
    const ok = await clickModalKeypadDigit(digit);
    if (!ok) throw new Error(`Keypad digit not found: ${digit}`);
  }

  const paymentAmount = Number(digits.join('')) / 100;
  const modalBonusAmount = await modalDollarAmount('Bonus');
  const configuredBonusAmount = await browser.execute(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('Settings') ?? '[]');
      const settings = typeof stored === 'string' ? JSON.parse(stored) : stored;
      return Number(
        (settings as any[]).find(s => s.SettingCode === 'BONUSAMT')?.SettingValue ?? 0,
      );
    } catch {
      return 0;
    }
  });
  const bonusAmount = modalBonusAmount || (configuredBonusAmount as number);
  const newBalance = await modalDollarAmount('New Balance');

  expect(newBalance).toBeCloseTo(currentBalance + paymentAmount + bonusAmount, 2);

  const made = await clickModalButtonByText(/make payment/i);
  if (!made) throw new Error('Make Payment button not found');

  await waitForToastIfPresent();
  await firstStudentCardVisible(10000);
}

/** Step 5 — open + modal, choose category + item, record ala carte sale. */
async function serveAlaCarteItem(category: string, item: string): Promise<void> {
  await firstStudentCardVisible(15000);
  const opened = await clickStudentActionButton('add');
  if (!opened) throw new Error('Could not click Ala Carte button');

  await waitForModalVisible(8000);

  const cat = await clickModalText(category);
  if (!cat) throw new Error(`Ala carte category not found: ${category}`);

  const itm = await clickModalText(item);
  if (!itm) throw new Error(`Ala carte item not found: ${item}`);

  await domClick('ion-button', 'record sales');
  await waitForModalHidden(10000);
  await waitForToastIfPresent();
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

async function runBulkSalesFlow(mode: BulkSalesMode): Promise<void> {
  if (mode === 'homeroom') {
    await loadStudentsByHomeroom(HOMEROOM_PARAMS);
  } else {
    await loadStudentsByRoster(ROSTER_PARAMS);
  }
  await verifyCancelAndLoadExistingSelection();
  await recordSaleForOneStudent();
  await addFundsToStudent(ADD_FUNDS_KEYS);
  await serveAlaCarteItem(ALA_CARTE.category, ALA_CARTE.item);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Bulk Sales - Android App', () => {
  it('Full bulk sales flow via Homeroom and Roster', async () => {
    await loginToExpressPointApp();
    await waitForText(/Serving Options for/i, 30000);

    await navigateToBulkSales();
    await runBulkSalesFlow('homeroom');
    await runBulkSalesFlow('roster');
  });
});
