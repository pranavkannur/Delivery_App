import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// 1. Customer: Get all open partner stores with real menus
export const getPartnerStores = async (req: Request, res: Response): Promise<void> => {
  try {
    const stores = await prisma.store.findMany({
      include: {
        menuItems: true,
      },
    });

    const formattedStores = stores.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      rating: 4.9,
      deliveryTime: '20-30 min',
      image: s.category.includes('Pizza') ? '🍕' : s.category.includes('Café') ? '☕' : '🥐',
      pickupAddress: s.address || `${s.name}, Commercial High Street`,
      pickupLat: s.latitude || 17.6599,
      pickupLng: s.longitude || 75.9064,
      menu: s.menuItems.length > 0 ? s.menuItems : [
        { id: 'def1', name: 'Specialty Item 1', price: 10.0, desc: 'Fresh daily specialty' },
        { id: 'def2', name: 'Specialty Item 2', price: 15.0, desc: 'Chef recommendation' },
      ],
    }));

    res.status(200).json({ stores: formattedStores });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch stores' });
  }
};

// 2. Partner: Get My Store Profile, Menu Items & Lock Status
export const getMyStore = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user.id;
    let store = await prisma.store.findUnique({
      where: { partnerId },
      include: { menuItems: true },
    });

    // Auto-create store profile if it doesn't exist yet
    if (!store) {
      store = await prisma.store.create({
        data: {
          partnerId,
          name: req.user.name || 'Partner Store',
          category: 'Bakery & Pastries',
          latitude: 17.6599,
          longitude: 75.9064,
          address: `${req.user.name}, High Street`,
          isLocationLocked: false,
          menuItems: {
            create: [
              { name: 'Fresh Artisan Loaf', price: 6.5, description: 'Baked daily' },
              { name: 'Butter Croissant', price: 4.0, description: 'Golden flaky layers' },
            ],
          },
        },
        include: { menuItems: true },
      });
    }

    res.status(200).json({ store });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch store' });
  }
};

// 3. Partner: Lock & Save Initial Shop Location (Only allowed ONCE)
export const setInitialLocation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user.id;
    const { address, latitude, longitude } = req.body;

    const existing = await prisma.store.findUnique({ where: { partnerId } });

    if (existing && existing.isLocationLocked) {
      res.status(400).json({ error: 'Shop location is already locked. Request change from Admin.' });
      return;
    }

    const store = await prisma.store.upsert({
      where: { partnerId },
      update: {
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        isLocationLocked: true, // 🔒 Lock it permanently!
      },
      create: {
        partnerId,
        name: req.user.name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        isLocationLocked: true,
      },
    });

    res.status(200).json({ message: 'Shop location locked successfully', store });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to lock location' });
  }
};

// 4. Partner: Request Location Change to Admin
export const requestLocationChange = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user.id;
    const { requestedAddress, requestedLat, requestedLng, reason } = req.body;

    const store = await prisma.store.update({
      where: { partnerId },
      data: {
        pendingChange: {
          requestedAddress,
          requestedLat: parseFloat(requestedLat),
          requestedLng: parseFloat(requestedLng),
          reason: reason || 'Store relocation',
          requestedAt: new Date().toISOString(),
          status: 'PENDING',
        },
      },
    });

    res.status(200).json({ message: 'Location change request submitted to Admin', store });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit request' });
  }
};

// 5. Partner: Add Menu Item
export const addMenuItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user.id;
    const { name, description, price } = req.body;

    const store = await prisma.store.findUnique({ where: { partnerId } });
    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const item = await prisma.menuItem.create({
      data: {
        storeId: store.id,
        name,
        description: description || '',
        price: parseFloat(price),
      },
    });

    res.status(201).json({ message: 'Menu item added successfully', item });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add menu item' });
  }
};

// 6. Partner: Delete Menu Item
export const deleteMenuItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.user.id;
    const itemId = req.params.itemId as string;

    const store = await prisma.store.findUnique({ where: { partnerId } });
    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    await prisma.menuItem.delete({
      where: {
        id: itemId,
        storeId: store.id,
      },
    });

    res.status(200).json({ message: 'Menu item removed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete menu item' });
  }
};