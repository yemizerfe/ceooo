import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

export const getEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const { startDate, endDate, type } = req.query;
    const where: any = { userId };
    if (type) where.type = type;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });

    res.status(200).json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get events' });
  }
};

export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const { title, description, type, startTime, endTime, allDay, location, meetingLink, attendees, reminderMinutes } = req.body;
    if (!title || !startTime || !endTime) {
      res.status(400).json({ success: false, message: 'Title, startTime, and endTime are required' });
      return;
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId, title, description, type: type || 'MEETING',
        startTime: new Date(startTime), endTime: new Date(endTime),
        allDay: allDay || false, location, meetingLink,
        attendees: attendees || [], reminderMinutes,
      },
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create event' });
  }
};

export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const existing = await prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!existing) { res.status(404).json({ success: false, message: 'Event not found' }); return; }

    const { title, description, type, startTime, endTime, allDay, location, meetingLink, attendees, reminderMinutes, status } = req.body;

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title: title ?? undefined, description: description ?? undefined,
        type: type ?? undefined, status: status ?? undefined,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        allDay: allDay ?? undefined, location: location ?? undefined,
        meetingLink: meetingLink ?? undefined, attendees: attendees ?? undefined,
        reminderMinutes: reminderMinutes ?? undefined,
      },
    });

    res.status(200).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update event' });
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const existing = await prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!existing) { res.status(404).json({ success: false, message: 'Event not found' }); return; }

    await prisma.calendarEvent.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete event' });
  }
};

export const getUpcomingEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const events = await prisma.calendarEvent.findMany({
      where: { userId, startTime: { gte: new Date() }, status: { not: 'CANCELLED' } },
      orderBy: { startTime: 'asc' },
      take: 10,
    });

    res.status(200).json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get upcoming events' });
  }
};
