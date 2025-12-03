#!/usr/bin/env tsx
/**
 * Script para actualizar el password del usuario admin
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function updateAdminPassword() {
  try {
    console.log('🔐 Actualizando password del usuario admin...');
    
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    const result = await db.update(users)
      .set({ password: passwordHash })
      .where(eq(users.email, 'admin@unigrc.local'))
      .returning();
    
    if (result.length > 0) {
      console.log('✅ Password actualizado exitosamente para usuario admin');
      console.log('   Email: admin@unigrc.local');
      console.log('   Password: admin123');
    } else {
      console.log('❌ Usuario admin no encontrado');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateAdminPassword();

