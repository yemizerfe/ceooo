import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import AIService from '../services/ai.service';

export const getNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const { category, isPinned, isArchived, limit = 50, page = 1 } = req.query;
    const where: any = { userId };
    if (category) where.category = category;
    if (isPinned !== undefined) where.isPinned = isPinned === 'true';
    if (isArchived !== undefined) where.isArchived = isArchived === 'true';
    else where.isArchived = false;

    const skip = (Number(page) - 1) * Number(limit);

    const [notes, total] = await Promise.all([
      prisma.note.findMany({ where, orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }], skip, take: Number(limit) }),
      prisma.note.count({ where }),
    ]);

    res.status(200).json({ success: true, data: notes, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get notes' });
  }
};

export const getNoteById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const note = await prisma.note.findFirst({ where: { id, userId } });
    if (!note) { res.status(404).json({ success: false, message: 'Note not found' }); return; }
    res.status(200).json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get note' });
  }
};

export const createNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const { title, content, category, tags, isPinned } = req.body;
    if (!title) { res.status(400).json({ success: false, message: 'Title is required' }); return; }

    const note = await prisma.note.create({
      data: { userId, title, content, category: category || 'GENERAL', tags: tags || [], isPinned: isPinned || false },
    });

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create note' });
  }
};

export const updateNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const existing = await prisma.note.findFirst({ where: { id, userId } });
    if (!existing) { res.status(404).json({ success: false, message: 'Note not found' }); return; }

    const { title, content, category, tags, isPinned, isArchived } = req.body;

    const note = await prisma.note.update({
      where: { id },
      data: {
        title: title ?? undefined, content: content ?? undefined,
        category: category ?? undefined, tags: tags ?? undefined,
        isPinned: isPinned ?? undefined, isArchived: isArchived ?? undefined,
      },
    });

    res.status(200).json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update note' });
  }
};

export const deleteNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const existing = await prisma.note.findFirst({ where: { id, userId } });
    if (!existing) { res.status(404).json({ success: false, message: 'Note not found' }); return; }

    await prisma.note.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
};

export const summarizeNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const note = await prisma.note.findFirst({ where: { id, userId } });
    if (!note) { res.status(404).json({ success: false, message: 'Note not found' }); return; }
    if (!note.content) { res.status(400).json({ success: false, message: 'Note has no content to summarize' }); return; }

    const summary = await AIService.summarizeNote(userId, note.content);

    await prisma.note.update({ where: { id }, data: { aiSummary: summary.summary } });

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to summarize note' });
  }
};
