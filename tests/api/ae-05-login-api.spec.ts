
import { test, expect } from '@playwright/test';

type ApiResponse = {
  responseCode: number;
  message: string;
};

test.describe('AE-05 Login API Validation', () => {

  test('@P1 @AE-05 missing email parameter', async ({
    request,
  }) => {
    const response = await request.post(
      '/api/verifyLogin',
      {
        form: {
          password: 'TestPassword123!',
        },
      }
    );

    const body = await response.json() as ApiResponse;

    expect(body.responseCode).toBe(400);
    expect(body.message).toContain(
      'Bad request, email or password parameter is missing'
    );
  });

  test('@P1 @AE-05 invalid credentials', async ({
    request,
  }) => {
    const response = await request.post(
      '/api/verifyLogin',
      {
        form: {
          email: 'unknown-user@example.test',
          password: 'WrongPassword123!',
        },
      }
    );

    const body = await response.json() as ApiResponse;

    expect(body.responseCode).toBe(404);
    expect(body.message).toContain(
      'User not found!'
    );
  });

  test('@P1 @AE-05 unsupported DELETE method', async ({
    request,
  }) => {
    const response = await request.delete(
      '/api/verifyLogin'
    );

    const body = await response.json() as ApiResponse;

    expect(body.responseCode).toBe(405);
    expect(body.message).toContain(
      'This request method is not supported.'
    );
  });

});
