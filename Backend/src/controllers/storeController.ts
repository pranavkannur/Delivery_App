import { Request, Response } from 'express';
import prisma from '../config/db';

export const getPartnerStores = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Fetch all registered PARTNER users from database
    const partners = await prisma.user.findMany({
      where: { role: 'PARTNER' },
      select: { id: true, name: true, phone: true, email: true },
    });

    // 2. Default store catalogs with menus
    const storeCatalogs = [
      {
        category: 'Bakery & Pastries',
        rating: 4.9,
        deliveryTime: '20-30 min',
        image: '🥐',
        menu: [
          { id: 'm1', name: 'Artisan Sourdough Loaf', price: 6.5, desc: 'Freshly baked naturally leavened bread' },
          { id: 'm2', name: 'Butter Almond Croissant', price: 4.2, desc: 'Flaky layers with toasted almonds' },
          { id: 'm3', name: 'Cinnamon Swirl Roll', price: 3.8, desc: 'Glazed spiced cinnamon pastry' },
        ],
      },
      {
        category: 'Pizza & Italian',
        rating: 4.8,
        deliveryTime: '25-40 min',
        image: '🍕',
        menu: [
          { id: 'm4', name: 'Woodfired Margherita Pizza', price: 14.0, desc: 'San Marzano tomatoes, fresh basil, mozzarella' },
          { id: 'm5', name: 'Truffle & Mushroom Penne', price: 16.5, desc: 'Creamy black truffle sauce with parmesan' },
          { id: 'm6', name: 'Garlic Herb Dough Sticks', price: 5.5, desc: 'Served with warm marinara dipping sauce' },
        ],
      },
      {
        category: 'Café & Beverages',
        rating: 4.9,
        deliveryTime: '15-25 min',
        image: '☕',
        menu: [
          { id: 'm7', name: 'Single Origin Cold Brew (350ml)', price: 4.5, desc: 'Steeped for 18 hours with citrus notes' },
          { id: 'm8', name: 'Iced Vanilla Oat Latte', price: 5.2, desc: 'Double espresso with organic oat milk' },
          { id: 'm9', name: 'Matcha Green Tea Tonic', price: 4.8, desc: 'Ceremonial grade matcha with sparkling water' },
        ],
      },
      {
        category: 'Fresh Groceries',
        rating: 4.7,
        deliveryTime: '30-45 min',
        image: '🥦',
        menu: [
          { id: 'm10', name: 'Organic Hass Avocados (Pack of 3)', price: 5.0, desc: 'Ripe ready-to-eat organic avocados' },
          { id: 'm11', name: 'Farm Fresh Eggs (12 pcs)', price: 4.0, desc: 'Free range pasture raised eggs' },
          { id: 'm12', name: 'Greek Honeycomb Yogurt (500g)', price: 4.5, desc: 'Thick strained probiotic yogurt' },
        ],
      },
    ];

    // Combine registered partners with store metadata
    const stores = partners.map((partner, index) => {
      const template = storeCatalogs[index % storeCatalogs.length];
      return {
        id: partner.id,
        name: partner.name,
        category: template.category,
        rating: template.rating,
        deliveryTime: template.deliveryTime,
        image: template.image,
        menu: template.menu,
        pickupAddress: `${partner.name}, Commercial High Street`,
        pickupLat: 17.6599 + (index * 0.005),
        pickupLng: 75.9064 + (index * 0.005),
      };
    });

    // If no partners are registered yet, provide default featured stores
    if (stores.length === 0) {
      const defaultStores = [
        {
          id: 'store-1',
          name: 'Artisan Bakery & Roastery',
          category: 'Bakery & Pastries',
          rating: 4.9,
          deliveryTime: '20-30 min',
          image: '🥐',
          pickupAddress: 'Artisan Bakery, High Street',
          pickupLat: 17.6599,
          pickupLng: 75.9064,
          menu: storeCatalogs[0].menu,
        },
        {
          id: 'store-2',
          name: 'Bella Italia Woodfired Oven',
          category: 'Pizza & Italian',
          rating: 4.8,
          deliveryTime: '25-40 min',
          image: '🍕',
          pickupAddress: 'Bella Italia, Market Plaza',
          pickupLat: 17.6650,
          pickupLng: 75.9120,
          menu: storeCatalogs[1].menu,
        },
        {
          id: 'store-3',
          name: 'Blue Bottle Espresso Bar',
          category: 'Café & Beverages',
          rating: 4.9,
          deliveryTime: '15-25 min',
          image: '☕',
          pickupAddress: 'Blue Bottle, Central Avenue',
          pickupLat: 17.6540,
          pickupLng: 75.9010,
          menu: storeCatalogs[2].menu,
        },
      ];
      res.status(200).json({ stores: defaultStores });
      return;
    }

    res.status(200).json({ stores });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch stores' });
  }
};