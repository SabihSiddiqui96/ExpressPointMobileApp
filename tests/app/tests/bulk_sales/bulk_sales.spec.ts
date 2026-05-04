import { loginToExpressPointApp, waitForText } from '../../utils/helpers';

describe('Bulk Sales - Android App', () => {
  it('launches the app and reaches serving options before bulk sales conversion', async () => {
    await loginToExpressPointApp();
    await waitForText(/Serving Options for/i, 30000);

    await expect($('ion-app')).toBeDisplayed();
  });
});
