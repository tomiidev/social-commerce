import { Router } from 'express';
import { protect } from '../middleware/auth';
import { StoreConnections } from '../models/StoreConnections';
import { AuthRequest } from '../middleware/auth';
import { Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/status', protect, async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const connections = await StoreConnections.findOne({ 
        storeId: new mongoose.Types.ObjectId(storeId) 
    }).select('metaConnected meliConnected shopifyConnected');

    console.log(`[Connections] Status for store ${storeId}:`, connections);

    if (!connections) {
        return res.status(200).json({ 
            metaConnected: false, 
            meliConnected: false, 
            shopifyConnected: false 
        });
    }

    return res.status(200).json({ 
        metaConnected: connections.metaConnected || false,
        meliConnected: connections.meliConnected || false,
        shopifyConnected: connections.shopifyConnected || false
    });
  } catch (err: any) {
    console.error('[Connections] getStatus error:', err?.message);
    return res.status(500).json({ error: 'Error al obtener estado de conexiones' });
  }
});

export default router;
