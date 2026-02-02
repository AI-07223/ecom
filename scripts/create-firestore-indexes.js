#!/usr/bin/env node

/**
 * Firestore Index Creator Script
 */

const indexes = [
  { name: 'Products: is_active + created_at', collection: 'products', fields: 'is_active (asc) → created_at (desc)' },
  { name: 'Products: is_active + price (low)', collection: 'products', fields: 'is_active (asc) → price (asc)' },
  { name: 'Products: is_active + price (high)', collection: 'products', fields: 'is_active (asc) → price (desc)' },
  { name: 'Products: is_active + name', collection: 'products', fields: 'is_active (asc) → name (asc)' },
  { name: 'Categories: is_active + name', collection: 'categories', fields: 'is_active (asc) → name (asc)' },
];

console.log('🔥 Firestore Indexes Required:\n');
indexes.forEach((idx, i) => {
  console.log(`${i + 1}. ${idx.name}`);
  console.log(`   Collection: ${idx.collection}`);
  console.log(`   Fields: ${idx.fields}\n`);
});
console.log('Run: firebase deploy --only firestore:indexes');
