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

    // Filter to only those with status === 'PENDING'
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
    const { action } = req.body; // 'APPROVE' or 'REJECT'

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