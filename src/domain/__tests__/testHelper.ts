import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export { describe, it };

export function expect<T>(actual: T) {
  return {
    toBe: (expected: T) => assert.strictEqual(actual, expected),
    toEqual: (expected: unknown) => assert.deepStrictEqual(actual, expected),
    toBeGreaterThanOrEqual: (expected: number) =>
      assert.ok((actual as number) >= expected, `Expected ${actual} >= ${expected}`),
    toBeLessThanOrEqual: (expected: number) =>
      assert.ok((actual as number) <= expected, `Expected ${actual} <= ${expected}`),
    toBeGreaterThan: (expected: number) =>
      assert.ok((actual as number) > expected, `Expected ${actual} > ${expected}`),
    toBeLessThan: (expected: number) =>
      assert.ok((actual as number) < expected, `Expected ${actual} < ${expected}`),
    toBeCloseTo: (expected: number, precision = 2) => {
      const diff = Math.abs((actual as number) - expected);
      const tolerance = Math.pow(10, -precision);
      assert.ok(diff <= tolerance, `Expected ${actual} close to ${expected} (diff ${diff})`);
    },
    toBeDefined: () => assert.ok(actual !== undefined, 'Expected value to be defined'),
    toContain: (item: unknown) => {
      if (Array.isArray(actual)) {
        assert.ok(actual.includes(item), `Expected array to contain ${item}`);
      } else if (typeof actual === 'string') {
        assert.ok((actual as string).includes(item as string), `Expected string to contain ${item}`);
      }
    },
    toThrow: () => assert.throws(actual as () => unknown),
  };
}
