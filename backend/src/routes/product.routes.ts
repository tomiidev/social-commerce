import { Router } from 'express';
import { getProducts, getMostConsultedProducts, getProductById, createProduct, updateProduct, deleteProduct, importProducts, uploadProductImage, bulkCreateProducts, syncStockGlobal, countProducts } from '../controllers/product.controller';
import { protect } from '../middleware/auth';
import { uploadProductImage as uploadMiddleware } from '../middleware/upload';

const router = Router();

router.use(protect);

router.get('/', getProducts);
router.get('/count', countProducts);
router.get('/most-consulted', getMostConsultedProducts);
router.post('/import', importProducts);
router.post('/bulk', bulkCreateProducts);
router.post('/sync-stock', syncStockGlobal);
// Upload image to S3 — must be declared before /:id routes to avoid param conflicts
router.post('/upload-image', uploadMiddleware.single('image'), uploadProductImage);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;
