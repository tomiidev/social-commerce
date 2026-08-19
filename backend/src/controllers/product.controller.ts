import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { StoreConnections } from '../models/StoreConnections';
import { InstagramProvider, FacebookProvider } from '../services/SocialProvider';
import { MeliProvider } from '../services/MeliProvider';
import { ShopifyService } from '../services/shopify.service';
import { S3_BUCKET_NAME, S3_REGION } from '../config/s3';
import mongoose from 'mongoose';

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const { search, channel, status, sortBy, order, page, limit } = req.query;

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

    const currentPage = parseInt(page as string) || 1;
    const perPage = parseInt(limit as string) || 15;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    return res.status(200).json({
      products,
      total,
      currentPage,
      pages: Math.ceil(total / perPage),
      perPage
    });
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

export const getMostConsultedProducts = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const products = await Product.find({ storeId: new mongoose.Types.ObjectId(storeId) })
      .sort({ queriesCount: -1 })
      .limit(5);

    return res.status(200).json(products);
  } catch (error: any) {
    console.error('Error fetching most consulted products:', error);
    return res.status(500).json({ error: 'Error al obtener productos más consultados' });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const { 
      name, description, price, stock, sku, sizes, colors, image, channels, status,
      vendor, productType, tags, compareAtPrice, weight, weightUnit, barcode
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'El nombre y precio son requeridos' });
    }

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });
    
    const connections = await StoreConnections.findOne({ storeId: new mongoose.Types.ObjectId(storeId) });

    const errors: string[] = [];
    const publishedChannels: string[] = [];

    // Handle Shopify publishing
    if (channels?.includes('shopify')) {
      if (connections?.shopifyConnected) {
        try {
          await ShopifyService.createProduct(connections.shopifyShopUrl!, connections.shopifyAccessToken!, {
            name, description, price, stock, sku, status,
            vendor, productType, tags, compareAtPrice, weight, weightUnit, barcode
          });
          publishedChannels.push('Shopify');
        } catch (err: any) {
          console.error('Error publishing to Shopify:', err);
          errors.push('Error al publicar en Shopify: ' + err.message);
        }
      } else {
        errors.push('Shopify no está conectado');
      }
    }

    // Handle Mercado Libre publishing
    if (channels?.includes('mercadolibre')) {
      if (connections?.meliConnected) {
        try {
          const meliProvider = new MeliProvider(connections.meliAccessToken || null);
          await meliProvider.createProduct({
            name, description, price, stock, image
          });
          publishedChannels.push('Mercado Libre');
        } catch (err: any) {
          console.error('Error publishing to Mercado Libre:', err);
          errors.push('Error al publicar en Mercado Libre: ' + err.message);
        }
      } else {
        errors.push('Mercado Libre no está conectado');
      }
    }

    // Always create in MongoDB
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
      vendor,
      productType,
      tags,
      compareAtPrice,
      weight,
      weightUnit,
      barcode
    });

    return res.status(201).json({
      product: newProduct,
      message: 'Producto procesado',
      publishedChannels,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return res.status(500).json({ error: 'Error interno al crear producto' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { id } = req.params;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    // 1. Get product and store
    const product = await Product.findOne({ _id: id, storeId: new mongoose.Types.ObjectId(storeId) });
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const { name, description, price, stock, sku, sizes, colors, image, channels, status } = req.body;
    
    // Check if it's a Mercado Libre product
    const isMeliProduct = product.channels.includes('mercadolibre');

    const connections = await StoreConnections.findOne({ storeId: new mongoose.Types.ObjectId(storeId) });

    // 2. Sync with MercadoLibre if needed
    if (isMeliProduct && channels?.includes('mercadolibre')) {
      const meliProvider = new MeliProvider(connections?.meliAccessToken || null);

      // Map update fields to MELI format
      const meliUpdateData = {
        price: price,
        available_quantity: stock,
        status: status === 'active' ? 'active' : 'paused'
      };

      // We use product.sku as the MeliItemId if it's the identifier in our DB
      await meliProvider.updateProduct(product.sku, meliUpdateData, description);
    }

    // 3. Update in MongoDB
    // If it's a Meli product, restrict which fields we update from the body
    const updateData: any = {
      name: isMeliProduct ? product.name : name, // Restrict name if ML
      description,
      price,
      stock,
      sku: isMeliProduct ? product.sku : sku, // Restrict SKU if ML
      sizes,
      colors,
      image: isMeliProduct ? product.image : image, // Restrict image if ML
      channels,
      status,
    };

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: id, storeId: new mongoose.Types.ObjectId(storeId) },
      updateData,
      { new: true }
    );

    return res.status(200).json(updatedProduct);
  } catch (error: any) {
    console.error('Error updating product:', error);
    return res.status(500).json({ error: `Error al editar producto: ${error.message}` });
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
 * Imports product catalogues from Social Providers (Meta/MercadoLibre/Shopify)
 */
export const importProducts = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    // Fetch store for credentials
    const connections = await StoreConnections.findOne({ storeId: new mongoose.Types.ObjectId(storeId) });

    // Instantiating providers through clean abstractions
    const igProvider = new InstagramProvider();
    const fbProvider = new FacebookProvider();
    const meliProvider = new MeliProvider(connections?.meliAccessToken || null);

    // Call sync on provider instances
    const igSynced = await igProvider.syncProducts(storeId);
    const fbSynced = await fbProvider.syncProducts(storeId);
    const meliSynced = await meliProvider.syncProducts(storeId);
    const shopifySynced = await ShopifyService.syncProducts(storeId, connections?.shopifyShopUrl, connections?.shopifyAccessToken);
    
    const allSynced = [...igSynced, ...fbSynced, ...meliSynced, ...shopifySynced];
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
        // Just update stock/info
        existing.name = item.name || existing.name;
        existing.description = item.description || existing.description;
        existing.price = item.price || existing.price;
        existing.stock = item.stock ?? existing.stock;
        existing.status = item.status || existing.status;
        // Ensure channels include the new channel
        const newChannels = Array.from(new Set([...existing.channels, ...item.channels]));
        existing.channels = newChannels as any;
        await existing.save();
        importedProducts.push(existing);
      }
    }

    return res.status(200).json({
      message: `Sincronización completada. Se importaron/actualizaron ${importedProducts.length} productos desde Meta, Mercado Libre y Shopify.`,
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

/**
 * Creates multiple products in a bulk operation
 */
export const bulkCreateProducts = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Se requiere una lista de productos' });
    }

    const createdProducts = [];
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      const item = products[i];
      
      if (!item.name) {
        errors.push({ index: i, error: 'El nombre es obligatorio' });
        continue;
      }
      
      if (item.price === undefined || item.price === null || isNaN(Number(item.price))) {
        errors.push({ index: i, error: 'El precio es obligatorio y debe ser un número' });
        continue;
      }

      // Format sizes and colors
      let sizesArr: string[] = [];
      if (Array.isArray(item.sizes)) {
        sizesArr = item.sizes.map((s: any) => String(s).trim()).filter(Boolean);
      } else if (typeof item.sizes === 'string') {
        sizesArr = item.sizes.split(',').map((s: string) => s.trim()).filter(Boolean);
      }

      let colorsArr: string[] = [];
      if (Array.isArray(item.colors)) {
        colorsArr = item.colors.map((c: any) => String(c).trim()).filter(Boolean);
      } else if (typeof item.colors === 'string') {
        colorsArr = item.colors.split(',').map((c: string) => c.trim()).filter(Boolean);
      }

      let channelsArr: ('instagram' | 'facebook' | 'mercadolibre' | 'import')[] = ['import'];
      if (Array.isArray(item.channels)) {
        channelsArr = item.channels.filter((c: any) => ['instagram', 'facebook', 'mercadolibre', 'import'].includes(c));
      } else if (typeof item.channels === 'string') {
        channelsArr = item.channels
          .split(',')
          .map((c: string) => c.trim().toLowerCase())
          .filter((c: string) => ['instagram', 'facebook', 'mercadolibre', 'import'].includes(c)) as any;
      }

      if (channelsArr.length === 0) {
        channelsArr = ['import'];
      }

      try {
        const productData = {
          storeId: new mongoose.Types.ObjectId(storeId),
          name: String(item.name).trim(),
          description: item.description ? String(item.description).trim() : '',
          price: Number(item.price),
          stock: item.stock !== undefined && item.stock !== null ? Number(item.stock) : 0,
          sku: item.sku ? String(item.sku).trim() : '',
          sizes: sizesArr,
          colors: colorsArr,
          image: item.image || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=300',
          channels: channelsArr,
          status: item.status === 'inactive' ? 'inactive' : 'active',
        };

        const created = await Product.create(productData);
        createdProducts.push(created);
      } catch (err: any) {
        errors.push({ index: i, name: item.name, error: err.message });
      }
    }

    return res.status(201).json({
      message: `Se importaron ${createdProducts.length} productos correctamente.`,
      count: createdProducts.length,
      products: createdProducts,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error in bulk creation:', error);
    return res.status(500).json({ error: `Error al crear productos en lote: ${error.message}` });
  }
};
