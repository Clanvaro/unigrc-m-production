import { Request } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "../db";
import { users, authenticationAudit } from "../../shared/schema";
import { eq, and, gt } from "drizzle-orm";

// ============= PASSWORD POLICY CONFIGURATION =============

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number; // Number of previous passwords to prevent reuse
  maxAge: number; // Days until password expires (0 = never)
}

const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '12', 10),
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventReuse: 5, // Prevent reuse of last 5 passwords
  maxAge: parseInt(process.env.PASSWORD_MAX_AGE_DAYS || '90', 10), // 90 days default
};

// ============= PASSWORD VALIDATION =============

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate password against security policy
 */
export function validatePasswordPolicy(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common patterns
  if (/^(.)\1+$/.test(password)) {
    errors.push('Password cannot be all the same character');
  }

  if (/^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
    errors.push('Password cannot contain sequential characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if password was used previously
 */
export async function checkPasswordHistory(
  userId: string,
  newPassword: string,
  preventReuse: number = DEFAULT_PASSWORD_POLICY.preventReuse
): Promise<boolean> {
  try {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user.length || !user[0].passwordHistory) {
      return true; // No history, password is OK
    }

    const passwordHistory = user[0].passwordHistory || [];
    
    // Check against previous passwords
    for (const oldHash of passwordHistory.slice(0, preventReuse)) {
      const matches = await bcrypt.compare(newPassword, oldHash);
      if (matches) {
        return false; // Password was used before
      }
    }

    return true; // Password is unique
  } catch (error) {
    console.error('Error checking password history:', error);
    return true; // On error, allow password change (fail open)
  }
}

/**
 * Hash password and update password history
 */
export async function updatePassword(
  userId: string,
  newPassword: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate password policy
    const validation = validatePasswordPolicy(newPassword, policy);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Check password history
    const isUnique = await checkPasswordHistory(userId, newPassword, policy.preventReuse);
    if (!isUnique) {
      return { 
        success: false, 
        error: `Password cannot be the same as your last ${policy.preventReuse} passwords` 
      };
    }

    // Get current user data
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) {
      return { success: false, error: 'User not found' };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password history
    const currentHistory = user[0].passwordHistory || [];
    const newHistory = [hashedPassword, ...currentHistory].slice(0, policy.preventReuse);

    // Update user
    await db.update(users)
      .set({
        password: hashedPassword,
        passwordHistory: newHistory,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0, // Reset failed attempts on password change
        accountLockedUntil: null, // Unlock account if locked
      })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error) {
    console.error('Error updating password:', error);
    return { success: false, error: 'Failed to update password' };
  }
}

// ============= ACCOUNT LOCKOUT SYSTEM =============

const MAX_FAILED_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
const LOCKOUT_DURATION_MINUTES = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30', 10);

/**
 * Check if account is locked
 */
export async function isAccountLocked(userId: string): Promise<boolean> {
  try {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user.length) return false;
    
    const lockedUntil = user[0].accountLockedUntil;
    if (!lockedUntil) return false;

    // Check if lockout has expired
    if (new Date() > new Date(lockedUntil)) {
      // Unlock account automatically
      await db.update(users)
        .set({
          accountLockedUntil: null,
          failedLoginAttempts: 0,
        })
        .where(eq(users.id, userId));
      
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking account lock:', error);
    return false;
  }
}

/**
 * Record failed login attempt
 */
export async function recordFailedLogin(
  userId: string,
  req: Request
): Promise<{ locked: boolean; remainingAttempts?: number }> {
  try {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user.length) {
      return { locked: false };
    }

    const newAttempts = (user[0].failedLoginAttempts || 0) + 1;
    const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

    const updateData: any = {
      failedLoginAttempts: newAttempts,
    };

    if (shouldLock) {
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
      updateData.accountLockedUntil = lockoutUntil;
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    // Audit log
    await db.insert(authenticationAudit).values({
      userId,
      username: user[0].username || user[0].email || 'unknown',
      action: shouldLock ? 'account_locked' : 'login_failed',
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      success: false,
      failureReason: shouldLock 
        ? `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts`
        : `Failed login attempt ${newAttempts} of ${MAX_FAILED_ATTEMPTS}`,
    });

    if (shouldLock) {
      console.warn(
        `[SECURITY] Account locked for user ${userId} after ${MAX_FAILED_ATTEMPTS} failed login attempts`,
        { userId, attempts: newAttempts, lockoutUntil: updateData.accountLockedUntil }
      );
    }

    return {
      locked: shouldLock,
      remainingAttempts: shouldLock ? 0 : MAX_FAILED_ATTEMPTS - newAttempts,
    };
  } catch (error) {
    console.error('Error recording failed login:', error);
    return { locked: false };
  }
}

/**
 * Record successful login
 */
export async function recordSuccessfulLogin(
  userId: string,
  req: Request
): Promise<void> {
  try {
    // Reset failed attempts
    await db.update(users)
      .set({
        failedLoginAttempts: 0,
        lastLogin: new Date(),
      })
      .where(eq(users.id, userId));

    // Audit log
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    await db.insert(authenticationAudit).values({
      userId,
      username: user[0]?.username || user[0]?.email || 'unknown',
      action: 'login_success',
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      success: true,
    });
  } catch (error) {
    console.error('Error recording successful login:', error);
  }
}

/**
 * Manually unlock account (admin function)
 */
export async function unlockAccount(userId: string, adminId: string): Promise<boolean> {
  try {
    await db.update(users)
      .set({
        accountLockedUntil: null,
        failedLoginAttempts: 0,
      })
      .where(eq(users.id, userId));

    await db.insert(authenticationAudit).values({
      userId,
      action: 'account_unlocked',
      ipAddress: 'system',
      success: true,
      metadata: { unlockedBy: adminId },
    });

    console.info(
      `[SECURITY] Account ${userId} manually unlocked by admin ${adminId}`,
      { userId, adminId }
    );

    return true;
  } catch (error) {
    console.error('Error unlocking account:', error);
    return false;
  }
}

// ============= PASSWORD RESET TOKENS =============

/**
 * Generate secure password reset token
 */
export async function generatePasswordResetToken(
  userId: string
): Promise<{ token: string; expires: Date } | null> {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token valid for 1 hour

    await db.update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpires: expires,
      })
      .where(eq(users.id, userId));

    return { token, expires };
  } catch (error) {
    console.error('Error generating password reset token:', error);
    return null;
  }
}

/**
 * Validate password reset token
 */
export async function validatePasswordResetToken(
  token: string
): Promise<{ valid: boolean; userId?: string }> {
  try {
    const user = await db.select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          gt(users.passwordResetExpires!, new Date())
        )
      )
      .limit(1);

    if (!user.length) {
      return { valid: false };
    }

    return { valid: true, userId: user[0].id };
  } catch (error) {
    console.error('Error validating password reset token:', error);
    return { valid: false };
  }
}

/**
 * Reset password using token
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const validation = await validatePasswordResetToken(token);
    
    if (!validation.valid || !validation.userId) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    const result = await updatePassword(validation.userId, newPassword);
    
    if (result.success) {
      // Clear reset token
      await db.update(users)
        .set({
          passwordResetToken: null,
          passwordResetExpires: null,
          lastPasswordResetAt: new Date(),
        })
        .where(eq(users.id, validation.userId));

      // Audit log
      await db.insert(authenticationAudit).values({
        userId: validation.userId,
        action: 'password_reset',
        ipAddress: 'system',
        success: true,
      });
    }

    return result;
  } catch (error) {
    console.error('Error resetting password with token:', error);
    return { success: false, error: 'Failed to reset password' };
  }
}

/**
 * Check if password is expired
 */
export async function isPasswordExpired(userId: string): Promise<boolean> {
  try {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user.length || !user[0].passwordChangedAt || DEFAULT_PASSWORD_POLICY.maxAge === 0) {
      return false;
    }

    const passwordAge = Math.floor(
      (new Date().getTime() - new Date(user[0].passwordChangedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    return passwordAge > DEFAULT_PASSWORD_POLICY.maxAge;
  } catch (error) {
    console.error('Error checking password expiration:', error);
    return false;
  }
}
