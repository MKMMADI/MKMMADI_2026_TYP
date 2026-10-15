/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Provides shared http error utility functions for the API.
 */

/**
 * Creates an Error carrying the supplied HTTP status code.
 * @param message Human-readable error message for the HTTP response.
 * @param status HTTP status code to associate with the error.
 * @returns An Error instance with the specified HTTP status code.
 */
export function createHttpError(message: string, status = 500) {
  const error = new Error(message) as Error & { status?: number; statusCode?: number };
  error.status = status;
  error.statusCode = status;
  return error;
}
