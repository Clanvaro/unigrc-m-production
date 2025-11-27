import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function setPlatformAdmin() {
  try {
    console.log("🔧 Setting up platform administrator...");
    
    // Get the first user (usually user-1 in development)
    const allUsers = await db.select().from(users).limit(1);
    
    if (allUsers.length === 0) {
      console.log("⚠️  No users found in database. Skipping platform admin setup.");
      return;
    }
    
    const firstUser = allUsers[0];
    console.log(`👤 Found user: ${firstUser.email} (ID: ${firstUser.id})`);
    
    // Update the user to be a platform admin
    await db.update(users)
      .set({ isPlatformAdmin: true })
      .where(eq(users.id, firstUser.id));
    
    console.log(`✅ User ${firstUser.email} is now a platform administrator!`);
    console.log("\n📋 Platform admin privileges:");
    console.log("   - Access to /platform/organizations page");
    console.log("   - Manage all organizations globally");
    console.log("   - View and edit all tenants without being a member");
    
  } catch (error) {
    console.error("❌ Error setting platform admin:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

setPlatformAdmin();
