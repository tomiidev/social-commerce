import { Router } from 'express';
import { getPosts } from '../controllers/post.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/', getPosts);

export default router;
