import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, importProducts, uploadProductImage } from '../controllers/product.controller';
import { protect } from '../middleware/auth';
import { uploadProductImage as uploadMiddleware } from '../middleware/upload';

const router = Router();

router.use(protect);

router.get('/', getProducts);
router.post('/import', importProducts);
// Upload image to S3 — must be declared before /:id routes to avoid param conflicts
router.post('/upload-image', uploadMiddleware.single('image'), uploadProductImage);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;
