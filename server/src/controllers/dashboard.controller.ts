/**
 * Dashboard Controller
 * Handles HTTP requests for dashboard data
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { dashboardService } from '../services/dashboard.service.js';

export const getDashboardData = async (_req: AuthRequest, res: Response) => {
  try {
    const data = await dashboardService.getAllData();
    return res.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

export const getStats = async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await dashboardService.getStats();
    return res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

export const getChartData = async (_req: AuthRequest, res: Response) => {
  try {
    const chartData = await dashboardService.getChartData();
    return res.json(chartData);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return res.status(500).json({ error: 'Failed to fetch chart data' });
  }
};

export const getRecentActivity = async (_req: AuthRequest, res: Response) => {
  try {
    const activity = await dashboardService.getRecentActivity();
    return res.json(activity);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};

export const getWarnings = async (_req: AuthRequest, res: Response) => {
  try {
    const warnings = await dashboardService.getWarnings();
    return res.json(warnings);
  } catch (error) {
    console.error('Error fetching warnings:', error);
    return res.status(500).json({ error: 'Failed to fetch warnings' });
  }
};
