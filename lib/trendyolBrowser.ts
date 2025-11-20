let chromiumRef: any;

type FetchParams = {
  contentId: string;
  merchantId: string;
  listingId?: string;
};

export async function fetchReviewsWithBrowser({ contentId, merchantId, listingId }: FetchParams) {
  if (!chromiumRef) {
    const mod = await import('playwright');
    chromiumRef = (mod as any).chromium;
  }
  const browser = await chromiumRef.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'tr-TR',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  try {
    await page.goto('https://www.trendyol.com/', { waitUntil: 'domcontentloaded' });
    const base = 'https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/review-read/product-reviews/images';
    const q = new URLSearchParams({
      storefrontId: '1',
      culture: 'tr-TR',
      channelId: '1',
      contentId,
      merchantId,
      page: '0',
    });
    if (listingId) q.set('listingId', listingId);
    const first = await page.evaluate(async (url) => {
      const res = await fetch(url, { headers: { accept: 'application/json, text/plain, */*' } });
      if (!res.ok) throw new Error('first fetch failed: ' + res.status);
      return res.json();
    }, `${base}?${q.toString()}`);
    const totalPages = Number(first.totalPages ?? 0);
    const totalElements = Number(first.totalElements ?? 0);
    const content: any[] = Array.isArray(first.content) ? first.content.slice() : [];
    for (let p = 1; p < totalPages; p++) {
      q.set('page', String(p));
      try {
        const j = await page.evaluate(async (url) => {
          const res = await fetch(url, { headers: { accept: 'application/json, text/plain, */*' } });
          if (!res.ok) return null;
          return res.json();
        }, `${base}?${q.toString()}`);
        if (j && Array.isArray(j.content)) content.push(...j.content);
      } catch {}
      await page.waitForTimeout(300);
    }
    return { content, totalPages, totalElements };
  } finally {
    await context.close();
    await browser.close();
  }
}