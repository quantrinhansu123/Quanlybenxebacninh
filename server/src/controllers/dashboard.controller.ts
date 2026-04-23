/**
 * Dashboard Controller
 * Handles HTTP requests for dashboard data
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { dashboardService } from '../services/dashboard.service.js';

export const getDashboardData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const data = await dashboardService.getAllData(userId);
    return res.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const stats = await dashboardService.getStats(userId);
    res.setHeader('Cache-Control', 'private, no-cache')
    return res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

export const getChartData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const chartData = await dashboardService.getChartData(userId);
    return res.json(chartData);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return res.status(500).json({ error: 'Failed to fetch chart data' });
  }
};

export const getRecentActivity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const activity = await dashboardService.getRecentActivity(userId);
    return res.json(activity);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};

export const getWarnings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const warnings = await dashboardService.getWarnings(userId);
    return res.json(warnings);
  } catch (error) {
    console.error('Error fetching warnings:', error);
    return res.status(500).json({ error: 'Failed to fetch warnings' });
  }
};
