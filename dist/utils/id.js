"use strict";
/**
 * ID generation utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.resetCounter = resetCounter;
let counter = 0;
function generateId(prefix = 'KRN') {
    counter++;
    return `${prefix}-${String(counter).padStart(4, '0')}`;
}
function resetCounter() {
    counter = 0;
}
