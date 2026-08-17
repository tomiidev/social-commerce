import { Router } from 'express';
import { getSales, createSale } from '../controllers/sale.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/', getSales);
router.post('/', createSale);

export default router;
