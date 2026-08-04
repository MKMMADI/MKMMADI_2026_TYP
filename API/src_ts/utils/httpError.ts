export function createHttpError(message: string, status = 500) {
  const error = new Error(message) as Error & { status?: number; statusCode?: number };
  error.status = status;
  error.statusCode = status;
  return error;
}
