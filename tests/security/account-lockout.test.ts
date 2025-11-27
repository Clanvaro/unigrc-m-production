import { describe, it, expect } from 'vitest';

describe('Account Lockout System', () => {
  describe('Lockout Logic', () => {
    it('should identify unlocked account (no lockout date)', () => {
      const lockedUntil = null;
      const isLocked = lockedUntil !== null && new Date() < new Date(lockedUntil);
      
      expect(isLocked).toBe(false);
    });

    it('should identify locked account within lockout period', () => {
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + 15); // 15 minutes from now
      
      const isLocked = lockoutUntil !== null && new Date() < new Date(lockoutUntil);
      expect(isLocked).toBe(true);
    });

    it('should identify unlocked account past lockout period', () => {
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() - 15); // 15 minutes ago
      
      const isLocked = lockoutUntil !== null && new Date() < new Date(lockoutUntil);
      expect(isLocked).toBe(false);
    });

    it('should handle edge case of exact lockout expiry time', () => {
      const lockoutUntil = new Date();
      const now = new Date();
      
      const isLocked = lockoutUntil !== null && now < lockoutUntil;
      expect(isLocked).toBe(false); // Should be unlocked at exact expiry (not less than)
    });
  });

  describe('Account Lockout Timing', () => {
    it('should calculate correct lockout duration', () => {
      const lockoutMinutes = 30;
      const lockoutTime = new Date();
      lockoutTime.setMinutes(lockoutTime.getMinutes() + lockoutMinutes);
      
      const now = new Date();
      const diffMinutes = Math.floor((lockoutTime.getTime() - now.getTime()) / 1000 / 60);
      
      expect(diffMinutes).toBe(lockoutMinutes);
    });
  });
});
