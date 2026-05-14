import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function refreshTokenExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + env.REFRESH_TOKEN_DAYS);
  return date;
}
