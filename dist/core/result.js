"use strict";
/**
 * Result monad utilities using neverthrow
 * Similar to Michael Bull's kotlin-result
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KarenError = exports.ErrorCode = exports.err = exports.ok = exports.Result = void 0;
exports.resultify = resultify;
exports.resultifySync = resultifySync;
const neverthrow_1 = require("neverthrow");
var neverthrow_2 = require("neverthrow");
Object.defineProperty(exports, "Result", { enumerable: true, get: function () { return neverthrow_2.Result; } });
Object.defineProperty(exports, "ok", { enumerable: true, get: function () { return neverthrow_2.ok; } });
Object.defineProperty(exports, "err", { enumerable: true, get: function () { return neverthrow_2.err; } });
/**
 * Error types for Karen CLI
 */
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorCode["BROWSER_ERROR"] = "BROWSER_ERROR";
    ErrorCode["CONFIG_ERROR"] = "CONFIG_ERROR";
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["AI_ERROR"] = "AI_ERROR";
    ErrorCode["FILE_SYSTEM_ERROR"] = "FILE_SYSTEM_ERROR";
    ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class KarenError extends Error {
    constructor(code, message, cause) {
        super(message);
        this.code = code;
        this.cause = cause;
        this.name = 'KarenError';
    }
    static networkError(message, cause) {
        return new KarenError(ErrorCode.NETWORK_ERROR, message, cause);
    }
    static browserError(message, cause) {
        return new KarenError(ErrorCode.BROWSER_ERROR, message, cause);
    }
    static configError(message, cause) {
        return new KarenError(ErrorCode.CONFIG_ERROR, message, cause);
    }
    static validationError(message, cause) {
        return new KarenError(ErrorCode.VALIDATION_ERROR, message, cause);
    }
    static aiError(message, cause) {
        return new KarenError(ErrorCode.AI_ERROR, message, cause);
    }
    static fileSystemError(message, cause) {
        return new KarenError(ErrorCode.FILE_SYSTEM_ERROR, message, cause);
    }
    static unknown(message, cause) {
        return new KarenError(ErrorCode.UNKNOWN_ERROR, message, cause);
    }
}
exports.KarenError = KarenError;
/**
 * Utility to wrap async functions in Result
 */
async function resultify(fn, errorMapper) {
    try {
        const result = await fn();
        return (0, neverthrow_1.ok)(result);
    }
    catch (error) {
        const karenError = errorMapper
            ? errorMapper(error)
            : KarenError.unknown('An unexpected error occurred', error);
        return (0, neverthrow_1.err)(karenError);
    }
}
/**
 * Utility to wrap sync functions in Result
 */
function resultifySync(fn, errorMapper) {
    try {
        const result = fn();
        return (0, neverthrow_1.ok)(result);
    }
    catch (error) {
        const karenError = errorMapper
            ? errorMapper(error)
            : KarenError.unknown('An unexpected error occurred', error);
        return (0, neverthrow_1.err)(karenError);
    }
}
