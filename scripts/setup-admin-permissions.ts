#!/usr/bin/env tsx
/**
 * Script para configurar permisos completos del usuario admin
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function setupAdminPermissions() {
  try {
    console.log('🔧 Configurando permisos del usuario admin...');
    
    // Actualizar usuario admin para tener isAdmin: true
    const result = await db.update(users)
      .set({ 
        isAdmin: true,
        isPlatformAdmin: true,
        isActive: true
      })
      .where(eq(users.email, 'admin@unigrc.local'))
      .returning();
    
    if (result.length > 0) {
      console.log('✅ Usuario admin configurado correctamente:');
      console.log(`   Email: ${result[0].email}`);
      console.log(`   isAdmin: ${result[0].isAdmin}`);
      console.log(`   isPlatformAdmin: ${result[0].isPlatformAdmin}`);
      console.log(`   isActive: ${result[0].isActive}`);
    } else {
      console.log('❌ Usuario admin no encontrado');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupAdminPermissions();

