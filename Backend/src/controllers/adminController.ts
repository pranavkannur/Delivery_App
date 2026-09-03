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

// 2. Get All Platform Orders
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

// 3. Get All Registered Drivers
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

// 4. Admin: Get all stores with pending location requests
export const getPendingLocationRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stores = await prisma.store.findMany({
      where: {
        pendingChange: {
          not: null as any,
        },
      },
      include: {
        partner: { select: { name: true, email: true, phone: true } },
      },
    });

    const pendingStores = stores.filter((s) => {
      const change = s.pendingChange as any;
      return change && change.status === 'PENDING';
    });

    res.status(200).json({ requests: pendingStores });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch location requests' });
  }
};

// 5. Admin: Approve or Reject Location Change Request
export const reviewLocationRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.params.storeId as string;
    const { action } = req.body;

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store || !store.pendingChange) {
      res.status(404).json({ error: 'No pending request found for this store' });
      return;
    }

    const change = store.pendingChange as any;

    if (action === 'APPROVE') {
      await prisma.store.update({
        where: { id: storeId },
        data: {
          address: change.requestedAddress,
          latitude: change.requestedLat,
          longitude: change.requestedLng,
          isLocationLocked: true,
          pendingChange: {
            ...change,
            status: 'APPROVED',
            reviewedAt: new Date().toISOString(),
          },
        },
      });
      res.status(200).json({ message: 'Store location relocation approved!' });
    } else {
      await prisma.store.update({
        where: { id: storeId },
        data: {
          pendingChange: {
            ...change,
            status: 'REJECTED',
            reviewedAt: new Date().toISOString(),
          },
        },
      });
      res.status(200).json({ message: 'Store location relocation rejected.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to review request' });
  }
};