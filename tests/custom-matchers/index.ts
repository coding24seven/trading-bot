import { expect } from '@jest/globals'
import { toBeWithinTolerance } from "./to-be-within-tolerance";

expect.extend({
  toBeWithinTolerance,
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinTolerance(tolerancePercent: number): R;
    }
  }
}
