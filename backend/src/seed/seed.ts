import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env variables from backend or root directory
const envPath = fs.existsSync(path.join(__dirname, '../../.env'))
  ? path.join(__dirname, '../../.env')
  : path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

import { Store } from '../models/Store';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Post } from '../models/Post';
import { Customer } from '../models/Customer';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Sale } from '../models/Sale';
import { AIUsage } from '../models/AIUsage';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/socialflow';

async function seed() {
  try {
    console.log('Connecting to MongoDB database specifically at:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI, { dbName: 'socialflow' });
    console.log('Connected successfully!');

    // Clear existing data
    console.log('Clearing old data...');
    await Store.deleteMany({});
    await User.deleteMany({});
    await Product.deleteMany({});
    await Post.deleteMany({});
    await Customer.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await Sale.deleteMany({});
    await AIUsage.deleteMany({});
    console.log('Database cleared.');

    // 1. Create Store
    console.log('Seeding Store...');
    const store = await Store.create({
      name: 'Tienda Urbana',
      plan: 'Plan Pro',
      logo: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=150',
    });
    console.log('Created Store:', store.name, 'with ID:', store._id);

    // 2. Create User
    console.log('Seeding User...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const user = await User.create({
      name: 'Camila Rodríguez',
      email: 'camila@tiendaurbana.uy',
      password: passwordHash,
      storeId: store._id,
      role: 'admin',
    });
    console.log('Created User:', user.name, 'with email:', user.email);

    // 3. Create Products
    console.log('Seeding Products...');
    const productsData = [
      {
        storeId: store._id,
        name: 'Campera Nike',
        description: 'Campera cortaviento Nike impermeable, ideal para running o uso urbano diario.',
        price: 3990,
        stock: 3,
        sku: 'NK-JKT-01',
        sizes: ['S', 'M', 'L'],
        colors: ['Negro', 'Azul'],
        image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=300',
        queriesCount: 324,
        channels: ['instagram', 'facebook'],
        status: 'active',
      },
      {
        storeId: store._id,
        name: 'Zapatillas Adidas',
        description: 'Zapatillas urbanas Adidas con amortiguación premium y suela antideslizante.',
        price: 5990,
        stock: 7,
        sku: 'AD-SHO-02',
        sizes: ['38', '39', '40', '41', '42'],
        colors: ['Blanco', 'Negro', 'Gris'],
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=300',
        queriesCount: 211,
        channels: ['instagram', 'facebook'],
        status: 'active',
      },
      {
        storeId: store._id,
        name: 'Remera Básica',
        description: 'Remera 100% algodón peinado de calidad premium. Trama suave y duradera.',
        price: 1290,
        stock: 15,
        sku: 'UB-TEE-03',
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Blanco', 'Negro', 'Gris Melange', 'Bordó'],
        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=300',
        queriesCount: 87,
        channels: ['instagram'],
        status: 'active',
      },
      {
        storeId: store._id,
        name: 'Gorro Urbano',
        description: 'Gorro de lana tejido con diseño abrigado, ideal para los días fríos.',
        price: 890,
        stock: 22,
        sku: 'UB-HAT-04',
        sizes: ['Único'],
        colors: ['Negro', 'Gris', 'Verde Oliva'],
        image: 'https://images.unsplash.com/photo-1576871337622-98d48d435350?q=80&w=300',
        queriesCount: 65,
        channels: ['instagram', 'facebook'],
        status: 'active',
      },
      {
        storeId: store._id,
        name: 'Pantalón Cargo',
        description: 'Pantalón cargo de gabardina súper resistente con bolsillos laterales y cordón ajustable.',
        price: 2490,
        stock: 9,
        sku: 'UB-CARGO-05',
        sizes: ['38', '40', '42', '44'],
        colors: ['Beige', 'Verde Militar', 'Negro'],
        image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=300',
        queriesCount: 48,
        channels: ['facebook'],
        status: 'active',
      },
      {
        storeId: store._id,
        name: 'Buzo con Capucha Hoodie',
        description: 'Buzo clásico hoodie de frisa pesada abrigado con bolsillo canguro.',
        price: 2790,
        stock: 12,
        sku: 'UB-HD-06',
        sizes: ['M', 'L', 'XL'],
        colors: ['Negro', 'Gris Topo', 'Amarillo Mostaza'],
        image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=300',
        queriesCount: 36,
        channels: ['instagram'],
        status: 'active',
      },
      {
        storeId: store._id,
        name: 'Medias Urbanas Pack x3',
        description: 'Medias de algodón con elasticidad superior, ideales para calzado deportivo.',
        price: 490,
        stock: 45,
        sku: 'UB-SOX-07',
        sizes: ['Único'],
        colors: ['Blanco', 'Negro', 'Mix'],
        image: 'https://images.unsplash.com/photo-1582966772680-860e372bb558?q=80&w=300',
        queriesCount: 14,
        channels: ['instagram', 'facebook'],
        status: 'active',
      },
      {
        storeId: store._id,
        name: 'Campera de Jean Clásica',
        description: 'Campera de jean rígido color azul localizado con botones metálicos de alta calidad.',
        price: 3290,
        stock: 5,
        sku: 'UB-DEN-08',
        sizes: ['S', 'M', 'L'],
        colors: ['Azul Localizado'],
        image: 'https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?q=80&w=300',
        queriesCount: 29,
        channels: ['facebook'],
        status: 'active',
      },
      {
        storeId: store._id,
        name: 'Cinturón Cuero Legítimo',
        description: 'Cinturón de cuero vacuno curtido vegetal con hebilla de bronce satinado.',
        price: 1590,
        stock: 18,
        sku: 'UB-BELT-09',
        sizes: ['90', '95', '100', '105'],
        colors: ['Marrón', 'Negro'],
        image: 'https://images.unsplash.com/photo-1624222247344-550fb8ecfe7c?q=80&w=300',
        queriesCount: 12,
        channels: ['instagram'],
        status: 'active',
      },
      {
        storeId: store._id,
        name: 'Short de Baño Verano',
        description: 'Short de baño de secado rápido con suspensor interior y cordón chato.',
        price: 1190,
        stock: 0,
        sku: 'UB-SWIM-10',
        sizes: ['S', 'M', 'L'],
        colors: ['Azul Francia', 'Verde Agua'],
        image: 'https://images.unsplash.com/photo-1598136490941-30d885318abd?q=80&w=300',
        queriesCount: 3,
        channels: ['instagram'],
        status: 'inactive',
      }
    ];

    const products = await Product.create(productsData);
    console.log(`Created ${products.length} Products.`);

    const camperaNike = products[0];
    const zapatillasAdidas = products[1];
    const remeraBasica = products[2];
    const gorroUrbano = products[3];
    const pantalonCargo = products[4];

    // 4. Create Customers
    console.log('Seeding Customers...');
    const customersData = [
      {
        storeId: store._id,
        name: 'María González',
        username: '@marieg_23',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150',
        channel: 'instagram' as const,
        lastInteraction: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
        conversationsCount: 3,
        purchasesCount: 1,
        tags: ['Interesada', 'Camperas', 'Montevideo'],
        notes: 'Preguntó por Camperas Nike talle M. Prefiere retirar en local.',
        city: 'Montevideo',
      },
      {
        storeId: store._id,
        name: 'Juan Pérez',
        username: 'juan_perez_ok',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150',
        channel: 'facebook' as const,
        lastInteraction: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        conversationsCount: 2,
        purchasesCount: 1,
        tags: ['Comprador', 'Maldonado'],
        notes: 'Pidió envío a Maldonado por DAC. Todo ok.',
        city: 'Maldonado',
      },
      {
        storeId: store._id,
        name: 'Sofía Lima',
        username: '@sofi.lima',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150',
        channel: 'instagram' as const,
        lastInteraction: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        conversationsCount: 1,
        purchasesCount: 0,
        tags: ['Interesada', 'Remeras'],
        notes: 'Consulta constante por colores de Remeras Básicas.',
        city: 'Canelones',
      },
      {
        storeId: store._id,
        name: 'Pedro Acosta',
        username: 'pedro.acosta.7',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150',
        channel: 'facebook' as const,
        lastInteraction: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        conversationsCount: 1,
        purchasesCount: 0,
        tags: ['Interesado', 'Zapatillas', 'Montevideo'],
        notes: 'Preguntó por talles de calzado Adidas en 42.',
        city: 'Montevideo',
      },
      {
        storeId: store._id,
        name: 'Valentina R.',
        username: '@valen_rod',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150',
        channel: 'instagram' as const,
        lastInteraction: new Date(Date.now() - 1000 * 60 * 60 * 36), // 1.5 days ago
        conversationsCount: 2,
        purchasesCount: 2,
        tags: ['Cliente VIP', 'Salto'],
        notes: 'Cliente muy amable, siempre abona por transferencia.',
        city: 'Salto',
      },
      {
        storeId: store._id,
        name: 'Lucas Rodríguez',
        username: 'lucas_rod_fb',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150',
        channel: 'facebook' as const,
        lastInteraction: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
        conversationsCount: 1,
        purchasesCount: 0,
        tags: ['Duda Envíos'],
        notes: 'Consultó si aceptamos transferencia bancaria ITAU.',
        city: 'Paysandú',
      },
      {
        storeId: store._id,
        name: 'Camila Benítez',
        username: '@cami_benitez',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=150',
        channel: 'instagram' as const,
        lastInteraction: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
        conversationsCount: 1,
        purchasesCount: 1,
        tags: ['Montevideo'],
        notes: 'Compró gorro de regalo.',
        city: 'Montevideo',
      }
    ];

    const customers = await Customer.create(customersData);
    console.log(`Created ${customers.length} Customers.`);

    const maria = customers[0];
    const juan = customers[1];
    const sofia = customers[2];
    const pedro = customers[3];
    const valentina = customers[4];
    const lucas = customers[5];

    // 5. Create Posts
    console.log('Seeding Posts...');
    const postsData = [
      {
        storeId: store._id,
        productId: camperaNike._id,
        image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=400',
        caption: 'Campera Nike nueva 🔥 Ideal para los días frescos. Impermeable y cortaviento. Comentá o mandanos un MD y reservá la tuya hoy mismo!',
        channel: 'instagram' as const,
        commentsCount: 87,
        queriesCount: 324,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      },
      {
        storeId: store._id,
        productId: zapatillasAdidas._id,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400',
        caption: 'Zapatillas Adidas clásicas que van con todo. Cómodas, duraderas y con estilo urbano incomparable. 🔥 Descuentos especiales pagando vía transferencia.',
        channel: 'facebook' as const,
        commentsCount: 52,
        queriesCount: 211,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
      },
      {
        storeId: store._id,
        productId: remeraBasica._id,
        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=400',
        caption: 'Los básicos nunca fallan. Remera básica de puro algodón en 4 colores. ¿Cuál es tu favorito? Escribinos por MD para stock 📩',
        channel: 'instagram' as const,
        commentsCount: 35,
        queriesCount: 87,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
      },
      {
        storeId: store._id,
        productId: gorroUrbano._id,
        image: 'https://images.unsplash.com/photo-1576871337622-98d48d435350?q=80&w=400',
        caption: 'Combatí el frío de la mañana con nuestros Gorros Urbanos tejidos. Cómodos y abrigados en talle único ❄️',
        channel: 'instagram' as const,
        commentsCount: 18,
        queriesCount: 65,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
      }
    ];

    await Post.create(postsData);
    console.log('Seeding Posts completed.');

    // 6. Create Conversations & Messages
    console.log('Seeding Conversations & Messages...');
    
    // Conversation with María (Instagram)
    const convMaria = await Conversation.create({
      storeId: store._id,
      customerId: maria._id,
      channel: 'instagram',
      status: 'open',
      unread: true,
      lastMessageText: 'Perfecto! Me la reservo',
      lastMessageTime: maria.lastInteraction,
    });

    await Message.create([
      {
        conversationId: convMaria._id,
        sender: 'customer',
        text: 'Hola! Tenés la campera en talle M?',
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        conversationId: convMaria._id,
        sender: 'user',
        text: 'Hola! Sí, tenemos la campera en talle M! Quedan 3 unidades disponibles. El precio es $3.990.',
        createdAt: new Date(Date.now() - 1000 * 60 * 25),
      },
      {
        conversationId: convMaria._id,
        sender: 'customer',
        text: 'Perfecto! Me la reservo',
        createdAt: maria.lastInteraction,
      }
    ]);

    // Conversation with Juan (Facebook)
    const convJuan = await Conversation.create({
      storeId: store._id,
      customerId: juan._id,
      channel: 'facebook',
      status: 'open',
      unread: false,
      lastMessageText: 'Consulta por envío a Maldonado',
      lastMessageTime: juan.lastInteraction,
    });

    await Message.create([
      {
        conversationId: convJuan._id,
        sender: 'customer',
        text: 'Hola, buenas tardes. Hacen envíos?',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
      },
      {
        conversationId: convJuan._id,
        sender: 'user',
        text: 'Hola Juan! Sí, hacemos envíos a todo el país. A dónde necesitarías?',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2.5),
      },
      {
        conversationId: convJuan._id,
        sender: 'customer',
        text: 'Consulta por envío a Maldonado',
        createdAt: juan.lastInteraction,
      }
    ]);

    // Conversation with Sofía (Instagram)
    const convSofia = await Conversation.create({
      storeId: store._id,
      customerId: sofia._id,
      channel: 'instagram',
      status: 'open',
      unread: true,
      lastMessageText: '¿De qué material es la remera?',
      lastMessageTime: sofia.lastInteraction,
    });

    await Message.create([
      {
        conversationId: convSofia._id,
        sender: 'customer',
        text: '¿De qué material es la remera?',
        createdAt: sofia.lastInteraction,
      }
    ]);

    // Conversation with Pedro (Facebook)
    const convPedro = await Conversation.create({
      storeId: store._id,
      customerId: pedro._id,
      channel: 'facebook',
      status: 'open',
      unread: false,
      lastMessageText: '¿Tenés en color negro?',
      lastMessageTime: pedro.lastInteraction,
    });

    await Message.create([
      {
        conversationId: convPedro._id,
        sender: 'customer',
        text: '¿Tenés en color negro?',
        createdAt: pedro.lastInteraction,
      }
    ]);

    // Conversation with Valentina (Instagram)
    const convValen = await Conversation.create({
      storeId: store._id,
      customerId: valentina._id,
      channel: 'instagram',
      status: 'closed',
      unread: false,
      lastMessageText: 'Gracias! Me interesa',
      lastMessageTime: valentina.lastInteraction,
    });

    await Message.create([
      {
        conversationId: convValen._id,
        sender: 'customer',
        text: 'Hola! Quedan zapatillas en 39?',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 38),
      },
      {
        conversationId: convValen._id,
        sender: 'user',
        text: 'Hola Valentina! Sí, tenemos stock en talle 39 para entrega inmediata.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 37),
      },
      {
        conversationId: convValen._id,
        sender: 'customer',
        text: 'Gracias! Me interesa',
        createdAt: valentina.lastInteraction,
      }
    ]);

    // Conversation with Lucas (Facebook)
    const convLucas = await Conversation.create({
      storeId: store._id,
      customerId: lucas._id,
      channel: 'facebook',
      status: 'open',
      unread: false,
      lastMessageText: '¿Aceptan transferencia?',
      lastMessageTime: lucas.lastInteraction,
    });

    await Message.create([
      {
        conversationId: convLucas._id,
        sender: 'customer',
        text: '¿Aceptan transferencia?',
        createdAt: lucas.lastInteraction,
      }
    ]);

    console.log('Seeding Conversations completed.');

    // 7. Create Sales
    console.log('Seeding Sales...');
    const salesData = [
      {
        storeId: store._id,
        customerId: maria._id,
        productId: camperaNike._id,
        amount: camperaNike.price,
        date: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
        channel: 'instagram' as const,
        status: 'confirmed' as const,
      },
      {
        storeId: store._id,
        customerId: juan._id,
        productId: gorroUrbano._id,
        amount: gorroUrbano.price,
        date: new Date(Date.now() - 1000 * 60 * 60 * 36), // 1.5 days ago
        channel: 'facebook' as const,
        status: 'confirmed' as const,
      },
      {
        storeId: store._id,
        customerId: valentina._id,
        productId: zapatillasAdidas._id,
        amount: zapatillasAdidas.price,
        date: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
        channel: 'instagram' as const,
        status: 'confirmed' as const,
      },
      {
        storeId: store._id,
        customerId: valentina._id,
        productId: remeraBasica._id,
        amount: remeraBasica.price,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4), // 4 days ago
        channel: 'instagram' as const,
        status: 'confirmed' as const,
      },
      {
        storeId: store._id,
        customerId: customers[6]._id, // Camila Benitez
        productId: gorroUrbano._id,
        amount: gorroUrbano.price,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6), // 6 days ago
        channel: 'instagram' as const,
        status: 'confirmed' as const,
      },
      {
        storeId: store._id,
        customerId: pedro._id,
        productId: zapatillasAdidas._id,
        amount: zapatillasAdidas.price,
        date: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
        channel: 'facebook' as const,
        status: 'pending' as const, // Pending sale
      },
      {
        storeId: store._id,
        customerId: sofia._id,
        productId: remeraBasica._id,
        amount: remeraBasica.price,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1.2), // 1.2 days ago
        channel: 'instagram' as const,
        status: 'cancelled' as const, // Cancelled sale
      }
    ];

    await Sale.create(salesData);
    console.log('Seeding Sales completed.');

    // 8. Create AIUsage stats
    console.log('Seeding AI Usage records...');
    const aiUsageData = [
      {
        storeId: store._id,
        model: 'gemini-1.5-flash',
        inputTokens: 14500,
        outputTokens: 3200,
        totalTokens: 17700,
        estimatedCost: 0.0020475,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
      },
      {
        storeId: store._id,
        model: 'gemini-1.5-flash',
        inputTokens: 22800,
        outputTokens: 4900,
        totalTokens: 27700,
        estimatedCost: 0.003180,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
      },
      {
        storeId: store._id,
        model: 'gemini-1.5-flash',
        inputTokens: 38200,
        outputTokens: 8100,
        totalTokens: 46300,
        estimatedCost: 0.005295,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)
      }
    ];
    await AIUsage.create(aiUsageData);
    console.log('Seeding AI Usage completed.');

    console.log('------------------------------------------------');
    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('Login credentials:');
    console.log('Email:    camila@tiendaurbana.uy');
    console.log('Password: password123');
    console.log('------------------------------------------------');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('CRITICAL SEED ERROR:', error);
    process.exit(1);
  }
}

seed();
