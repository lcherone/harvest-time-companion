import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { ZodError } from "zod";
export class JsonFileError extends Error {
    backupPath;
    details;
    filePath;
    kind;
    label;
    underlyingError;
    constructor(options) {
        super(options.message);
        this.name = "JsonFileError";
        this.backupPath = options.backupPath;
        this.details = options.details;
        this.filePath = options.filePath;
        this.kind = options.kind;
        this.label = options.label;
        this.underlyingError = options.underlyingError;
    }
}
export async function readJsonFile(filePath, schema, options = {}) {
    const label = options.label ?? "JSON file";
    try {
        const raw = await readFile(filePath, "utf8");
        return parseJsonFile(filePath, raw, schema, label);
    }
    catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") {
            return null;
        }
        if (error instanceof JsonFileError) {
            throw error;
        }
        throw new JsonFileError({
            filePath,
            kind: "storage-unavailable",
            label,
            message: `Unable to read ${label} at ${filePath}: ${getErrorMessage(error)}`,
            underlyingError: error
        });
    }
}
export async function recoverInvalidJsonFile(filePath, options = {}) {
    const backupPath = getCorruptBackupPath(filePath, options.now?.() ?? new Date());
    try {
        await rename(filePath, backupPath);
        return backupPath;
    }
    catch (error) {
        throw new JsonFileError({
            filePath,
            kind: "storage-unavailable",
            label: "JSON file",
            message: `Unable to preserve corrupt JSON file at ${filePath} before recovery: ${getErrorMessage(error)}`,
            underlyingError: error
        });
    }
}
export async function writeJsonFileAtomically(filePath, value, options = {}) {
    const directory = dirname(filePath);
    await mkdir(directory, { recursive: true });
    const tempPath = join(directory, `.${basename(filePath)}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`);
    try {
        await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, {
            encoding: "utf8",
            mode: options.mode
        });
        await rename(tempPath, filePath);
    }
    catch (error) {
        await rm(tempPath, { force: true }).catch(() => undefined);
        throw error;
    }
}
function parseJsonFile(filePath, raw, schema, label) {
    let parsedJson;
    try {
        parsedJson = JSON.parse(raw);
    }
    catch (error) {
        throw new JsonFileError({
            filePath,
            kind: "invalid-json",
            label,
            message: `Invalid or partially written ${label} at ${filePath}: ${getErrorMessage(error)}`,
            underlyingError: error
        });
    }
    try {
        return schema.parse(parsedJson);
    }
    catch (error) {
        if (error instanceof ZodError) {
            throw new JsonFileError({
                details: error.flatten(),
                filePath,
                kind: "invalid-schema",
                label,
                message: `Invalid ${label} at ${filePath}: ${error.message}`,
                underlyingError: error
            });
        }
        throw error;
    }
}
function getCorruptBackupPath(filePath, now) {
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    return join(dirname(filePath), `${basename(filePath)}.corrupt-${timestamp}-${randomUUID()}.bak`);
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unknown error";
}
function isNodeError(error) {
    return error instanceof Error && "code" in error;
}
