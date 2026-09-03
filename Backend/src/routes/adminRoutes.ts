import { Router } from 'express';
import { 
  getAdminStats, 
  getAdminOrders, 
  getAdminDrivers, 
  getPendingLocationRequests, 
  reviewLocationRequest 
} from '../controllers/adminController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/stats', getAdminStats as any);
router.get('/orders', getAdminOrders as any);
router.get('/drivers', getAdminDrivers as any);

// Location Change Governance
router.get('/location-requests', getPendingLocationRequests as any);
router.post('/location-requests/:storeId/review', reviewLocationRequest as any);

export default router;