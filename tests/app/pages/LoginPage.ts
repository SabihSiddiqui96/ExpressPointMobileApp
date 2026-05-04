import { waitForLoadingOverlay } from '../utils/helpers';

export class LoginPage {
  primeroEdgeLoginBtn = () => $('ion-button*=Use PrimeroEdge Login');
  loginBtn = () => $('ion-button*=Login');

  async loginWithPrimeroEdge(username: string, password: string): Promise<void> {
    await this.clickOptionalButton(/Use PrimeroEdge Login/i);

    await this.fillIonInputByPlaceholder('Username', username);
    await this.fillIonInputByPlaceholder('Password', password);

    await this.clickRequiredButton(/Login/i);
    await waitForLoadingOverlay();
  }

  private async fillIonInputByPlaceholder(placeholder: string, value: string): Promise<void> {
    const directInput = await $(`input[placeholder="${placeholder}"]`);
    if (await directInput.isDisplayed().catch(() => false)) {
      await directInput.click();
      await directInput.clearValue();
      await directInput.setValue(value);
      return;
    }

    await browser.waitUntil(async () => {
      return await browser.execute((targetPlaceholder: string) => {
        return Array.from(document.querySelectorAll<HTMLElement>('ion-input, input'))
          .some(el => {
            const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            const nativeInput = el.tagName.toLowerCase() === 'input'
              ? el as HTMLInputElement
              : el.shadowRoot?.querySelector('input') as HTMLInputElement | null;
            return visible && nativeInput?.placeholder === targetPlaceholder;
          });
      }, placeholder);
    }, {
      timeout: 20000,
      timeoutMsg: `${placeholder} input was not visible.`,
    });

    const filled = await browser.execute(({ targetPlaceholder, inputValue }) => {
      const candidate = Array.from(document.querySelectorAll<HTMLElement>('ion-input, input'))
        .find(el => {
          const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          const nativeInput = el.tagName.toLowerCase() === 'input'
            ? el as HTMLInputElement
            : el.shadowRoot?.querySelector('input') as HTMLInputElement | null;
          return visible && nativeInput?.placeholder === targetPlaceholder;
        });

      if (!candidate) return false;

      const nativeInput = candidate.tagName.toLowerCase() === 'input'
        ? candidate as HTMLInputElement
        : candidate.shadowRoot?.querySelector('input') as HTMLInputElement | null;
      if (!nativeInput) return false;

      nativeInput.focus();
      nativeInput.value = inputValue;
      nativeInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      nativeInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

      if (candidate.tagName.toLowerCase() === 'ion-input') {
        (candidate as HTMLInputElement).value = inputValue;
        candidate.dispatchEvent(new CustomEvent('ionInput', {
          bubbles: true,
          composed: true,
          detail: { value: inputValue },
        }));
        candidate.dispatchEvent(new CustomEvent('ionChange', {
          bubbles: true,
          composed: true,
          detail: { value: inputValue },
        }));
      }

      return true;
    }, { targetPlaceholder: placeholder, inputValue: value });

    if (!filled) throw new Error(`Could not fill ${placeholder} input.`);
  }

  private async clickOptionalButton(label: RegExp): Promise<void> {
    await this.clickButton(label, false);
  }

  private async clickRequiredButton(label: RegExp): Promise<void> {
    const clicked = await this.clickButton(label, true);
    if (!clicked) throw new Error(`Could not click button matching ${label}`);
  }

  private async clickButton(label: RegExp, required: boolean): Promise<boolean> {
    const clicked = await browser.execute(({ source, flags }) => {
      const pattern = new RegExp(source, flags);
      const textFor = (el: HTMLElement): string => {
        const shadowText = el.shadowRoot?.textContent ?? '';
        return [
          el.innerText,
          el.textContent,
          shadowText,
          el.getAttribute('aria-label'),
          el.getAttribute('title'),
        ].filter(Boolean).join(' ');
      };

      const button = Array.from(document.querySelectorAll<HTMLElement>('ion-button, button'))
        .find(el => {
          const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          return visible && pattern.test(textFor(el));
        });

      if (button) {
        button.click();
        return true;
      }

      const textMatch = Array.from(document.querySelectorAll<HTMLElement>('body *'))
        .find(el => {
          const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          return visible && pattern.test(textFor(el));
        });
      const clickable = textMatch?.closest('ion-button, button') as HTMLElement | null;
      clickable?.click();
      return !!clickable;
    }, { source: label.source, flags: label.flags || 'i' });

    if (required && !clicked) {
      await browser.pause(500);
    }

    return clicked;
  }
}
