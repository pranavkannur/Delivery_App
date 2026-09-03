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

router.use(authenticateJWT);
router.use(authorizeRoles('ADMIN'));

router.get('/stats', getAdminStats);
router.get('/orders', getAdminOrders);
router.get('/drivers', getAdminDrivers);

// Location Change Governance
router.get('/location-requests', getPendingLocationRequests);
router.post('/location-requests/:storeId/review', reviewLocationRequest);

export default router;