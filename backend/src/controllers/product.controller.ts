import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { InstagramProvider, FacebookProvider } from '../services/SocialProvider';
import { MeliProvider } from '../services/MeliProvider';
import { S3_BUCKET_NAME, S3_REGION } from '../config/s3';
import mongoose from 'mongoose';

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const { search, channel, status, sortBy, order } = req.query;

    const query: any = { storeId: new mongoose.Types.ObjectId(storeId) };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (channel) {
       query.channels = { $in: [channel] }; 
    }
    if (status) {
      query.status = status;
    }

    let sortOptions: any = { createdAt: -1 };
    if (sortBy) {
      const field = sortBy.toString();
      const sortOrder = order === 'desc' ? -1 : 1;
      sortOptions = { [field]: sortOrder };
    }

    const products = await Product.find(query).sort(sortOptions);
    return res.status(200).json(products);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ error: 'Error al obtener productos' });
  }
};

export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { id } = req.params;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const product = await Product.findOne({
      _id: id,
      storeId: new mongoose.Types.ObjectId(storeId),
    });

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.status(200).json(product);
  } catch (error: any) {
    console.error('Error fetching product:', error);
    return res.status(500).json({ error: 'Error al obtener producto' });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const { name, description, price, stock, sku, sizes, colors, image, channels, status } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'El nombre y precio son requeridos' });
    }

    const newProduct = await Product.create({
      storeId: new mongoose.Types.ObjectId(storeId),
      name,
      description: description || '',
      price,
      stock: stock || 0,
      sku: sku || '',
      sizes: sizes || [],
      colors: colors || [],
      image: image || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=300',
      channels: channels || ['instagram'],
      status: status || 'active',
    });

    return res.status(201).json(newProduct);
  } catch (error: any) {
    console.error('Error creating product:', error);
    return res.status(500).json({ error: 'Error al crear producto' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { id } = req.params;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const { name, description, price, stock, sku, sizes, colors, image, channels, status } = req.body;

    const product = await Product.findOneAndUpdate(
      { _id: id, storeId: new mongoose.Types.ObjectId(storeId) },
      {
        name,
        description,
        price,
        stock,
        sku,
        sizes,
        colors,
        image,
        channels,
        status,
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.status(200).json(product);
  } catch (error: any) {
    console.error('Error updating product:', error);
    return res.status(500).json({ error: 'Error al editar producto' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { id } = req.params;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const product = await Product.findOneAndDelete({
      _id: id,
      storeId: new mongoose.Types.ObjectId(storeId),
    });

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.status(200).json({ message: 'Producto eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ error: 'Error al eliminar producto' });
  }
};

/**
 * Imports product catalogues from Social Providers (Meta/MercadoLibre)
 */
export const importProducts = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    // Fetch store for credentials
    const store = await Store.findById(storeId);

    // Instantiating providers through clean abstractions
    const igProvider = new InstagramProvider();
    const fbProvider = new FacebookProvider();
    const meliProvider = new MeliProvider(store?.meliAccessToken || null);

    // Call sync on provider instances
    const igSynced = await igProvider.syncProducts(storeId);
    const fbSynced = await fbProvider.syncProducts(storeId);
    const meliSynced = await meliProvider.syncProducts(storeId);

    const allSynced = [...igSynced, ...fbSynced, ...meliSynced];
    const importedProducts = [];

    for (const item of allSynced) {
      // Check if product with this SKU already exists
      let existing = await Product.findOne({
        storeId: new mongoose.Types.ObjectId(storeId),
        sku: item.sku,
      });

      if (!existing) {
        const created = await Product.create({
          storeId: new mongoose.Types.ObjectId(storeId),
          name: item.name,
          description: item.description,
          price: item.price,
          stock: item.stock,
          sku: item.sku,
          sizes: item.sizes,
          colors: item.colors,
          image: item.image,
          channels: item.channels,
          status: item.status,
          queriesCount: 15 // Seed initial simulated query count
        });
        importedProducts.push(created);
      } else {
        // Just update stock
        existing.stock += item.stock || 0;
        await existing.save();
        importedProducts.push(existing);
      }
    }

    return res.status(200).json({
      message: `Sincronización completada. Se importaron/actualizaron ${importedProducts.length} productos desde Meta y Mercado Libre.`,
      products: importedProducts
    });
  } catch (error: any) {
    console.error('Error importing products from providers:', error);
    return res.status(500).json({ error: 'Error al importar productos de los canales' });
  }
};

/**
 * Handles product image upload to AWS S3 via multer-s3.
 * Expects a multipart/form-data request with a single file field named 'image'.
 * Returns the public S3 URL of the uploaded file.
 */
export const uploadProductImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    }

    // multer-s3 attaches the S3 URL directly on req.file.location
    const file = req.file as Express.MulterS3.File;
    const imageUrl = file.location || `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${file.key}`;

    return res.status(200).json({ url: imageUrl, key: file.key });
  } catch (error: any) {
    console.error('Error uploading product image to S3:', error);
    return res.status(500).json({ error: 'Error al subir imagen a S3' });
  }
};
