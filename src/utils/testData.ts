import { randomUUID } from 'node:crypto';

export interface DisposableTestAccount {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly title: 'Mr.';
  readonly birthDay: string;
  readonly birthMonth: string;
  readonly birthYear: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly address: string;
  readonly country: string;
  readonly state: string;
  readonly city: string;
  readonly zipcode: string;
  readonly mobileNumber: string;
}

export function createUniqueEmail(): string {
  return `qa-${randomUUID()}@example.test`;
}

export function createDisposableTestAccount(): DisposableTestAccount {
  const identifier = randomUUID();

  return {
    name: `QA User ${identifier.slice(0, 8)}`,
    email: createUniqueEmail(),
    password: identifier,
    title: 'Mr.',
    birthDay: '1',
    birthMonth: 'January',
    birthYear: '1990',
    firstName: 'QA',
    lastName: 'Automation',
    address: '1 Test Street',
    country: 'India',
    state: 'Test State',
    city: 'Test City',
    zipcode: '00000',
    mobileNumber: '0000000000',
  };
}
