export class HttpError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, code, message, details) {
        super(message);
        this.name = "HttpError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}
export class ServiceUnavailableError extends HttpError {
    constructor(message, details) {
        super(503, "SERVICE_UNAVAILABLE", message, details);
        this.name = "ServiceUnavailableError";
    }
}
