/**
 * Analytics service for tracking app events.
 * Handles event recording, aggregation, and unique visitor detection.
 * Privacy-conscious: uses hashed IPs, no PII stored.
 */
import { prisma } from '@/lib/prisma';
import { AnalyticsEventType } from '@prisma/client';
import { logger } from '@/lib/logger';

interface TrackEventParams {
  appId: string;
  eventType: AnalyticsEventType;
  metadata?: Record<string, unknown>;
  visitorHash?: string; // For unique visitor detection
}

/**
 * Get the start of today in UTC for daily aggregation.
 */
function getStartOfDayUTC(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Track an analytics event.
 * Creates the raw event and updates aggregated counters.
 */
export async function trackEvent({ appId, eventType, metadata, visitorHash }: TrackEventParams): Promise<void> {
  try {
    const now = new Date();
    const today = getStartOfDayUTC(now);

    // Check for unique visitor within 24h window (if visitorHash provided)
    let isUniqueVisit = false;
    if (visitorHash && (eventType === 'PAGE_VIEW' || eventType === 'UNIQUE_VISIT')) {
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const existingVisit = await prisma.appAnalyticsEvent.findFirst({
        where: {
          appId,
          eventType: 'UNIQUE_VISIT',
          timestamp: { gte: twentyFourHoursAgo },
          metadata: {
            path: ['visitorHash'],
            equals: visitorHash,
          },
        },
      });
      isUniqueVisit = !existingVisit;
    }

    // Create the raw event
    await prisma.appAnalyticsEvent.create({
      data: {
        appId,
        eventType: eventType === 'UNIQUE_VISIT' && !isUniqueVisit ? 'PAGE_VIEW' : eventType,
        timestamp: now,
        metadata: metadata ? (metadata as object) : undefined,
      },
    });

    // If this is a unique visit, create a separate UNIQUE_VISIT event
    if (isUniqueVisit && eventType === 'PAGE_VIEW') {
      await prisma.appAnalyticsEvent.create({
        data: {
          appId,
          eventType: 'UNIQUE_VISIT',
          timestamp: now,
          metadata: { ...(metadata || {}), visitorHash } as object,
        },
      });
    }

    // Update daily summary using upsert (atomic)
    const summaryUpdate: Record<string, unknown> = {};
    const summaryIncrement: Record<string, number> = {};

    if (eventType === 'PAGE_VIEW') {
      summaryIncrement.pageViews = 1;
      if (isUniqueVisit) {
        summaryIncrement.uniqueVisitors = 1;
      }
    } else if (eventType === 'INSTALL_CLICK') {
      summaryIncrement.installClicks = 1;
    } else if (eventType === 'PUBLISHED') {
      summaryIncrement.publishCount = 1;
    }

    if (Object.keys(summaryIncrement).length > 0) {
      await prisma.appAnalyticsSummary.upsert({
        where: {
          appId_date: { appId, date: today },
        },
        create: {
          appId,
          date: today,
          pageViews: summaryIncrement.pageViews || 0,
          uniqueVisitors: summaryIncrement.uniqueVisitors || 0,
          installClicks: summaryIncrement.installClicks || 0,
          publishCount: summaryIncrement.publishCount || 0,
        },
        update: {
          pageViews: summaryIncrement.pageViews ? { increment: summaryIncrement.pageViews } : undefined,
          uniqueVisitors: summaryIncrement.uniqueVisitors ? { increment: summaryIncrement.uniqueVisitors } : undefined,
          installClicks: summaryIncrement.installClicks ? { increment: summaryIncrement.installClicks } : undefined,
          publishCount: summaryIncrement.publishCount ? { increment: summaryIncrement.publishCount } : undefined,
        },
      });
    }

    // Update AppProject denormalized counters
    const projectUpdate: Record<string, unknown> = {};
    const projectIncrement: Record<string, number> = {};

    if (eventType === 'PAGE_VIEW') {
      projectIncrement.totalVisits = 1;
      projectUpdate.lastVisitedAt = now;
      if (isUniqueVisit) {
        projectIncrement.uniqueVisitors = 1;
      }
    } else if (eventType === 'INSTALL_CLICK') {
      projectIncrement.totalInstalls = 1;
    } else if (eventType === 'PUBLISHED') {
      projectUpdate.lastPublishedAt = now;
    }

    if (Object.keys(projectIncrement).length > 0 || Object.keys(projectUpdate).length > 0) {
      await prisma.appProject.update({
        where: { id: appId },
        data: {
          ...projectUpdate,
          ...(projectIncrement.totalVisits ? { totalVisits: { increment: projectIncrement.totalVisits } } : {}),
          ...(projectIncrement.uniqueVisitors ? { uniqueVisitors: { increment: projectIncrement.uniqueVisitors } } : {}),
          ...(projectIncrement.totalInstalls ? { totalInstalls: { increment: projectIncrement.totalInstalls } } : {}),
        },
      });
    }
  } catch (error) {
    // Analytics should never break the main application flow
    logger.error('analytics', 'Failed to track event', {
      appId,
      eventType,
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }
}

/**
 * Get analytics summary for an app.
 */
export async function getAnalyticsSummary(appId: string, period: '7d' | '30d' | 'all' = '30d') {
  const now = new Date();
  let startDate: Date | undefined;

  if (period === '7d') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === '30d') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Get app with counters
  const app = await prisma.appProject.findUnique({
    where: { id: appId },
    select: {
      totalVisits: true,
      uniqueVisitors: true,
      totalInstalls: true,
      lastVisitedAt: true,
      lastPublishedAt: true,
    },
  });

  // Get daily breakdown
  const dailySummaries = await prisma.appAnalyticsSummary.findMany({
    where: {
      appId,
      ...(startDate ? { date: { gte: startDate } } : {}),
    },
    orderBy: { date: 'asc' },
  });

  // Get recent events
  const recentEvents = await prisma.appAnalyticsEvent.findMany({
    where: { appId },
    orderBy: { timestamp: 'desc' },
    take: 20,
    select: {
      id: true,
      eventType: true,
      timestamp: true,
      metadata: true,
    },
  });

  return {
    totals: app,
    dailySummaries,
    recentEvents,
  };
}

/**
 * Get chart data for an app.
 */
export async function getChartData(appId: string, period: '7d' | '30d' | 'all' = '30d') {
  const now = new Date();
  let startDate: Date;
  let days: number;

  if (period === '7d') {
    days = 7;
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === '30d') {
    days = 30;
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    // For 'all', get the earliest summary and compute
    const earliest = await prisma.appAnalyticsSummary.findFirst({
      where: { appId },
      orderBy: { date: 'asc' },
    });
    if (!earliest) return [];
    startDate = earliest.date;
    days = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  }

  startDate.setUTCHours(0, 0, 0, 0);

  const summaries = await prisma.appAnalyticsSummary.findMany({
    where: {
      appId,
      date: { gte: startDate },
    },
    orderBy: { date: 'asc' },
  });

  // Create a map for quick lookup
  const summaryMap = new Map(
    summaries.map((s) => [s.date.toISOString().split('T')[0], s])
  );

  // Fill in missing days with zeros
  const chartData: Array<{
    date: string;
    pageViews: number;
    uniqueVisitors: number;
    installClicks: number;
  }> = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateKey = d.toISOString().split('T')[0];
    const summary = summaryMap.get(dateKey);
    chartData.push({
      date: dateKey,
      pageViews: summary?.pageViews || 0,
      uniqueVisitors: summary?.uniqueVisitors || 0,
      installClicks: summary?.installClicks || 0,
    });
  }

  return chartData;
}
