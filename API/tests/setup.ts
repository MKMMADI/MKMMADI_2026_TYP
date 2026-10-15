/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Configures shared setup behavior for API tests.
 */

/// <reference types="node" />

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://test:test@localhost:5432/typ_test';
