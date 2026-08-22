import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env variables
const envPath = fs.existsSync(path.join(__dirname, '../../.env'))
  ? path.join(__dirname, '../../.env')
  : path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

import { Store } from '../models/Store';
import { StoreConnections } from '../models/StoreConnections';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Post } from '../models/Post';
import { Customer } from '../models/Customer';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Sale } from '../models/Sale';
import { AIUsage } from '../models/AIUsage';
import { AIConversation } from '../models/AIConversation';
import { BillingTransaction } from '../models/BillingTransaction';
import { BillingSummary } from '../models/BillingSummary';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/socialflow';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: 'socialflow' });
    console.log('Connected successfully!');

    // Clear existing data
    console.log('Clearing old data...');
    await Store.deleteMany({});
    await StoreConnections.deleteMany({});
    await User.deleteMany({});
    await Product.deleteMany({});
    await Post.deleteMany({});
    await Customer.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await Sale.deleteMany({});
    await AIUsage.deleteMany({});
    await AIConversation.deleteMany({});
    await BillingTransaction.deleteMany({});
    await BillingSummary.deleteMany({});
    console.log('Database cleared.');

    // 1. Create Store
    const store = await Store.create({
      name: 'Tienda Urbana',
      plan: 'Plan Pro',
      logo: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=150',
    });
    await StoreConnections.create({ storeId: store._id });

    // 2. Create User
    const passwordHash = await bcrypt.hash('password123', 10);
    await User.create({
      name: 'Camila Rodríguez',
      email: 'camila@tiendaurbana.uy',
      password: passwordHash,
      storeId: store._id,
      role: 'admin',
    });

    // 3. Create Products
    const productsData = [
      { storeId: store._id, name: 'Campera Nike', price: 3990, stock: 50, sku: 'NK-JKT-01', status: 'active' },
      { storeId: store._id, name: 'Zapatillas Adidas', price: 5990, stock: 70, sku: 'AD-SHO-02', status: 'active' },
      { storeId: store._id, name: 'Remera Básica', price: 1290, stock: 150, sku: 'UB-TEE-03', status: 'active' },
      { storeId: store._id, name: 'Pantalón Cargo', price: 2490, stock: 40, sku: 'UB-CARGO-05', status: 'active' },
      { storeId: store._id, name: 'Buzo Hoodie', price: 2790, stock: 30, sku: 'UB-HD-06', status: 'active' },
      { storeId: store._id, name: 'Gorro Urbano', price: 890, stock: 100, sku: 'UB-HAT-04', status: 'active' },
      { storeId: store._id, name: 'Campera Jean', price: 3290, stock: 20, sku: 'UB-DEN-08', status: 'active' },
      { storeId: store._id, name: 'Cinturón Cuero', price: 1590, stock: 60, sku: 'UB-BELT-09', status: 'active' },
    ];
    const products = await Product.create(productsData);

    // 4. Create Customers
    const customersData = [
      { storeId: store._id, name: 'María González', username: '@marieg_23', channel: 'instagram' },
      { storeId: store._id, name: 'Juan Pérez', username: 'juan_perez_ok', channel: 'facebook' },
      { storeId: store._id, name: 'Sofía Lima', username: '@sofi.lima', channel: 'instagram' },
      { storeId: store._id, name: 'Pedro Acosta', username: 'pedro.acosta.7', channel: 'facebook' },
      { storeId: store._id, name: 'Valentina R.', username: '@valen_rod', channel: 'instagram' },
      { storeId: store._id, name: 'Lucas Rodríguez', username: 'lucas_rod_fb', channel: 'facebook' },
      { storeId: store._id, name: 'Camila Benítez', username: '@cami_benitez', channel: 'instagram' },
      { storeId: store._id, name: 'Diego Torres', username: '@dtorres', channel: 'instagram' },
      { storeId: store._id, name: 'Ana Silva', username: 'ana_silva88', channel: 'facebook' },
      { storeId: store._id, name: 'Lucía Fernández', username: '@lucia_f', channel: 'instagram' },
    ];
    const customers = await Customer.create(customersData);

    // 5. BULK SEEDING (500 Sales & Billing Transactions)
    console.log('Seeding 500 bulk sales and billing transactions...');
    const billingArray = [];
    let totalCharges = 0;
    
    for (let i = 0; i < 500; i++) {
        const product = products[i % products.length];
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 90));

        const sale = await Sale.create({
            storeId: store._id,
            customerId: customers[i % customers.length]._id,
            productId: product._id,
            amount: product.price,
            date: date,
            channel: 'mercadolibre',
            status: 'confirmed',
            rawOrderData: { id: `order_${i}` }
        });

        const commission = product.price * 0.1;
        totalCharges += commission;

        billingArray.push({
            storeId: store._id,
            saleId: sale._id,
            date: date,
            description: 'Comisión MercadoLibre',
            amount: commission,
            type: 'charge',
            category: 'Comisión Plataforma',
            invoiceNumber: `INV-${i}`,
            saleNumber: `SALE-${i}`,
            publicationTitle: product.name,
        });
    }
    await BillingTransaction.create(billingArray);
    
    // Create Summary
    await BillingSummary.create({
        storeId: store._id,
        totalCharges: totalCharges,
        totalRefunds: 0,
        balance: totalCharges
    });
    console.log(`Created 500 sales and 500 billing transactions. Summary updated.`);

    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('CRITICAL SEED ERROR:', error);
    process.exit(1);
  }
}

seed();
