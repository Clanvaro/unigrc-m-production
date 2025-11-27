import { Request } from "express";
import crypto from "crypto";
import { db } from "../db";
import { activeSessions } from "../../shared/schema";
import { eq, and, lt } from "drizzle-orm";

// ============= SESSION FINGERPRINTING =============

/**
 * Generate session fingerprint from request data
 * Combines user-agent, IP address, and accept-language to create unique identifier
 */
export function generateSessionFingerprint(req: Request): string {
  const userAgent = req.get('user-agent') || 'unknown';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const acceptLanguage = req.get('accept-language') || '';
  const acceptEncoding = req.get('accept-encoding') || '';

  const fingerprintData = `${userAgent}|${ip}|${acceptLanguage}|${acceptEncoding}`;
  
  return crypto
    .createHash('sha256')
    .update(fingerprintData)
    .digest('hex');
}

/**
 * Detect device type from user-agent
 */
export function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    if (/ipad|tablet|kindle/i.test(ua)) {
      return 'tablet';
    }
    return 'mobile';
  }
  
  return 'desktop';
}

/**
 * Validate session fingerprint
 */
export async function validateSessionFingerprint(
  sessionId: string,
  req: Request
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const currentFingerprint = generateSessionFingerprint(req);
    
    const session = await db.select()
      .from(activeSessions)
      .where(eq(activeSessions.sessionId, sessionId))
      .limit(1);

    if (!session.length) {
      return { valid: false, reason: 'Session not found' };
    }

    // Check if session is expired
    if (new Date() > new Date(session[0].expiresAt)) {
      // Clean up expired session
      await db.delete(activeSessions).where(eq(activeSessions.sessionId, sessionId));
      return { valid: false, reason: 'Session expired' };
    }

    // Check fingerprint match
    if (session[0].fingerprint !== currentFingerprint) {
      console.warn(
        `[SECURITY] Session fingerprint mismatch for session ${sessionId}`,
        {
          sessionId,
          storedFingerprint: session[0].fingerprint,
          currentFingerprint,
          userId: session[0].userId,
        }
      );
      return { valid: false, reason: 'Session fingerprint mismatch - possible hijacking attempt' };
    }

    // Update last activity
    await db.update(activeSessions)
      .set({ lastActivity: new Date() })
      .where(eq(activeSessions.sessionId, sessionId));

    return { valid: true };
  } catch (error) {
    console.error('Error validating session fingerprint:', error);
    return { valid: false, reason: 'Internal error' };
  }
}

// ============= SESSION MANAGEMENT =============

const MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5', 10);
const SESSION_IDLE_TIMEOUT_MINUTES = parseInt(process.env.SESSION_IDLE_TIMEOUT_MINUTES || '30', 10);

/**
 * Create new active session with fingerprinting
 */
export async function createActiveSession(
  userId: string,
  sessionId: string,
  req: Request,
  expiresAt: Date
): Promise<boolean> {
  try {
    const fingerprint = generateSessionFingerprint(req);
    const userAgent = req.get('user-agent') || 'unknown';
    const deviceType = detectDeviceType(userAgent);
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

    // Check concurrent sessions limit
    const existingSessions = await db.select()
      .from(activeSessions)
      .where(eq(activeSessions.userId, userId));

    if (existingSessions.length >= MAX_CONCURRENT_SESSIONS) {
      // Remove oldest session
      const oldestSession = existingSessions.sort(
        (a, b) => new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()
      )[0];

      await db.delete(activeSessions).where(eq(activeSessions.id, oldestSession.id));
      
      console.info(
        `[SECURITY] Removed oldest session for user ${userId} due to concurrent session limit`,
        { userId, removedSessionId: oldestSession.sessionId }
      );
    }

    // Create new session
    await db.insert(activeSessions).values({
      userId,
      sessionId,
      fingerprint,
      ipAddress,
      userAgent,
      deviceType,
      expiresAt,
    });

    return true;
  } catch (error) {
    console.error('Error creating active session:', error);
    return false;
  }
}

/**
 * Revoke session (logout)
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  try {
    await db.delete(activeSessions).where(eq(activeSessions.sessionId, sessionId));
    return true;
  } catch (error) {
    console.error('Error revoking session:', error);
    return false;
  }
}

/**
 * Revoke all sessions for a user (force logout)
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  try {
    const sessions = await db.select()
      .from(activeSessions)
      .where(eq(activeSessions.userId, userId));

    await db.delete(activeSessions).where(eq(activeSessions.userId, userId));

    console.info(
      `[SECURITY] Revoked all sessions for user ${userId}`,
      { userId, count: sessions.length }
    );

    return sessions.length;
  } catch (error) {
    console.error('Error revoking all user sessions:', error);
    return 0;
  }
}

/**
 * Get active sessions for a user
 */
export async function getUserActiveSessions(userId: string) {
  try {
    return await db.select()
      .from(activeSessions)
      .where(eq(activeSessions.userId, userId));
  } catch (error) {
    console.error('Error getting user active sessions:', error);
    return [];
  }
}

/**
 * Clean up expired sessions (should run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const expiredSessions = await db.select()
      .from(activeSessions)
      .where(lt(activeSessions.expiresAt, new Date()));

    if (expiredSessions.length > 0) {
      await db.delete(activeSessions)
        .where(lt(activeSessions.expiresAt, new Date()));

      console.info(
        `[SECURITY] Cleaned up ${expiredSessions.length} expired sessions`
      );
    }

    return expiredSessions.length;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return 0;
  }
}

/**
 * Clean up idle sessions (should run periodically)
 */
export async function cleanupIdleSessions(): Promise<number> {
  try {
    const idleThreshold = new Date();
    idleThreshold.setMinutes(idleThreshold.getMinutes() - SESSION_IDLE_TIMEOUT_MINUTES);

    const idleSessions = await db.select()
      .from(activeSessions)
      .where(lt(activeSessions.lastActivity, idleThreshold));

    if (idleSessions.length > 0) {
      await db.delete(activeSessions)
        .where(lt(activeSessions.lastActivity, idleThreshold));

      console.info(
        `[SECURITY] Cleaned up ${idleSessions.length} idle sessions (idle timeout: ${SESSION_IDLE_TIMEOUT_MINUTES} minutes)`
      );
    }

    return idleSessions.length;
  } catch (error) {
    console.error('Error cleaning up idle sessions:', error);
    return 0;
  }
}

/**
 * Session rotation - generate new session ID to prevent fixation attacks
 * Returns new session ID if successful
 */
export async function rotateSession(
  oldSessionId: string,
  req: Request
): Promise<string | null> {
  try {
    const oldSession = await db.select()
      .from(activeSessions)
      .where(eq(activeSessions.sessionId, oldSessionId))
      .limit(1);

    if (!oldSession.length) {
      return null;
    }

    // Generate new session ID
    const newSessionId = crypto.randomBytes(32).toString('hex');
    const newFingerprint = generateSessionFingerprint(req);

    // Update session with new ID and fingerprint
    await db.update(activeSessions)
      .set({
        sessionId: newSessionId,
        fingerprint: newFingerprint,
        lastActivity: new Date(),
      })
      .where(eq(activeSessions.sessionId, oldSessionId));

    console.info(
      `[SECURITY] Session rotated for user ${oldSession[0].userId}`,
      { oldSessionId, newSessionId }
    );

    return newSessionId;
  } catch (error) {
    console.error('Error rotating session:', error);
    return null;
  }
}
