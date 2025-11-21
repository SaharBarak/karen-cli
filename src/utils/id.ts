/**
 * ID generation utilities
 */

let counter = 0;

export function generateId(prefix: string = 'KRN'): string {
  counter++;
  return `${prefix}-${String(counter).padStart(4, '0')}`;
}

export function resetCounter(): void {
  counter = 0;
}
