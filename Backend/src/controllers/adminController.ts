import { Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// 1. Get High-Level Platform Statistics
export const getAdminStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [totalOrders, activeOrders, completedOrders, users, drivers, revenueData] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: { status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP'] } },
      }),
      prisma.order.count({
        where: { status: 'DELIVERED' },
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      prisma.driver.count({
        where: { isAvailable: true },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'DELIVERED' },
      }),
    ]);

    const totalRevenue = revenueData._sum.totalAmount || 0;

    const userCounts: { [role: string]: number } = {};
    users.forEach((u) => {
      userCounts[u.role] = u._count.id;
    });

    res.status(200).json({
      stats: {
        totalRevenue,
        totalOrders,
        activeOrders,
        completedOrders,
        onlineDrivers: drivers,
        totalCustomers: userCounts['CUSTOMER'] || 0,
        totalDrivers: userCounts['DRIVER'] || 0,
        totalPartners: userCounts['PARTNER'] || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching admin stats' });
  }
};

// 2. Get All Platform Orders (with customer & driver details)
export const getAdminOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        driver: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
      },
    });

    res.status(200).json({ orders });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching admin orders' });
  }
};

// 3. Get All Registered Drivers & Fleet Coordinates
export const getAdminDrivers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const drivers = await prisma.driver.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    res.status(200).json({ drivers });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching admin drivers' });
  }
};