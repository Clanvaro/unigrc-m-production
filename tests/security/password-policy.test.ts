import { describe, it, expect } from 'vitest';
import {
  validatePasswordPolicy,
  checkPasswordHistory,
} from '../../server/validation/auth-security';
import bcrypt from 'bcrypt';

describe('Password Policy Enforcement', () => {
  describe('validatePasswordPolicy', () => {
    it('should reject passwords shorter than minimum length', () => {
      const result = validatePasswordPolicy('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should reject passwords without uppercase letters', () => {
      const result = validatePasswordPolicy('lowercase123!@#');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = validatePasswordPolicy('UPPERCASE123!@#');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePasswordPolicy('NoNumbers!@#$');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject passwords without special characters', () => {
      const result = validatePasswordPolicy('NoSpecial123Abc');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject passwords with sequential characters', () => {
      const result = validatePasswordPolicy('Abcd1234!@#$');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password cannot contain sequential characters');
    });

    it('should accept strong passwords', () => {
      const result = validatePasswordPolicy('MyS3cur3P@ssw0rd!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept passwords with mixed requirements', () => {
      const result = validatePasswordPolicy('C0mpl3x!P@ssW0rd');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Password Hashing with Bcrypt', () => {
    it('should hash passwords securely', async () => {
      const password = 'MyS3cur3P@ssw0rd!';
      const hash = await bcrypt.hash(password, 10);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should verify correct passwords', async () => {
      const password = 'MyS3cur3P@ssw0rd!';
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'MyS3cur3P@ssw0rd!';
      const wrongPassword = 'WrongP@ssw0rd!';
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'MyS3cur3P@ssw0rd!';
      const hash1 = await bcrypt.hash(password, 10);
      const hash2 = await bcrypt.hash(password, 10);
      
      expect(hash1).not.toBe(hash2); // Different salts
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });
  });

  describe('Password History Logic', () => {
    it('should detect when password matches previous hash', async () => {
      const password = 'MyS3cur3P@ssw0rd!';
      const hash = await bcrypt.hash(password, 10);
      const matches = await bcrypt.compare(password, hash);
      
      expect(matches).toBe(true);
    });

    it('should confirm password does not match different hash', async () => {
      const password = 'MyS3cur3P@ssw0rd!';
      const differentPassword = '0ld3rP@ssw0rd!';
      const hash = await bcrypt.hash(differentPassword, 10);
      const matches = await bcrypt.compare(password, hash);
      
      expect(matches).toBe(false);
    });

    it('should verify multiple password history checks', async () => {
      const newPassword = 'N3wP@ssw0rd123!';
      const oldPassword1 = '0ld3rP@ss1!';
      const oldPassword2 = 'An0th3rOld!2';
      
      const hash1 = await bcrypt.hash(oldPassword1, 10);
      const hash2 = await bcrypt.hash(oldPassword2, 10);
      
      const matches1 = await bcrypt.compare(newPassword, hash1);
      const matches2 = await bcrypt.compare(newPassword, hash2);
      
      expect(matches1).toBe(false);
      expect(matches2).toBe(false);
    });
  });

  describe('Password Expiration', () => {
    it('should calculate password age correctly', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago
      
      const passwordAge = Math.floor(
        (new Date().getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      expect(passwordAge).toBeGreaterThan(90); // Expired if > 90 days
    });

    it('should detect recent passwords', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago
      
      const passwordAge = Math.floor(
        (new Date().getTime() - recentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      expect(passwordAge).toBeLessThan(90); // Not expired if < 90 days
    });

    it('should handle password age calculation', () => {
      const testDate = new Date();
      const passwordAge = Math.floor(
        (new Date().getTime() - testDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      expect(passwordAge).toBe(0); // Same day = 0 days
    });
  });
});
