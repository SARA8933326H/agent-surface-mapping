import {
  EndpointExtract,
  EndpointType,
  FormExtract,
  FunctionalityType,
  PageClassification,
  PageExtract,
} from '@surface/shared';

export function classifyPage(page: PageExtract): PageClassification {
  const functionality = new Set<FunctionalityType>();
  const signals: string[] = [];
  const url = page.url.toLowerCase();
  const title = (page.title || '').toLowerCase();
  const text = `${url} ${title}`;

  // Authentication detection
  const authTokens = ['login', 'log-in', 'signin', 'sign-in', 'auth', 'authenticate', 'password', 'reset-password', 'forgot-password', 'token', 'session', 'oauth', 'saml'];
  if (authTokens.some((t) => url.includes(t))) {
    functionality.add(FunctionalityType.AUTH);
    signals.push('auth_url');
  }
  if (page.forms.some((f) => f.fields.some((field) => field.type === 'password'))) {
    functionality.add(FunctionalityType.AUTH);
    signals.push('password_input');
  }
  if (page.forms.some((f) => f.buttons.some((b) => /login|sign in|log in|submit/i.test(b)))) {
    functionality.add(FunctionalityType.AUTH);
    signals.push('auth_button');
  }

  // Admin detection
  const adminTokens = ['admin', 'administrator', 'console', 'panel', 'backoffice', 'back-office', 'cms'];
  if (adminTokens.some((t) => url.includes(t) || title.includes(t))) {
    functionality.add(FunctionalityType.ADMIN);
    signals.push('admin_path');
  }

  // Dashboard detection
  const dashboardTokens = ['dashboard', 'overview', 'home', 'welcome', 'portal'];
  if (dashboardTokens.some((t) => url.includes(t) || title.includes(t))) {
    functionality.add(FunctionalityType.DASHBOARD);
    signals.push('dashboard_path');
  }

  // Search detection
  if (url.includes('search') || url.includes('/q/') || url.includes('query') || page.forms.some((f) => f.fields.some((field) => field.type === 'search'))) {
    functionality.add(FunctionalityType.SEARCH);
    signals.push('search_signal');
  }

  // CRUD detection
  const crudMethods = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);
  const crudButtons = /save|update|delete|create|edit|remove|add new/i;
  if (page.forms.some((f) => crudMethods.has(f.method || 'GET') || f.buttons.some((b) => crudButtons.test(b)))) {
    functionality.add(FunctionalityType.CRUD);
    signals.push('crud_form');
  }
  if (url.includes('edit') || url.includes('delete') || url.includes('create') || url.includes('update')) {
    functionality.add(FunctionalityType.CRUD);
    signals.push('crud_url');
  }

  // Upload detection
  if (page.forms.some((f) => f.fields.some((field) => field.type === 'file'))) {
    functionality.add(FunctionalityType.UPLOAD);
    signals.push('file_input');
  }
  if (url.includes('upload')) {
    functionality.add(FunctionalityType.UPLOAD);
    signals.push('upload_url');
  }

  // Download detection
  if (url.includes('download') || /\.(pdf|zip|csv|xlsx?|docx?)(\?|$)/i.test(page.url)) {
    functionality.add(FunctionalityType.DOWNLOAD);
    signals.push('download_url');
  }
  if (page.extractedLinks.some((l) => /\.(pdf|zip|csv|xlsx?|docx?)(\?|$)/i.test(l))) {
    functionality.add(FunctionalityType.DOWNLOAD);
    signals.push('download_link');
  }

  // API / GraphQL via page context
  if (page.endpoints.some((e) => e.type === EndpointType.REST || e.type === EndpointType.UNKNOWN)) {
    functionality.add(FunctionalityType.API);
    signals.push('api_endpoint');
  }
  if (page.endpoints.some((e) => e.type === EndpointType.GRAPHQL)) {
    functionality.add(FunctionalityType.GRAPHQL);
    signals.push('graphql_endpoint');
  }

  // Payment / billing detection
  const paymentTokens = ['payment', 'checkout', 'billing', 'card', 'stripe', 'paypal', 'wallet', 'subscription', 'invoice'];
  if (paymentTokens.some((t) => url.includes(t) || title.includes(t))) {
    functionality.add(FunctionalityType.PAYMENT);
    signals.push('payment_path');
  }

  // OAuth / SSO detection
  const oauthTokens = ['oauth', 'sso', 'openid', 'saml', 'social', 'signin-with', 'login-with', 'google', 'github', 'facebook'];
  if (oauthTokens.some((t) => url.includes(t) || title.includes(t))) {
    functionality.add(FunctionalityType.OAUTH);
    signals.push('oauth_path');
  }

  // User profile / account detection
  const profileTokens = ['profile', 'my-account', 'account', 'user', 'member'];
  if (profileTokens.some((t) => url.includes(t) || title.includes(t))) {
    functionality.add(FunctionalityType.PROFILE);
    signals.push('profile_path');
  }

  // Settings / preferences detection
  const settingsTokens = ['settings', 'preferences', 'configuration', 'options'];
  if (settingsTokens.some((t) => url.includes(t) || title.includes(t))) {
    functionality.add(FunctionalityType.SETTINGS);
    signals.push('settings_path');
  }

  // Comment / review / feedback detection
  const commentTokens = ['comment', 'review', 'feedback', 'reply', 'rating'];
  if (commentTokens.some((t) => url.includes(t) || title.includes(t))) {
    functionality.add(FunctionalityType.COMMENT);
    signals.push('comment_path');
  }

  // Contact / support detection
  const contactTokens = ['contact', 'support', 'help', 'ticket'];
  if (contactTokens.some((t) => url.includes(t) || title.includes(t))) {
    functionality.add(FunctionalityType.CONTACT);
    signals.push('contact_path');
  }

  // Newsletter / subscription detection
  const newsletterTokens = ['newsletter', 'subscribe', 'mailing', 'email-updates'];
  if (newsletterTokens.some((t) => url.includes(t) || title.includes(t))) {
    functionality.add(FunctionalityType.NEWSLETTER);
    signals.push('newsletter_path');
  }

  // Webhook detection
  if (url.includes('webhook')) {
    functionality.add(FunctionalityType.WEBHOOK);
    signals.push('webhook_path');
  }

  // Reporting / analytics detection
  const reportingTokens = ['report', 'analytics', 'stats', 'insights', 'metrics'];
  if (reportingTokens.some((t) => url.includes(t) || title.includes(t))) {
    functionality.add(FunctionalityType.REPORTING);
    signals.push('reporting_path');
  }

  // Monitoring / status detection
  const monitoringTokens = ['status', 'monitoring', 'uptime', 'health'];
  if (monitoringTokens.some((t) => url.includes(t) || title.includes(t))) {
    functionality.add(FunctionalityType.MONITORING);
    signals.push('monitoring_path');
  }

  // Documentation detection
  const docsTokens = ['docs', 'documentation', 'readme', 'guide', 'tutorial'];
  if (docsTokens.some((t) => url.includes(t) || title.includes(t))) {
    functionality.add(FunctionalityType.DOCS);
    signals.push('docs_path');
  }

  // Hidden / internal route detection
  const hiddenTokens = ['internal', 'hidden', 'debug', 'test', 'staging', 'dev', '.env', 'config'];
  if (hiddenTokens.some((t) => url.includes(t))) {
    functionality.add(FunctionalityType.HIDDEN);
    signals.push('hidden_path');
  }

  // Static functionality if nothing else and only static assets
  if (functionality.size === 0) {
    functionality.add(FunctionalityType.API);
  }

  const confidence = Math.min(0.3 + signals.length * 0.15, 1.0);
  return {
    url: page.url,
    title: page.title,
    functionality: [...functionality],
    confidence,
    reasoning: signals.join(', '),
  };
}

export function classifyEndpoint(endpoint: EndpointExtract): FunctionalityType[] {
  const types: FunctionalityType[] = [];
  const lower = endpoint.url.toLowerCase();
  if (endpoint.type === EndpointType.GRAPHQL || lower.includes('graphql')) {
    types.push(FunctionalityType.GRAPHQL);
  }
  if (endpoint.type === EndpointType.REST || lower.includes('/api/')) {
    types.push(FunctionalityType.API);
  }
  if (lower.includes('login') || lower.includes('auth')) types.push(FunctionalityType.AUTH);
  if (lower.includes('admin')) types.push(FunctionalityType.ADMIN);
  if (lower.includes('upload')) types.push(FunctionalityType.UPLOAD);
  if (lower.includes('download')) types.push(FunctionalityType.DOWNLOAD);
  if (lower.includes('search')) types.push(FunctionalityType.SEARCH);
  if (lower.includes('payment') || lower.includes('checkout') || lower.includes('billing')) types.push(FunctionalityType.PAYMENT);
  if (lower.includes('oauth') || lower.includes('sso') || lower.includes('saml')) types.push(FunctionalityType.OAUTH);
  if (lower.includes('profile') || lower.includes('account')) types.push(FunctionalityType.PROFILE);
  if (lower.includes('settings') || lower.includes('preferences')) types.push(FunctionalityType.SETTINGS);
  if (lower.includes('comment') || lower.includes('review')) types.push(FunctionalityType.COMMENT);
  if (lower.includes('contact') || lower.includes('support')) types.push(FunctionalityType.CONTACT);
  if (lower.includes('newsletter') || lower.includes('subscribe')) types.push(FunctionalityType.NEWSLETTER);
  if (lower.includes('webhook')) types.push(FunctionalityType.WEBHOOK);
  if (lower.includes('report') || lower.includes('analytics')) types.push(FunctionalityType.REPORTING);
  if (lower.includes('health') || lower.includes('status') || lower.includes('monitoring')) types.push(FunctionalityType.MONITORING);
  if (lower.includes('docs') || lower.includes('documentation')) types.push(FunctionalityType.DOCS);
  return types;
}

export function classifyForm(form: FormExtract): FunctionalityType[] {
  const types: FunctionalityType[] = [];
  const action = (form.action || '').toLowerCase();
  const method = (form.method || 'GET').toUpperCase();
  const hasPassword = form.fields.some((f) => f.type === 'password');
  const hasFile = form.fields.some((f) => f.type === 'file');
  const hasSearch = form.fields.some((f) => f.type === 'search');
  const buttonText = form.buttons.join(' ');

  if (hasPassword || action.includes('login') || action.includes('auth') || /login|sign in/i.test(buttonText)) {
    types.push(FunctionalityType.AUTH);
  }
  if (hasFile) types.push(FunctionalityType.UPLOAD);
  if (hasSearch) types.push(FunctionalityType.SEARCH);
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && !hasPassword && !hasFile) {
    types.push(FunctionalityType.CRUD);
  }
  if (action.includes('search')) types.push(FunctionalityType.SEARCH);
  if (action.includes('admin')) types.push(FunctionalityType.ADMIN);
  if (action.includes('payment') || action.includes('checkout') || action.includes('billing')) types.push(FunctionalityType.PAYMENT);
  if (action.includes('profile') || action.includes('account')) types.push(FunctionalityType.PROFILE);
  if (action.includes('settings') || action.includes('preferences')) types.push(FunctionalityType.SETTINGS);
  if (action.includes('comment') || action.includes('review')) types.push(FunctionalityType.COMMENT);
  if (action.includes('contact') || action.includes('support')) types.push(FunctionalityType.CONTACT);
  if (action.includes('newsletter') || action.includes('subscribe')) types.push(FunctionalityType.NEWSLETTER);
  return types;
}

export function buildClassifications(pages: PageExtract[]): PageClassification[] {
  return pages.map((page) => classifyPage(page));
}
