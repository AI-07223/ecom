// Firebase Seed Data Script
// Run this in your browser console after signing in as admin to seed initial data

// Import these in your component or run from a server-side script
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../src/lib/firebase/config';

async function seedDatabase() {
    console.log('Starting database seed...');

    // Seed Categories
    const categories = [
        { id: 'electronics', name: 'Electronics', slug: 'electronics', description: 'Latest gadgets and electronics', is_active: true, sort_order: 1 },
        { id: 'clothing', name: 'Clothing', slug: 'clothing', description: 'Fashion and apparel', is_active: true, sort_order: 2 },
        { id: 'home-garden', name: 'Home & Garden', slug: 'home-garden', description: 'Everything for your home', is_active: true, sort_order: 3 },
        { id: 'sports', name: 'Sports', slug: 'sports', description: 'Sports equipment and accessories', is_active: true, sort_order: 4 },
    ];

    for (const category of categories) {
        await setDoc(doc(db, 'categories', category.id), {
            ...category,
            created_at: new Date(),
            updated_at: new Date(),
        });
        console.log(`Created category: ${category.name}`);
    }

    // Seed Products
    const products = [
        {
            id: 'premium-wireless-headphones',
            name: 'Premium Wireless Headphones',
            slug: 'premium-wireless-headphones',
            description: 'Experience crystal-clear audio with our premium wireless headphones. Features active noise cancellation, 30-hour battery life, and premium comfort.',
            short_description: 'Crystal-clear audio with ANC',
            price: 2999,
            compare_at_price: 3999,
            quantity: 50,
            category_id: 'electronics',
            is_active: true,
            is_featured: true,
            images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'],
            thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
            tags: ['audio', 'wireless', 'premium'],
            track_inventory: true,
            allow_backorder: false,
        },
        {
            id: 'smart-watch-pro',
            name: 'Smart Watch Pro',
            slug: 'smart-watch-pro',
            description: 'Track your fitness and stay connected with our Smart Watch Pro. Features heart rate monitoring, GPS, and 7-day battery life.',
            short_description: 'Advanced fitness tracking',
            price: 4999,
            compare_at_price: 5999,
            quantity: 30,
            category_id: 'electronics',
            is_active: true,
            is_featured: true,
            images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'],
            thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
            tags: ['smartwatch', 'fitness', 'wearable'],
            track_inventory: true,
            allow_backorder: false,
        },
        {
            id: 'classic-cotton-tshirt',
            name: 'Classic Cotton T-Shirt',
            slug: 'classic-cotton-tshirt',
            description: '100% organic cotton t-shirt with a classic fit. Available in multiple colors.',
            short_description: 'Comfortable everyday wear',
            price: 599,
            compare_at_price: 799,
            quantity: 100,
            category_id: 'clothing',
            is_active: true,
            is_featured: false,
            images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500'],
            thumbnail: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300',
            tags: ['cotton', 'casual', 'everyday'],
            track_inventory: true,
            allow_backorder: false,
        },
        {
            id: 'designer-backpack',
            name: 'Designer Backpack',
            slug: 'designer-backpack',
            description: 'Stylish and functional backpack with laptop compartment. Perfect for work or travel.',
            short_description: 'Style meets functionality',
            price: 1499,
            compare_at_price: 1999,
            quantity: 45,
            category_id: 'clothing',
            is_active: true,
            is_featured: true,
            images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500'],
            thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300',
            tags: ['backpack', 'travel', 'laptop'],
            track_inventory: true,
            allow_backorder: false,
        },
        {
            id: 'yoga-mat-premium',
            name: 'Yoga Mat Premium',
            slug: 'yoga-mat-premium',
            description: 'Non-slip premium yoga mat with extra cushioning. Perfect for yoga and meditation.',
            short_description: 'Non-slip premium quality',
            price: 899,
            compare_at_price: 1199,
            quantity: 60,
            category_id: 'sports',
            is_active: true,
            is_featured: false,
            images: ['https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500'],
            thumbnail: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=300',
            tags: ['yoga', 'fitness', 'wellness'],
            track_inventory: true,
            allow_backorder: false,
        },
        {
            id: 'indoor-plant-set',
            name: 'Indoor Plant Set',
            slug: 'indoor-plant-set',
            description: 'Beautiful set of 3 indoor plants to brighten up your home. Includes decorative pots.',
            short_description: 'Brighten your home',
            price: 1299,
            compare_at_price: 1599,
            quantity: 25,
            category_id: 'home-garden',
            is_active: true,
            is_featured: false,
            images: ['https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=500'],
            thumbnail: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=300',
            tags: ['plants', 'decor', 'indoor'],
            track_inventory: true,
            allow_backorder: false,
        },
    ];

    for (const product of products) {
        await setDoc(doc(db, 'products', product.id), {
            ...product,
            created_at: new Date(),
            updated_at: new Date(),
        });
        console.log(`Created product: ${product.name}`);
    }

    // Seed Site Settings
    const siteSettings = [
        { id: 'site_name', value: 'Royal Store' },
        { id: 'site_description', value: 'Your one-stop shop for premium products' },
        { id: 'logo_url', value: '/logo.svg' },
        { id: 'favicon_url', value: '/favicon.ico' },
        { id: 'primary_color', value: '#7c3aed' },
        { id: 'secondary_color', value: '#a78bfa' },
        { id: 'accent_color', value: '#f59e0b' },
        { id: 'footer_text', value: '© 2024 Royal Store. All rights reserved.' },
        { id: 'social_links', value: { facebook: '', instagram: '', twitter: '' } },
        { id: 'contact_email', value: 'support@royalstore.com' },
        { id: 'contact_phone', value: '+91 1234567890' },
        { id: 'currency', value: 'INR' },
        { id: 'currency_symbol', value: '₹' },
    ];

    for (const setting of siteSettings) {
        await setDoc(doc(db, 'site_settings', setting.id), {
            value: setting.value,
            created_at: new Date(),
            updated_at: new Date(),
        });
        console.log(`Created setting: ${setting.id}`);
    }

    console.log('Database seeding complete!');
}

// Export for use
export { seedDatabase };
