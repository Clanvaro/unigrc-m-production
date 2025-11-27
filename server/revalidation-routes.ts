import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { 
  insertControlOwnerSchema,
  insertRevalidationSchema, 
  insertRevalidationPolicySchema,
  type ControlOwner,
  type Revalidation,
  type RevalidationPolicy
} from "@shared/schema";
import { z } from "zod";

// Centralized authentication helper
function getAuthenticatedUserId(req: any, options: { allowDevDemo?: boolean } = {}): string {
  // Check for user ID in multiple locations for compatibility
  // In development, isAuthenticated middleware sets req.user.id
  // In production with Replit Auth, it's in req.user.claims.sub
  const userId = req.user?.id || req.user?.claims?.sub;
  
  // Check if user is authenticated
  if (userId) {
    return userId;
  }
  
  // Development fallback - use demo user when not authenticated
  if (process.env.NODE_ENV === 'development' && options.allowDevDemo !== false) {
    return "user-1";
  }
  
  // Production - require authentication
  throw new Error("User not authenticated");
}

// Validation schemas for route parameters
const idParamSchema = z.object({
  id: z.string().min(1, "ID is required")
});

const controlIdParamSchema = z.object({
  controlId: z.string().min(1, "Control ID is required") 
});

const riskLevelParamSchema = z.object({
  riskLevel: z.enum(['bajo', 'medio', 'alto'], {
    errorMap: () => ({ message: "Risk level must be: bajo, medio, or alto" })
  })
});

// Request body schemas
const recalculateRequestSchema = z.object({
  controlId: z.string().min(1, "Control ID is required").optional(),
  riskLevel: z.enum(['bajo', 'medio', 'alto']).optional(),
  force: z.boolean().default(false)
}).refine(
  (data) => data.controlId || data.riskLevel,
  { message: "Either controlId or riskLevel must be provided" }
);

export default function setupRevalidationRoutes(app: Express) {
  
  // ============== CONTROL OWNERS ==============
  
  // Get all control owners
  app.get("/api/control-owners", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const controlOwners = await storage.getControlOwners();
      res.json(controlOwners);
    } catch (error) {
      console.error("Error fetching control owners:", error);
      res.status(500).json({ error: "Failed to fetch control owners" });
    }
  });

  // Get control owner by ID
  app.get("/api/control-owners/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const controlOwner = await storage.getControlOwner(id);
      
      if (!controlOwner) {
        return res.status(404).json({ error: "Control owner not found" });
      }
      
      res.json(controlOwner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid parameters", details: error.errors });
      }
      console.error("Error fetching control owner:", error);
      res.status(500).json({ error: "Failed to fetch control owner" });
    }
  });

  // Get control owners by control ID
  app.get("/api/control-owners/control/:controlId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { controlId } = controlIdParamSchema.parse(req.params);
      const controlOwners = await storage.getControlOwnersByControl(controlId);
      res.json(controlOwners);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid parameters", details: error.errors });
      }
      console.error("Error fetching control owners:", error);
      res.status(500).json({ error: "Failed to fetch control owners" });
    }
  });

  // Create control owner
  app.post("/api/control-owners", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const assignedBy = getAuthenticatedUserId(req);
      const ownerData = insertControlOwnerSchema.parse({
        ...req.body,
        assignedBy: assignedBy  // Override client value with server-side authenticated user
      });
      const controlOwner = await storage.createControlOwner(ownerData);
      res.status(201).json(controlOwner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating control owner:", error);
      res.status(500).json({ error: "Failed to create control owner" });
    }
  });

  // Update control owner
  app.put("/api/control-owners/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const updateData = insertControlOwnerSchema.partial().parse(req.body);
      
      const controlOwner = await storage.updateControlOwner(id, updateData);
      
      if (!controlOwner) {
        return res.status(404).json({ error: "Control owner not found" });
      }
      
      res.json(controlOwner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating control owner:", error);
      res.status(500).json({ error: "Failed to update control owner" });
    }
  });

  // Delete control owner
  app.delete("/api/control-owners/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const success = await storage.deleteControlOwner(id);
      
      if (!success) {
        return res.status(404).json({ error: "Control owner not found" });
      }
      
      res.json({ message: "Control owner deleted successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid parameters", details: error.errors });
      }
      console.error("Error deleting control owner:", error);
      res.status(500).json({ error: "Failed to delete control owner" });
    }
  });

  // ============== REVALIDATIONS ==============
  
  // Get all revalidations
  app.get("/api/revalidations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const revalidations = await storage.getRevalidations();
      res.json(revalidations);
    } catch (error) {
      console.error("Error fetching revalidations:", error);
      res.status(500).json({ error: "Failed to fetch revalidations" });
    }
  });

  // Get revalidation by ID
  app.get("/api/revalidations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const revalidation = await storage.getRevalidation(id);
      
      if (!revalidation) {
        return res.status(404).json({ error: "Revalidation not found" });
      }
      
      res.json(revalidation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid parameters", details: error.errors });
      }
      console.error("Error fetching revalidation:", error);
      res.status(500).json({ error: "Failed to fetch revalidation" });
    }
  });

  // Get revalidations by control ID
  app.get("/api/revalidations/control/:controlId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { controlId } = controlIdParamSchema.parse(req.params);
      const revalidations = await storage.getRevalidationsByControl(controlId);
      res.json(revalidations);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid parameters", details: error.errors });
      }
      console.error("Error fetching revalidations:", error);
      res.status(500).json({ error: "Failed to fetch revalidations" });
    }
  });

  // Get latest revalidation by control ID
  app.get("/api/revalidations/latest/control/:controlId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { controlId } = controlIdParamSchema.parse(req.params);
      const revalidation = await storage.getLatestRevalidationByControl(controlId);
      
      if (!revalidation) {
        return res.status(404).json({ error: "No revalidations found for this control" });
      }
      
      res.json(revalidation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid parameters", details: error.errors });
      }
      console.error("Error fetching latest revalidation:", error);
      res.status(500).json({ error: "Failed to fetch latest revalidation" });
    }
  });

  // Create revalidation
  app.post("/api/revalidations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const revalidationData = insertRevalidationSchema.parse(req.body);
      const revalidation = await storage.createRevalidation(revalidationData);
      res.status(201).json(revalidation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating revalidation:", error);
      res.status(500).json({ error: "Failed to create revalidation" });
    }
  });

  // Update revalidation
  app.put("/api/revalidations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const updateData = insertRevalidationSchema.partial().parse(req.body);
      
      const revalidation = await storage.updateRevalidation(id, updateData);
      
      if (!revalidation) {
        return res.status(404).json({ error: "Revalidation not found" });
      }
      
      res.json(revalidation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating revalidation:", error);
      res.status(500).json({ error: "Failed to update revalidation" });
    }
  });

  // ============== REVALIDATION POLICIES ==============
  
  // Get all revalidation policies
  app.get("/api/revalidation-policies", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const policies = await storage.getRevalidationPolicies();
      res.json(policies);
    } catch (error) {
      console.error("Error fetching revalidation policies:", error);
      res.status(500).json({ error: "Failed to fetch revalidation policies" });
    }
  });

  // Get revalidation policy by ID
  app.get("/api/revalidation-policies/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const policy = await storage.getRevalidationPolicy(id);
      
      if (!policy) {
        return res.status(404).json({ error: "Revalidation policy not found" });
      }
      
      res.json(policy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid parameters", details: error.errors });
      }
      console.error("Error fetching revalidation policy:", error);
      res.status(500).json({ error: "Failed to fetch revalidation policy" });
    }
  });

  // Get revalidation policy by risk level
  app.get("/api/revalidation-policies/risk-level/:riskLevel", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { riskLevel } = riskLevelParamSchema.parse(req.params);
      const policy = await storage.getRevalidationPolicyByRiskLevel(riskLevel);
      
      if (!policy) {
        return res.status(404).json({ error: `No policy found for risk level: ${riskLevel}` });
      }
      
      res.json(policy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid parameters", details: error.errors });
      }
      console.error("Error fetching revalidation policy:", error);
      res.status(500).json({ error: "Failed to fetch revalidation policy" });
    }
  });

  // Create revalidation policy
  app.post("/api/revalidation-policies", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const policyData = insertRevalidationPolicySchema.parse(req.body);
      const policy = await storage.createRevalidationPolicy(policyData);
      res.status(201).json(policy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating revalidation policy:", error);
      res.status(500).json({ error: "Failed to create revalidation policy" });
    }
  });

  // Update revalidation policy
  app.put("/api/revalidation-policies/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const updateData = insertRevalidationPolicySchema.partial().parse(req.body);
      
      const policy = await storage.updateRevalidationPolicy(id, updateData);
      
      if (!policy) {
        return res.status(404).json({ error: "Revalidation policy not found" });
      }
      
      res.json(policy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating revalidation policy:", error);
      res.status(500).json({ error: "Failed to update revalidation policy" });
    }
  });

  // Delete revalidation policy
  app.delete("/api/revalidation-policies/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const success = await storage.deleteRevalidationPolicy(id);
      
      if (!success) {
        return res.status(404).json({ error: "Revalidation policy not found" });
      }
      
      res.json({ message: "Revalidation policy deleted successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid parameters", details: error.errors });
      }
      console.error("Error deleting revalidation policy:", error);
      res.status(500).json({ error: "Failed to delete revalidation policy" });
    }
  });

  // ============== RECALCULATION UTILITIES ==============
  
  // Trigger recalculation for specific control or all controls by risk level
  app.post("/api/revalidations/recalculate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const requestData = recalculateRequestSchema.parse(req.body);
      
      if (requestData.controlId) {
        // Recalculate specific control
        await storage.updateControlRevalidationDates(requestData.controlId);
        res.json({ 
          message: `Revalidation dates recalculated for control ${requestData.controlId}`,
          controlsUpdated: 1
        });
      } else if (requestData.riskLevel) {
        // Recalculate all controls by risk level
        await storage.recalculateControlsByRiskLevel(requestData.riskLevel);
        res.json({ 
          message: `Revalidation dates recalculated for all controls with risk level: ${requestData.riskLevel}`,
          riskLevel: requestData.riskLevel
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error recalculating revalidation dates:", error);
      res.status(500).json({ error: "Failed to recalculate revalidation dates" });
    }
  });

  // Get revalidation status summary for dashboard
  app.get("/api/revalidations/status-summary", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get all controls with their revalidation status
      const controls = await storage.getControls();
      
      const summary = {
        total: controls.length,
        vigente: controls.filter(c => c.revalidationStatus === 'vigente').length,
        proximo_vencimiento: controls.filter(c => c.revalidationStatus === 'proximo_vencimiento').length,
        vencido: controls.filter(c => c.revalidationStatus === 'vencido').length,
        sin_programa: controls.filter(c => !c.revalidationStatus || c.revalidationStatus === 'sin_programa').length
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Error fetching revalidation status summary:", error);
      res.status(500).json({ error: "Failed to fetch revalidation status summary" });
    }
  });

  // Get controls that need revalidation (vencido or proximo_vencimiento)
  app.get("/api/revalidations/due-controls", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const controls = await storage.getControls();
      const dueControls = controls.filter(c => 
        c.revalidationStatus === 'vencido' || c.revalidationStatus === 'proximo_vencimiento'
      );
      
      res.json(dueControls);
    } catch (error) {
      console.error("Error fetching due controls:", error);
      res.status(500).json({ error: "Failed to fetch due controls" });
    }
  });
}