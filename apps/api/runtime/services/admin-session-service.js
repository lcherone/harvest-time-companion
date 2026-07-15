import { createHash, randomBytes } from "node:crypto";
const LAUNCH_TOKEN_TTL_MS = 60_000;
const SESSION_TTL_MS = 15 * 60_000;
export class AdminSessionService {
    launchTokenTtlMs;
    launchTokens = new Map();
    now;
    sessions = new Map();
    sessionTtlMs;
    constructor(options = {}) {
        this.launchTokenTtlMs = options.launchTokenTtlMs ?? LAUNCH_TOKEN_TTL_MS;
        this.now = options.now ?? Date.now;
        this.sessionTtlMs = options.sessionTtlMs ?? SESSION_TTL_MS;
    }
    createLaunchToken() {
        this.purgeExpired();
        const token = randomToken();
        const expiresAt = this.now() + this.launchTokenTtlMs;
        this.launchTokens.set(hashToken(token), { expiresAt });
        return { expiresAt: new Date(expiresAt), token };
    }
    exchangeLaunchToken(token) {
        this.purgeExpired();
        const tokenHash = hashToken(token);
        const launchToken = this.launchTokens.get(tokenHash);
        if (!launchToken) {
            return null;
        }
        this.launchTokens.delete(tokenHash);
        const sessionId = randomToken();
        const csrfToken = randomToken();
        const expiresAt = this.now() + this.sessionTtlMs;
        this.sessions.set(hashToken(sessionId), { csrfToken, expiresAt });
        return { csrfToken, expiresAt: new Date(expiresAt), sessionId };
    }
    getSession(sessionId) {
        if (!sessionId) {
            return null;
        }
        this.purgeExpired();
        return this.sessions.get(hashToken(sessionId)) ?? null;
    }
    revokeSession(sessionId) {
        if (sessionId) {
            this.sessions.delete(hashToken(sessionId));
        }
    }
    purgeExpired() {
        const now = this.now();
        for (const [key, value] of this.launchTokens) {
            if (value.expiresAt <= now) {
                this.launchTokens.delete(key);
            }
        }
        for (const [key, value] of this.sessions) {
            if (value.expiresAt <= now) {
                this.sessions.delete(key);
            }
        }
    }
}
function randomToken() {
    return randomBytes(32).toString("base64url");
}
function hashToken(token) {
    return createHash("sha256").update(token).digest("base64url");
}
