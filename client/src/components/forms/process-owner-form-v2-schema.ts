import { z } from "zod";

// Custom form schema that includes companyId
export const processOwnerFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Debe ser un email válido"),
  position: z.string().optional(),
  company: z.string().min(1, "La empresa es requerida"), // Main field for now
  isActive: z.boolean().default(true),
});

// Form values type
export type ProcessOwnerFormValues = z.infer<typeof processOwnerFormSchema>;
