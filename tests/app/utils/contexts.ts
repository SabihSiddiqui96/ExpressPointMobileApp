export async function switchToExpressPointWebView(): Promise<void> {
  await browser.waitUntil(async () => {
    const contexts = await driver.getContexts();
    return contexts.some(context => String(context).includes('WEBVIEW'));
  }, {
    timeout: 30000,
    timeoutMsg: 'ExpressPoint WebView context was not available.',
  });

  const contexts = await driver.getContexts();
  const webview = contexts.find(context => String(context).includes('WEBVIEW'));
  if (!webview) throw new Error(`No WebView context found. Contexts: ${contexts.join(', ')}`);

  await driver.switchContext(String(webview));
}

export async function switchToNativeApp(): Promise<void> {
  await driver.switchContext('NATIVE_APP');
}
