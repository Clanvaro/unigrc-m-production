
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import bcrypt from 'bcrypt';

async function createAdmin() {
  try {
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    const [user] = await db.insert(users).values({
      username: 'admin',
      email: 'admin@unigrc.local',
      passwordHash,
      fullName: 'Administrador',
      isActive: true,
      isPlatformAdmin: true
    }).returning();
    
    console.log('✅ Usuario admin creado exitosamente!');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('⚠️  CAMBIA ESTA CONTRASEÑA INMEDIATAMENTE!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin();
