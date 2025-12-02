
import { db } from "../server/db";
import { processes } from "../shared/schema";
import { eq } from "drizzle-orm";

async function reproduce() {
    try {
        // 1. Create a process
        const processName = "Test Process Duplicate " + Date.now();
        console.log(`Creating process: ${processName}`);

        const [p1] = await db.insert(processes).values({
            code: "PROC-TEST-1-" + Date.now(),
            name: processName,
            description: "Test description",
            status: "active",
            createdBy: "user-1"
        }).returning();
        console.log("Created first process:", p1.id);

        // 2. Try to create another process with the same name
        console.log(`Creating duplicate process: ${processName}`);
        await db.insert(processes).values({
            code: "PROC-TEST-2-" + Date.now(),
            name: processName, // Same name
            description: "Test description duplicate",
            status: "active",
            createdBy: "user-1"
        }).returning();

    } catch (error: any) {
        console.log("Caught error:");
        console.log("Name:", error.name);
        console.log("Code:", error.code);
        console.log("Message:", error.message);
        console.log("Detail:", error.detail);
        console.log("Constraint:", error.constraint);
    } finally {
        process.exit(0);
    }
}

reproduce();
