// server/src/controllers/user.controller.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.ts';
import { prisma } from '../lib/prisma.ts';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs'

export const completeOnboarding = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const { fullName, companyName, industry, companySize, role } = authReq.body;
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    if (!fullName || !companyName || !industry || !companySize || !role) {
      res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: fullName,
        companyName,
        industry,
        companySize,
        role,
        hasCompletedOnboarding: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accessRole: true,
        companyName: true,
        industry: true,
        companySize: true,
        hasCompletedOnboarding: true,
        createdAt: true,
      }
    });

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accessRole: true,
        companyName: true,
        industry: true,
        companySize: true,
        avatarUrl: true,
        bio: true,
        aiUsageCount: true,
        subscriptionPlan: true,
        isVerified: true,
        hasCompletedOnboarding: true,
        createdAt: true,
        lastLoginAt: true,
        preferences: true,
        twoFactorEnabled: true,
        integrations: true,
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Parse JSON fields
    let preferences = user.preferences;
    if (preferences && typeof preferences === 'string') {
      try {
        preferences = JSON.parse(preferences);
      } catch(e) {
        preferences = {};
      }
    }

    let integrations = user.integrations;
    if (integrations && typeof integrations === 'string') {
      try {
        integrations = JSON.parse(integrations);
      } catch(e) {
        integrations = {};
      }
    }

    res.status(200).json({
      success: true,
      data: { user: { ...user, preferences, integrations } }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    // NOTE: `role` here is the free-text job title only. Authorization is driven
    // by `accessRole`, which is deliberately NOT writable from this endpoint so a
    // user cannot self-escalate with {"role":"ADMIN"}. Role changes go through
    // the admin area (changeUserRole) behind the RBAC permission checks.
    const { name, role, companyName, industry, companySize, bio } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : undefined,
        role: role !== undefined ? role : undefined,
        companyName: companyName !== undefined ? companyName : undefined,
        industry: industry !== undefined ? industry : undefined,
        companySize: companySize !== undefined ? companySize : undefined,
        bio: bio !== undefined ? bio : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accessRole: true,
        companyName: true,
        industry: true,
        companySize: true,
        avatarUrl: true,
        bio: true,
        hasCompletedOnboarding: true,
      }
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // OAuth-registered accounts have no password yet, so there is nothing to
    // compare against: send them through the password-reset flow instead.
    if (!user.passwordHash) {
      res.status(400).json({
        success: false,
        code: 'OAUTH_ONLY_ACCOUNT',
        message: 'This account has no password yet. Use "Forgot password?" to set one.'
      });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword }
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateAvatar = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const { name } = req.body;
    const displayName = name || user.name || user.email?.split('@')[0] || 'User';
    
    const encodedName = encodeURIComponent(displayName);
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodedName}&background=1e4a7a&color=fff&size=128&bold=true&length=2&fontsize=0.60`;
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyName: true,
        avatarUrl: true,
        hasCompletedOnboarding: true,
        createdAt: true,
      },
    });

    res.status(200).json({ 
      success: true, 
      data: { user: updatedUser, avatarUrl },
      message: "Avatar updated successfully"
    });
  } catch (err) {
    console.error("updateAvatar error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ========== PREFERENCES FUNCTIONS ==========

export const getPreferences = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true }
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const defaultPreferences = {
      emailAlerts: true,
      pushNotifications: true,
      meetingReminders: true,
      aiInsights: true,
      marketingEmails: false,
      weeklyDigest: true,
      language: 'en',
      timezone: 'America/Los_Angeles',
      dateFormat: 'MM/DD/YYYY',
      weekStart: 'Monday'
    };

    let preferences = defaultPreferences;
    
    if (user.preferences) {
      if (typeof user.preferences === 'string') {
        try {
          preferences = { ...defaultPreferences, ...JSON.parse(user.preferences) };
        } catch(e) {}
      } else if (typeof user.preferences === 'object') {
        preferences = { ...defaultPreferences, ...user.preferences };
      }
    }

    res.status(200).json({
      success: true,
      data: { preferences }
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updatePreferences = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { 
      emailAlerts, pushNotifications, meetingReminders, aiInsights, 
      marketingEmails, weeklyDigest, language, timezone, dateFormat, weekStart 
    } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get existing preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true }
    });

    let existingPrefs = {};
    if (user?.preferences) {
      if (typeof user.preferences === 'string') {
        try {
          existingPrefs = JSON.parse(user.preferences);
        } catch(e) {}
      } else {
        existingPrefs = user.preferences;
      }
    }

    const preferences = {
      ...existingPrefs,
      ...(emailAlerts !== undefined && { emailAlerts }),
      ...(pushNotifications !== undefined && { pushNotifications }),
      ...(meetingReminders !== undefined && { meetingReminders }),
      ...(aiInsights !== undefined && { aiInsights }),
      ...(marketingEmails !== undefined && { marketingEmails }),
      ...(weeklyDigest !== undefined && { weeklyDigest }),
      ...(language !== undefined && { language }),
      ...(timezone !== undefined && { timezone }),
      ...(dateFormat !== undefined && { dateFormat }),
      ...(weekStart !== undefined && { weekStart }),
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: JSON.stringify(preferences)
      }
    });

    res.status(200).json({
      success: true,
      data: { preferences },
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ========== INTEGRATIONS FUNCTIONS ==========

export const getIntegrations = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { integrations: true }
    });

    const defaultIntegrations = {
      googleCalendar: { connected: false, lastSync: null },
      slack: { connected: false, webhookUrl: "" },
      salesforce: { connected: false, apiKey: "" },
      zoom: { connected: false, accountId: "" },
    };

    let integrations = defaultIntegrations;
    if (user?.integrations) {
      if (typeof user.integrations === 'string') {
        try {
          integrations = { ...defaultIntegrations, ...JSON.parse(user.integrations) };
        } catch(e) {}
      } else if (typeof user.integrations === 'object') {
        integrations = { ...defaultIntegrations, ...user.integrations };
      }
    }

    res.status(200).json({ success: true, data: { integrations } });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const connectIntegration = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { integration } = authReq.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { integrations: true }
    });

    let integrations = {};
    if (user?.integrations) {
      if (typeof user.integrations === 'string') {
        integrations = JSON.parse(user.integrations);
      } else {
        integrations = user.integrations;
      }
    }

    integrations = {
      ...integrations,
      [integration]: { 
        connected: true, 
        connectedAt: new Date().toISOString(),
        ...(integrations[integration] || {})
      }
    };

    await prisma.user.update({
      where: { id: userId },
      data: { integrations: JSON.stringify(integrations) }
    });

    res.status(200).json({ 
      success: true, 
      message: `${integration} connected successfully` 
    });
  } catch (error) {
    console.error('Connect integration error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const disconnectIntegration = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { integration } = authReq.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { integrations: true }
    });

    let integrations: Record<string, any> = {};
    if (user?.integrations) {
      if (typeof user.integrations === 'string') {
        try { integrations = JSON.parse(user.integrations) || {}; } catch { integrations = {}; }
      } else if (typeof user.integrations === 'object' && !Array.isArray(user.integrations)) {
        integrations = { ...(user.integrations as Record<string, any>) };
      }
    }

    // Drop the stored connection and the records it produced. Flagging the
    // entry as `connected: false` used to leave every synced/imported row
    // behind, so the platform kept feeding pages and AI after a disconnect.
    await prisma.integrationConnection
      .delete({ where: { userId_name: { userId, name: integration } } })
      .catch(() => null);

    const names = new Set([
      String(integration),
      String(integration).replace(/-/g, '_'),
      String(integration).replace(/_/g, '-'),
    ]);
    const removed = await prisma.integrationData.deleteMany({
      where: {
        userId,
        OR: [...names].flatMap((name) => [
          { source: { startsWith: `sync:${name}:` } },
          { source: { startsWith: `import:${name}:` } },
        ]),
      },
    });

    delete integrations[integration];

    await prisma.user.update({
      where: { id: userId },
      data: { integrations: integrations as unknown as Prisma.InputJsonValue }
    });

    res.status(200).json({ 
      success: true, 
      message: removed.count > 0
        ? `${integration} disconnected and ${removed.count} stored record${removed.count === 1 ? '' : 's'} removed`
        : `${integration} disconnected successfully`,
      data: { recordsRemoved: removed.count },
    });
  } catch (error) {
    console.error('Disconnect integration error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ========== 2FA FUNCTIONS ==========

export const toggleTwoFactor = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const { enabled } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: enabled }
    });

    res.status(200).json({ 
      success: true, 
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully` 
    });
  } catch (error) {
    console.error('Toggle 2FA error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ========== AVATAR UPLOAD FUNCTIONS ==========

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { avatarUrl } = req.body || {};
    
    if (!avatarUrl) {
      res.status(400).json({ success: false, message: "Avatar URL is required" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyName: true,
        avatarUrl: true,
        hasCompletedOnboarding: true,
      },
    });

    res.status(200).json({ 
      success: true, 
      data: { user: updatedUser, avatarUrl },
      message: "Avatar uploaded successfully"
    });
  } catch (err) {
    console.error("uploadAvatar error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const generateAvatar = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const { name } = req.body;
    const displayName = name || user.name || user.email?.split('@')[0] || 'User';
    const encodedName = encodeURIComponent(displayName);
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodedName}&background=1e4a7a&color=fff&size=128&bold=true&length=2&fontsize=0.60`;
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyName: true,
        avatarUrl: true,
        hasCompletedOnboarding: true,
      },
    });

    res.status(200).json({ 
      success: true, 
      data: { user: updatedUser, avatarUrl },
      message: "Avatar generated successfully"
    });
  } catch (err) {
    console.error("generateAvatar error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};