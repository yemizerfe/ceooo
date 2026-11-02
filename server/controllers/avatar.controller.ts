// server/src/controllers/avatar.controller.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');

// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  
  try {
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Get the uploaded file from multer
    const file = (req as any).file;
    
    if (!file) {
      res.status(400).json({
        success: false,
        message: "No file uploaded. Please provide an image file.",
      });
      return;
    }

    // File is already saved by multer, just get the filename
    const filename = file.filename;
    const avatarUrl = `${process.env.API_URL || 'http://localhost:5010'}/uploads/avatars/${filename}`;
    
    // Update user in database
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
      message: "Avatar uploaded successfully"
    });
  } catch (err) {
    console.error("uploadAvatar error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Generate avatar from name (initials) - simpler, no file upload needed
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
    
    // Generate avatar URL using UI Avatars API (no file storage needed)
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
      message: "Avatar generated successfully"
    });
  } catch (err) {
    console.error("generateAvatar error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};