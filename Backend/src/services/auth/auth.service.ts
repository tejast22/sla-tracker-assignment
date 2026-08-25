// backend/src/services/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { GraphQLError } from 'graphql';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async verifyPassword(password: string, hashStr: string): Promise<boolean> {
    return bcrypt.compare(password, hashStr);
  }

  static generateToken(userId: string, role: UserRole): string {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
  }

  static verifyToken(token: string): { userId: string; role: UserRole } {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string; role: UserRole };
    } catch (error) {
      throw new GraphQLError('Invalid or expired authentication token', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }
  }
}