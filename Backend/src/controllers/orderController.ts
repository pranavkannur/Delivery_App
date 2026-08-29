import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../config/db';

// 1. Create a new Order (Customer only)
export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      pickupAddress,
      deliveryAddress,
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng,
      items,
      totalAmount,
    } = req.body;

    if (!pickupAddress || !deliveryAddress || !items || !totalAmount) {
      res.status(400).json({ error: 'Pickup address, delivery address, items, and total amount are required' });
      return;
    }

    // Generate a secure 4-digit Delivery Handover OTP (PIN)
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const order = await prisma.order.create({
      data: {
        customerId,
        pickupAddress,
        deliveryAddress,
        pickupLat: parseFloat(pickupLat) || 0,
        pickupLng: parseFloat(pickupLng) || 0,
        deliveryLat: parseFloat(deliveryLat) || 0,
        deliveryLng: parseFloat(deliveryLng) || 0,
        items,
        totalAmount: parseFloat(totalAmount),
        deliveryOtp,
        status: 'PENDING',
      },
    });

    res.status(201).json({
      message: 'Order placed successfully! Share the delivery OTP with the driver upon delivery.',
      order,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error creating order' });
  }
};

// 2. Get Available Orders (Drivers see all PENDING orders to pick from)
export const getAvailableOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        driverId: null,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Hide deliveryOtp from drivers
    const sanitizedOrders = orders.map(({ deliveryOtp, ...order }) => order);

    res.status(200).json({ availableOrders: sanitizedOrders });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching available orders' });
  }
};

// 3. Get User Orders (Customer sees their orders, Driver sees their assigned orders)
export const getOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (role === 'CUSTOMER') {
      const orders = await prisma.order.findMany({
        where: { customerId: userId },
        include: {
          driver: {
            include: { user: { select: { name: true, phone: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json({ orders });
      return;
    }

    if (role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({ where: { userId } });
      if (!driver) {
        res.status(404).json({ error: 'Driver profile not found' });
        return;
      }

      const orders = await prisma.order.findMany({
        where: { driverId: driver.id },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Hide deliveryOtp from driver view
      const sanitizedOrders = orders.map(({ deliveryOtp, ...order }) => order);
      res.status(200).json({ orders: sanitizedOrders });
      return;
    }

    // Admin view
    const allOrders = await prisma.order.findMany({
      include: {
        customer: { select: { name: true, phone: true } },
        driver: { include: { user: { select: { name: true, phone: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ orders: allOrders });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching orders' });
  }
};

// 4. Driver accepts a PENDING order
export const acceptOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) {
      res.status(404).json({ error: 'Driver profile not found' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status !== 'PENDING' || order.driverId !== null) {
      res.status(400).json({ error: 'This order is no longer available to accept' });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        driverId: driver.id,
        status: 'ACCEPTED',
      },
    });

    const { deliveryOtp, ...sanitized } = updatedOrder;
    res.status(200).json({
      message: 'Order accepted successfully! Proceed to pickup address.',
      order: sanitized,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error accepting order' });
  }
};

// 5. Driver updates status (e.g. mark as PICKED_UP)
export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;
    const { status } = req.body;

    if (status !== 'PICKED_UP') {
      res.status(400).json({ error: 'Use the complete delivery endpoint with OTP to mark as DELIVERED' });
      return;
    }

    const driver = await prisma.driver.findUnique({ where: { userId } });
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order || order.driverId !== driver?.id) {
      res.status(403).json({ error: 'You are not assigned to this order' });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PICKED_UP' },
    });

    const { deliveryOtp, ...sanitized } = updatedOrder;
    res.status(200).json({
      message: 'Order status updated to PICKED_UP',
      order: sanitized,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error updating order status' });
  }
};

// 6. Complete Delivery with Customer OTP
export const completeDelivery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;
    const { otp } = req.body;

    if (!otp) {
      res.status(400).json({ error: 'Customer delivery OTP is required to complete delivery' });
      return;
    }

    const driver = await prisma.driver.findUnique({ where: { userId } });
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order || order.driverId !== driver?.id) {
      res.status(403).json({ error: 'You are not assigned to this order' });
      return;
    }

    if (order.status !== 'PICKED_UP' && order.status !== 'ACCEPTED') {
      res.status(400).json({ error: `Cannot complete delivery from status ${order.status}` });
      return;
    }

    // Verify OTP provided by customer to driver
    if (order.deliveryOtp !== otp.toString().trim()) {
      res.status(400).json({ error: 'Invalid delivery OTP! Please ask the customer for the correct PIN.' });
      return;
    }

    // Complete order & mark driver available
    const [completedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED' },
      }),
      prisma.driver.update({
        where: { id: driver.id },
        data: { isAvailable: true },
      }),
    ]);

    res.status(200).json({
      message: '🎉 Order delivered successfully! Handover verified via OTP.',
      order: completedOrder,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error completing delivery' });
  }
};