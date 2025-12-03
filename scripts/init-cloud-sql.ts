#!/usr/bin/env tsx
/**
 * Script de inicialización para Cloud SQL
 * 
 * Este script:
 * 1. Crea el esquema de la base de datos usando drizzle-kit push
 * 2. Crea el usuario administrador inicial
 * 
 * Uso:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/init-cloud-sql.ts
 */

import { execSync } from 'child_process';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function initDatabase() {
  console.log('🚀 Inicializando base de datos en Cloud SQL...\n');

  // Verificar que DATABASE_URL esté configurado
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL no está configurado');
    console.error('   Ejecuta: export DATABASE_URL="postgresql://..."');
    process.exit(1);
  }

  try {
    // Paso 1: Crear el esquema
    console.log('📊 Paso 1: Creando esquema de la base de datos...');
    try {
      execSync('npm run db:push', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('✅ Esquema creado exitosamente\n');
    } catch (error: any) {
      if (error.status === 0) {
        // Exit code 0 significa éxito
        console.log('✅ Esquema creado exitosamente\n');
      } else {
        console.error('❌ Error al crear el esquema:', error.message);
        throw error;
      }
    }

    // Paso 2: Verificar si ya existe un usuario admin
    console.log('👤 Paso 2: Verificando usuario administrador...');
    const existingAdmin = await db.select()
      .from(users)
      .where(or(eq(users.username, 'admin'), eq(users.email, 'admin@unigrc.local')))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('ℹ️  Usuario admin ya existe, saltando creación...');
      console.log(`   Username: ${existingAdmin[0].username}`);
      console.log(`   Email: ${existingAdmin[0].email}`);
      console.log('\n✅ Inicialización completada\n');
      process.exit(0);
    }

    // Paso 3: Crear usuario admin
    console.log('🔐 Paso 3: Creando usuario administrador...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    const [adminUser] = await db.insert(users).values({
      username: 'admin',
      email: 'admin@unigrc.local',
      passwordHash,
      fullName: 'Administrador del Sistema',
      isActive: true,
      isPlatformAdmin: true
    }).returning();
    
    console.log('\n✅ Usuario administrador creado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Credenciales de acceso:');
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: admin123`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  IMPORTANTE: Cambia esta contraseña inmediatamente después del primer login!');
    console.log('\n✅ Inicialización completada exitosamente\n');
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error durante la inicialización:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

initDatabase();

