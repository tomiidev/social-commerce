import { Router } from 'express';
import { getCustomers, getCustomerById, updateCustomer } from '../controllers/customer.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.put('/:id', updateCustomer);

export default router;
