import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { DEFAULT_ACCESS_ROLE } from './rbac.service.ts';

export interface SignupData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const signupService = async (data: SignupData) => {
  const { email, password } = data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error('User with this email already exists');

  const hashedPassword = await bcrypt.hash(password, 10);

  // `accessRole` (not `role`) drives authorization. It is set explicitly here so
  // a brand-new account is never left with an unresolvable role and locked out
  // of its own workspace.
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      accessRole: DEFAULT_ACCESS_ROLE,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      accessRole: true,
      hasCompletedOnboarding: true,
      createdAt: true,
    },
  });

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' } as SignOptions
  );

  return { user, token };
};

export const loginService = async (data: LoginData) => {
  const { email, password } = data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid email or password');

  // OAuth-registered accounts store no password.
  if (!user.passwordHash) throw new Error('Invalid email or password');

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) throw new Error('Invalid email or password');

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' } as SignOptions
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyName: user.companyName,
      industry: user.industry,
      companySize: user.companySize,
      avatarUrl: user.avatarUrl,
      aiUsageCount: user.aiUsageCount,
      subscriptionPlan: user.subscriptionPlan,
      isVerified: user.isVerified,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      createdAt: user.createdAt,
    },
    token,
  };
};
