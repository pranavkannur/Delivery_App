import { Router } from 'express';
import { getPartnerStores } from '../controllers/storeController';

const router = Router();

// Public endpoint for customers to browse stores
router.get('/', getPartnerStores);

export default router;