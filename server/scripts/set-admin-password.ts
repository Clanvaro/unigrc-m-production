#!/usr/bin/env tsx
/**
 * Script para establecer la contraseña del usuario Platform Admin
 * Uso: npm run set-password -- <email> <password>
 */

import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { db } from '../db';

async function setAdminPassword() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('❌ Uso: npm run set-password -- <email> <password>');
    console.error('Ejemplo: npm run set-password -- valencia.araneda@gmail.com MiContraseñaSegura123');
    process.exit(1);
  }

  const [email, password] = args;
  
  if (password.length < 8) {
    console.error('❌ La contraseña debe tener al menos 8 caracteres');
    process.exit(1);
  }

  try {
    console.log(`🔍 Buscando usuario con email: ${email}...`);
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      console.error(`❌ Usuario no encontrado: ${email}`);
      process.exit(1);
    }
    
    console.log(`✅ Usuario encontrado: ${user.username || user.fullName}`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Platform Admin: ${user.isPlatformAdmin ? 'Sí' : 'No'}`);
    
    // Hash the password
    console.log('🔐 Hasheando contraseña...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update user password
    console.log('💾 Actualizando contraseña en la base de datos...');
    await storage.updateUserPassword(user.id, hashedPassword);
    
    console.log('✅ ¡Contraseña actualizada exitosamente!');
    console.log('');
    console.log('🚀 Ahora puedes iniciar sesión con:');
    console.log(`   Email: ${email}`);
    console.log(`   Contraseña: ${password}`);
    console.log('');
    console.log('📝 Guarda esta contraseña en un lugar seguro.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al establecer la contraseña:', error);
    process.exit(1);
  }
}

// Run the script
setAdminPassword().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});