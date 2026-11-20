import { When, Then } from '@cucumber/cucumber';
import { expect, type APIResponse } from '@playwright/test';
import { AppWorld } from '../support/world';
import { retrySafeApiRequest } from '../utils/selfHealing';

const API_TIMEOUT = 15000;
const MAX_RETRIES = 3;

interface ApiBody {
  responseCode: number;
  message?: string;
  products?: unknown[];
  brands?: unknown[];
}

async function parseResponse(response: APIResponse): Promise<ApiBody> {
  const status = response.status();
  const text = await response.text();

  if (
    [429, 500, 502, 503, 504].includes(status) ||
    /under heavy load|queue full|service unavailable/i.test(text)
  ) {
    throw new Error(
      `ENVIRONMENT_UNAVAILABLE: HTTP ${status}. ${text.slice(0, 250)}`
    );
  }

  if (!response.ok()) {
    throw new Error(
      `API_HTTP_ERROR: HTTP ${status}. ${text.slice(0, 250)}`
    );
  }

  let body: unknown;

  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`API_NON_JSON: ${text.slice(0, 250)}`);
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('responseCode' in body) ||
    typeof body.responseCode !== 'number'
  ) {
    throw new Error(`API_INVALID_RESPONSE: ${text.slice(0, 250)}`);
  }

  return body as ApiBody;
}

async function executeSafeRequest(
  world: AppWorld,
  name: string,
  request: () => Promise<APIResponse>
): Promise<void> {
  const response = await retrySafeApiRequest(
    request,
    world.healingEvents,
    name,
    MAX_RETRIES
  );

  world.apiBody = await parseResponse(response);
}

// Login API scenarios

When(
  'I submit the login API request without an email',
  async function (this: AppWorld) {
    await executeSafeRequest(this, 'Missing email login API', () =>
      this.api.post('/api/verifyLogin', {
        form: { password: 'TestPassword123!' },
        timeout: API_TIMEOUT
      })
    );
  }
);

When(
  'I submit the login API request with invalid credentials',
  async function (this: AppWorld) {
    await executeSafeRequest(this, 'Invalid credentials login API', () =>
      this.api.post('/api/verifyLogin', {
        form: {
          email: 'unknown-user@example.test',
          password: 'WrongPassword123!'
        },
        timeout: API_TIMEOUT
      })
    );
  }
);

When(
  'I send DELETE to the login API',
  async function (this: AppWorld) {
    // This endpoint is expected to reject DELETE without changing state.
    await executeSafeRequest(this, 'Unsupported DELETE login API', () =>
      this.api.delete('/api/verifyLogin', {
        timeout: API_TIMEOUT
      })
    );
  }
);

// Products API scenarios

When(
  'I request the complete products list',
  async function (this: AppWorld) {
    await executeSafeRequest(this, 'Get products', () =>
      this.api.get('/api/productsList', {
        timeout: API_TIMEOUT
      })
    );
  }
);

When(
  'I search products through API using {string}',
  async function (this: AppWorld, keyword: string) {
    await executeSafeRequest(this, 'Search products', () =>
      this.api.post('/api/searchProduct', {
        form: { search_product: keyword },
        timeout: API_TIMEOUT
      })
    );
  }
);

When(
  'I search products through API without a keyword',
  async function (this: AppWorld) {
    await executeSafeRequest(this, 'Search without keyword', () =>
      this.api.post('/api/searchProduct', {
        form: {},
        timeout: API_TIMEOUT
      })
    );
  }
);

When(
  'I send POST to the products list API',
  async function (this: AppWorld) {
    await executeSafeRequest(this, 'Unsupported products POST', () =>
      this.api.post('/api/productsList', {
        timeout: API_TIMEOUT
      })
    );
  }
);

When(
  'I request the complete brands list',
  async function (this: AppWorld) {
    await executeSafeRequest(this, 'Get brands', () =>
      this.api.get('/api/brandsList', {
        timeout: API_TIMEOUT
      })
    );
  }
);

// Shared API assertions

Then(
  'the API response code should be {int}',
  function (this: AppWorld, code: number) {
    expect(this.apiBody).toMatchObject({ responseCode: code });
  }
);

Then(
  'the API message should contain {string}',
  function (this: AppWorld, message: string) {
    expect((this.apiBody as ApiBody).message).toContain(message);
  }
);

Then(
  'the products list should not be empty',
  function (this: AppWorld) {
    const products = (this.apiBody as ApiBody).products;
    expect(Array.isArray(products)).toBe(true);
    expect(products!.length).toBeGreaterThan(0);
  }
);

Then(
  'the API search results should contain products',
  function (this: AppWorld) {
    const products = (this.apiBody as ApiBody).products;
    expect(Array.isArray(products)).toBe(true);
    expect(products!.length).toBeGreaterThan(0);
  }
);

Then(
  'the brands list should not be empty',
  function (this: AppWorld) {
    const brands = (this.apiBody as ApiBody).brands;
    expect(Array.isArray(brands)).toBe(true);
    expect(brands!.length).toBeGreaterThan(0);
  }
);
