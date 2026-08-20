import { Router } from 'express';
import { getSales, createSale, importAllSales, getSalesSummary } from '../controllers/sale.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/', getSales);
router.get('/summary', getSalesSummary);
router.post('/', createSale);
router.post('/import-all', importAllSales);

export default router;
