import { classifyPage, classifyEndpoint, classifyForm } from './heuristics';
import { FunctionalityType, PageExtract, EndpointType } from '@surface/shared';

function makePage(overrides: Partial<PageExtract> = {}): PageExtract {
  return {
    url: 'https://example.com/',
    title: '',
    headers: {},
    cookies: [],
    extractedLinks: [],
    forms: [],
    endpoints: [],
    assets: [],
    depth: 0,
    ...overrides,
  };
}

describe('classifyPage', () => {
  it('detects payment functionality', () => {
    const page = makePage({ url: 'https://example.com/checkout', title: 'Checkout' });
    const result = classifyPage(page);
    expect(result.functionality).toContain(FunctionalityType.PAYMENT);
  });

  it('detects OAuth functionality', () => {
    const page = makePage({ url: 'https://example.com/oauth/authorize' });
    const result = classifyPage(page);
    expect(result.functionality).toContain(FunctionalityType.OAUTH);
  });

  it('detects profile functionality', () => {
    const page = makePage({ url: 'https://example.com/profile', title: 'My Account' });
    const result = classifyPage(page);
    expect(result.functionality).toContain(FunctionalityType.PROFILE);
  });

  it('detects settings functionality', () => {
    const page = makePage({ url: 'https://example.com/settings/preferences' });
    const result = classifyPage(page);
    expect(result.functionality).toContain(FunctionalityType.SETTINGS);
  });

  it('detects comment functionality', () => {
    const page = makePage({ url: 'https://example.com/product/reviews' });
    const result = classifyPage(page);
    expect(result.functionality).toContain(FunctionalityType.COMMENT);
  });

  it('detects contact functionality', () => {
    const page = makePage({ url: 'https://example.com/contact-support' });
    const result = classifyPage(page);
    expect(result.functionality).toContain(FunctionalityType.CONTACT);
  });

  it('detects newsletter functionality', () => {
    const page = makePage({ url: 'https://example.com/newsletter/subscribe' });
    const result = classifyPage(page);
    expect(result.functionality).toContain(FunctionalityType.NEWSLETTER);
  });

  it('detects webhook functionality', () => {
    const page = makePage({ url: 'https://example.com/webhooks/config' });
    const result = classifyPage(page);
    expect(result.functionality).toContain(FunctionalityType.WEBHOOK);
  });

  it('detects reporting functionality', () => {
    const page = makePage({ url: 'https://example.com/analytics/report' });
    const result = classifyPage(page);
    expect(result.functionality).toContain(FunctionalityType.REPORTING);
  });

  it('detects monitoring functionality', () => {
    const page = makePage({ url: 'https://example.com/status' });
    const result = classifyPage(page);
    expect(result.functionality).toContain(FunctionalityType.MONITORING);
  });

  it('detects docs functionality', () => {
    const page = makePage({ url: 'https://example.com/docs/api' });
    const result = classifyPage(page);
    expect(result.functionality).toContain(FunctionalityType.DOCS);
  });
});

describe('classifyEndpoint', () => {
  it('classifies payment endpoints', () => {
    const result = classifyEndpoint({ url: 'https://example.com/api/v1/payment', method: 'POST', type: EndpointType.REST });
    expect(result).toContain(FunctionalityType.PAYMENT);
  });

  it('classifies webhook endpoints', () => {
    const result = classifyEndpoint({ url: 'https://example.com/webhooks/stripe', method: 'POST', type: EndpointType.REST });
    expect(result).toContain(FunctionalityType.WEBHOOK);
  });
});

describe('classifyForm', () => {
  it('classifies payment forms', () => {
    const result = classifyForm({
      action: 'https://example.com/checkout/pay',
      method: 'POST',
      fields: [{ name: 'card', type: 'text' }],
      buttons: ['Pay Now'],
    });
    expect(result).toContain(FunctionalityType.PAYMENT);
  });
});
