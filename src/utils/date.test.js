import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime } from './date';

describe('date utilities', () => {
  describe('formatDate', () => {
    it('should format valid date strings/objects/timestamps to DD-MM-YYYY', () => {
      expect(formatDate('2026-05-27')).toBe('27-05-2026');
      expect(formatDate(new Date('2026-05-27'))).toBe('27-05-2026');
      expect(formatDate(1716768000000)).toBe('27-05-2024'); // timestamp of 2024-05-27 UTC
    });

    it('should return fallback for invalid date strings', () => {
      expect(formatDate('invalid-date')).toBe('-');
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
      expect(formatDate('', 'N/A')).toBe('N/A');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time to DD-MM-YYYY HH:mm:ss', () => {
      const date = new Date('2026-05-27T14:30:15');
      // Format uses local time, so let's construct expected output using date's parts to be timezone-independent
      const expectedDay = String(date.getDate()).padStart(2, '0');
      const expectedMonth = String(date.getMonth() + 1).padStart(2, '0');
      const expectedYear = date.getFullYear();
      const expectedHours = String(date.getHours()).padStart(2, '0');
      const expectedMinutes = String(date.getMinutes()).padStart(2, '0');
      const expectedSeconds = String(date.getSeconds()).padStart(2, '0');
      const expected = `${expectedDay}-${expectedMonth}-${expectedYear} ${expectedHours}:${expectedMinutes}:${expectedSeconds}`;

      expect(formatDateTime(date)).toBe(expected);
    });

    it('should return fallback for invalid inputs', () => {
      expect(formatDateTime('invalid-date')).toBe('-');
      expect(formatDateTime(null)).toBe('-');
      expect(formatDateTime(undefined)).toBe('-');
      expect(formatDateTime('', 'N/A')).toBe('N/A');
    });
  });
});
