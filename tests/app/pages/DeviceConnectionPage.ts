import { waitForLoadingOverlay, waitForText } from '../utils/helpers';

export class DeviceConnectionPage {
  districtSearchInput = () => $('ion-searchbar input');
  connectButton = () => $('ion-button*=Connect');

  async searchAndSelectDistrict(districtName: string, searchText = districtName): Promise<void> {
    const search = await this.districtSearchInput();
    await search.waitForDisplayed({ timeout: 20000 });
    await search.click();
    await search.setValue(searchText);

    await waitForLoadingOverlay();
    await this.waitForDistrictResult(searchText, districtName);

    const selected = await browser.execute(({ name, search }) => {
      const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
      const districts = Array.from(document.querySelectorAll<HTMLElement>('ion-list ion-item'))
        .filter(el => {
          const text = (el.innerText ?? '').toLowerCase();
          const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          return visible
            && !/no district was identified/i.test(text)
            && (text.includes(name.toLowerCase()) || tokens.every(token => text.includes(token)));
        });
      const district = districts[0];
      district?.click();
      return !!district;
    }, { name: districtName, search: searchText });

    if (!selected) throw new Error(`Could not select district: ${districtName}`);
  }

  private async waitForDistrictResult(searchText: string, districtName: string): Promise<void> {
    await browser.waitUntil(async () => {
      return await browser.execute(({ name, search }) => {
        const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
        return Array.from(document.querySelectorAll<HTMLElement>('ion-list ion-item'))
          .some(el => {
            const text = (el.innerText ?? '').toLowerCase();
            const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            return visible
              && !/no district was identified/i.test(text)
              && (text.includes(name.toLowerCase()) || tokens.every(token => text.includes(token)));
          });
      }, { name: districtName, search: searchText });
    }, {
      timeout: 30000,
      timeoutMsg: `District result was not visible for search: ${searchText}`,
    });
  }

  async connect(): Promise<void> {
    const button = await this.connectButton();
    await button.waitForDisplayed({ timeout: 15000 });
    await button.click();
    await waitForLoadingOverlay();
  }
}
