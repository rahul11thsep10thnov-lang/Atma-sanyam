export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, 'bad_request', details);
export const unauthorized = (message = 'Authentication required') => new HttpError(401, message, 'unauthorized');
export const forbidden = (message = 'You do not have permission to do this') => new HttpError(403, message, 'forbidden');
export const notFound = (message = 'Not found') => new HttpError(404, message, 'not_found');
export const conflict = (message: string) => new HttpError(409, message, 'conflict');
