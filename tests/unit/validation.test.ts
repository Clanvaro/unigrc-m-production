import { describe, it, expect } from 'vitest';
import { 
  sanitizeValue,
  sanitizeObject,
  sanitizePath,
  isValidEmail,
  isValidUrl,
  isValidCode
} from '../../server/validation/input-sanitizer';

describe('Input Validation - Unit Tests', () => {
  describe('sanitizeValue', () => {
    it('should remove HTML tags and dangerous content', () => {
      const input = '<script>alert("XSS")</script>John';
      const result = sanitizeValue(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should remove null bytes', () => {
      const input = '/test\0/file';
      const result = sanitizeValue(input);
      expect(result).toBe('/test/file');
    });

    it('should handle arrays', () => {
      const input = ['<script>evil</script>', 'safe', '<b>bold</b>'];
      const result = sanitizeValue(input);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).not.toContain('<script>');
    });

    it('should preserve safe strings', () => {
      const input = 'This is a safe string';
      const result = sanitizeValue(input);
      expect(result).toBe('This is a safe string');
    });
  });

  describe('sanitizeObject', () => {
    it('should remove dollar signs from keys', () => {
      const input = { $gt: 5, $ne: null, normalKey: 'value' };
      const result = sanitizeObject(input);
      expect(result.$gt).toBeUndefined();
      expect(result.gt).toBeDefined();
      expect(result.normalKey).toBe('value');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<b>Test</b>',
          data: { value: 'safe value' }
        }
      };
      const result = sanitizeObject(input);
      // DOMPurify allows <b> tags as they're in ALLOWED_TAGS
      expect(result.user.name).toContain('Test');
      expect(result.user.data.value).toBe('safe value');
    });

    it('should sanitize values recursively', () => {
      const input = {
        items: ['<script>test</script>', 'safe'],
        nested: { value: 'test' }
      };
      const result = sanitizeObject(input);
      expect(result.items[0]).not.toContain('<script>');
    });
  });

  describe('sanitizePath', () => {
    it('should remove path traversal attempts', () => {
      expect(sanitizePath('../../../etc/passwd')).not.toContain('..');
      expect(sanitizePath('..\\..\\windows')).not.toContain('..');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizePath('file<>*.txt')).not.toContain('<');
      expect(sanitizePath('test:|file')).not.toContain(':');
    });

    it('should remove leading slashes', () => {
      const result = sanitizePath('/etc/passwd');
      expect(result.startsWith('/')).toBe(false);
    });

    it('should preserve valid filenames', () => {
      const result = sanitizePath('documents/report.pdf');
      expect(result).toBe('documents/report.pdf');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://test.org/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
    });
  });

  describe('isValidCode', () => {
    it('should validate alphanumeric codes', () => {
      expect(isValidCode('ABC123')).toBe(true);
      expect(isValidCode('TEST-001')).toBe(true);
      expect(isValidCode('CODE_2024')).toBe(true);
    });

    it('should reject invalid codes', () => {
      expect(isValidCode('abc123')).toBe(false); // lowercase
      expect(isValidCode('TEST@001')).toBe(false); // special chars
      expect(isValidCode('CODE 123')).toBe(false); // spaces
    });

    it('should accept custom patterns', () => {
      const customPattern = /^[A-Z]{3}-\d{3}$/;
      expect(isValidCode('ABC-123', customPattern)).toBe(true);
      expect(isValidCode('AB-12', customPattern)).toBe(false);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should sanitize potentially dangerous SQL patterns', () => {
      const malicious = "'; DROP TABLE users; --";
      const result = sanitizeValue(malicious);
      // Function removes quotes and comment markers
      expect(result).not.toContain("';");
      expect(result).not.toContain('--');
    });

    it('should sanitize UNION attacks', () => {
      const attack = "' UNION SELECT * FROM passwords --";
      const result = sanitizeValue(attack);
      // Removes quotes and comment markers
      expect(result).not.toContain("'");
      expect(result).not.toContain('--');
    });
  });

  describe('XSS Prevention', () => {
    it('should remove script tags', () => {
      const xss = '<script>alert("XSS")</script>';
      const result = sanitizeValue(xss);
      expect(result).not.toContain('<script>');
    });

    it('should remove event handlers', () => {
      const xss = '<img src=x onerror="alert(1)">';
      const result = sanitizeValue(xss);
      expect(result).not.toContain('onerror');
    });
  });
});
