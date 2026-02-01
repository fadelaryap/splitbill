import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this'

export interface UserPayload {
  id: string
  email: string
  name: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<UserPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  
  if (!token) return null
  
  return verifyToken(token)
}

export async function setAuthToken(token: string) {
  const cookieStore = await cookies()
  // Check if we're in production - either via NODE_ENV or by checking if we have production domain
  const isProduction = process.env.NODE_ENV === 'production' || 
                       process.env.NEXTAUTH_URL?.includes('https://')
  
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: isProduction, // true in production (HTTPS via Cloudflare)
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
    // Don't set domain explicitly - let browser use current domain
    // This ensures cookie works for both indomiekor.net and www.indomiekor.net
  })
}

export async function clearAuthToken() {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')
}


