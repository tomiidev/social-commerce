import { Router } from 'express';
import { getSales, createSale, importAllSales, getSalesSummary, importSalesCsv, updateSale } from '../controllers/sale.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/', getSales);
router.get('/summary', getSalesSummary);
router.post('/', createSale);
router.post('/import-all', importAllSales);
router.post('/import-csv', importSalesCsv);
router.put('/:id', updateSale);

export default router;
