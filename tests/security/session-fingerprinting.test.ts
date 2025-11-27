import { describe, it, expect } from 'vitest';
import { Request } from 'express';
import {
  generateSessionFingerprint,
  detectDeviceType,
} from '../../server/validation/session-security';

describe('Session Fingerprinting', () => {
  describe('generateSessionFingerprint', () => {
    it('should generate consistent fingerprints for same request data', () => {
      const mockReq1 = {
        get: (header: string) => {
          const headers: Record<string, string> = {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'accept-language': 'en-US,en;q=0.9',
            'accept-encoding': 'gzip, deflate, br',
          };
          return headers[header.toLowerCase()];
        },
        ip: '192.168.1.100',
        socket: { remoteAddress: '192.168.1.100' },
      } as unknown as Request;

      const mockReq2 = {
        get: (header: string) => {
          const headers: Record<string, string> = {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'accept-language': 'en-US,en;q=0.9',
            'accept-encoding': 'gzip, deflate, br',
          };
          return headers[header.toLowerCase()];
        },
        ip: '192.168.1.100',
        socket: { remoteAddress: '192.168.1.100' },
      } as unknown as Request;

      const fingerprint1 = generateSessionFingerprint(mockReq1);
      const fingerprint2 = generateSessionFingerprint(mockReq2);

      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toBeDefined();
      expect(fingerprint1.length).toBe(64); // SHA-256 produces 64 char hex string
    });

    it('should generate different fingerprints for different IPs', () => {
      const mockReq1 = {
        get: (header: string) => 'Mozilla/5.0',
        ip: '192.168.1.100',
        socket: { remoteAddress: '192.168.1.100' },
      } as unknown as Request;

      const mockReq2 = {
        get: (header: string) => 'Mozilla/5.0',
        ip: '192.168.1.101',
        socket: { remoteAddress: '192.168.1.101' },
      } as unknown as Request;

      const fingerprint1 = generateSessionFingerprint(mockReq1);
      const fingerprint2 = generateSessionFingerprint(mockReq2);

      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should generate different fingerprints for different user agents', () => {
      const mockReq1 = {
        get: (header: string) => 
          header === 'user-agent' ? 'Mozilla/5.0 (Windows)' : '',
        ip: '192.168.1.100',
        socket: { remoteAddress: '192.168.1.100' },
      } as unknown as Request;

      const mockReq2 = {
        get: (header: string) => 
          header === 'user-agent' ? 'Mozilla/5.0 (Macintosh)' : '',
        ip: '192.168.1.100',
        socket: { remoteAddress: '192.168.1.100' },
      } as unknown as Request;

      const fingerprint1 = generateSessionFingerprint(mockReq1);
      const fingerprint2 = generateSessionFingerprint(mockReq2);

      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should handle missing headers gracefully', () => {
      const mockReq = {
        get: () => undefined,
        ip: undefined,
        socket: { remoteAddress: undefined },
      } as unknown as Request;

      const fingerprint = generateSessionFingerprint(mockReq);

      expect(fingerprint).toBeDefined();
      expect(fingerprint.length).toBe(64);
    });
  });

  describe('detectDeviceType', () => {
    it('should detect desktop devices', () => {
      const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      expect(detectDeviceType(desktopUA)).toBe('desktop');
    });

    it('should detect mobile devices', () => {
      const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      expect(detectDeviceType(mobileUA)).toBe('mobile');
    });

    it('should detect tablet devices', () => {
      const tabletUA = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)';
      expect(detectDeviceType(tabletUA)).toBe('tablet');
    });

    it('should detect Android mobile', () => {
      const androidUA = 'Mozilla/5.0 (Linux; Android 11; SM-G991B)';
      expect(detectDeviceType(androidUA)).toBe('mobile');
    });

    it('should detect Android tablet', () => {
      const tabletUA = 'Mozilla/5.0 (Linux; Android 11; SM-T870 Tablet) AppleWebKit/537.36';
      expect(detectDeviceType(tabletUA)).toBe('tablet');
    });

    it('should default to desktop for unknown user agents', () => {
      const unknownUA = 'CustomBot/1.0';
      expect(detectDeviceType(unknownUA)).toBe('desktop');
    });
  });
});
