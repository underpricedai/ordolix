export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      "NOT_FOUND",
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      404,
    );
    this.name = "NotFoundError";
  }
}

export class PermissionError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super("PERMISSION_DENIED", message, 403);
    this.name = "PermissionError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("CONFLICT", message, 409, details);
    this.name = "ConflictError";
  }
}

export class IntegrationError extends AppError {
  constructor(
    integration: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super("INTEGRATION_ERROR", `${integration}: ${message}`, 502, details);
    this.name = "IntegrationError";
  }
}
