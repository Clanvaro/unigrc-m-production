import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function setValenciaAsPlatformAdmin() {
  try {
    console.log("🔧 Configurando Platform Administrator...");
    
    // Paso 1: Revocar acceso Platform Admin de TODOS los usuarios
    console.log("\n📋 Paso 1: Revocando acceso de todos los usuarios...");
    const revokeResult = await db.update(users)
      .set({ isPlatformAdmin: false })
      .where(eq(users.isPlatformAdmin, true));
    
    console.log("✅ Acceso revocado de todos los usuarios");
    
    // Paso 2: Dar acceso Platform Admin SOLO a valencia.araneda@gmail.com
    console.log("\n📋 Paso 2: Dando acceso a valencia.araneda@gmail.com...");
    const grantResult = await db.update(users)
      .set({ isPlatformAdmin: true })
      .where(eq(users.email, "valencia.araneda@gmail.com"));
    
    console.log("✅ Acceso concedido a valencia.araneda@gmail.com");
    
    // Paso 3: Verificar el resultado
    console.log("\n📋 Paso 3: Verificando...");
    const platformAdmins = await db.select({
      email: users.email,
      username: users.username,
      isPlatformAdmin: users.isPlatformAdmin
    })
    .from(users)
    .where(eq(users.isPlatformAdmin, true));
    
    console.log("\n✅ Platform Administrators actuales:");
    console.table(platformAdmins);
    
    if (platformAdmins.length === 1 && platformAdmins[0].email === "valencia.araneda@gmail.com") {
      console.log("\n🎉 ¡ÉXITO! Solo valencia.araneda@gmail.com tiene acceso Platform Admin");
    } else if (platformAdmins.length === 0) {
      console.log("\n⚠️  ADVERTENCIA: No hay Platform Admins. El usuario valencia.araneda@gmail.com no existe en la base de datos.");
    } else {
      console.log("\n⚠️  ADVERTENCIA: Hay múltiples Platform Admins o el email es incorrecto.");
    }
    
  } catch (error) {
    console.error("❌ Error configurando Platform Admin:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

setValenciaAsPlatformAdmin();
