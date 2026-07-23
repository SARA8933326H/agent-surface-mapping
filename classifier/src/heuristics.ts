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
  if (page.forms.some((f) => crudMethods.has(f.method) || f.buttons.some((b) => crudButtons.test(b)))) {
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

  // Hidden / internal route detection
  const hiddenTokens = ['internal', 'hidden', 'debug', 'test', 'staging', 'dev', 'api-docs', 'swagger', 'openapi', 'health', 'metrics', '.env', 'config'];
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
  return types;
}

export function classifyForm(form: FormExtract): FunctionalityType[] {
  const types: FunctionalityType[] = [];
  const action = (form.action || '').toLowerCase();
  const method = form.method.toUpperCase();
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
  return types;
}

export function buildClassifications(pages: PageExtract[]): PageClassification[] {
  return pages.map((page) => classifyPage(page));
}
