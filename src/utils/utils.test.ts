import { sum } from "./util";

describe('utils', () => {
  describe('sum', () => {
    it('should return the sum of two numbers', () => {
      expect(sum(1, 2, 3, 4)).toBe(10);
    });

    it('should return the 0 by default', () => {
      expect(sum()).toBe(0);
    });
  });
});