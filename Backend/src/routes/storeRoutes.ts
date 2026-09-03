import { Router } from 'express';
import { 
  getPartnerStores, 
  getMyStore, 
  setInitialLocation, 
  requestLocationChange, 
  addMenuItem, 
  deleteMenuItem,
  toggleStoreStatus 
} from '../controllers/storeController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// 1. Public: Customers explore all stores
router.get('/', getPartnerStores as any);

// 2. Partner protected endpoints
router.get('/my-store', authenticateJWT, authorizeRoles('PARTNER'), getMyStore as any);
router.post('/location/initial', authenticateJWT, authorizeRoles('PARTNER'), setInitialLocation as any);
router.post('/location/request-change', authenticateJWT, authorizeRoles('PARTNER'), requestLocationChange as any);
router.post('/menu', authenticateJWT, authorizeRoles('PARTNER'), addMenuItem as any);
router.delete('/menu/:itemId', authenticateJWT, authorizeRoles('PARTNER'), deleteMenuItem as any);
router.post('/toggle-status', authenticateJWT, authorizeRoles('PARTNER'), toggleStoreStatus as any);

export default router;