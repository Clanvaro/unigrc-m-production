import { z } from "zod";

// Common error messages in Spanish
export const errorMessages = {
  required: "Este campo es obligatorio",
  invalidEmail: "Correo electrónico inválido",
  invalidPhone: "Número de teléfono inválido",
  tooShort: (min: number) => `Debe tener al menos ${min} caracteres`,
  tooLong: (max: number) => `Debe tener máximo ${max} caracteres`,
  minValue: (min: number) => `El valor mínimo es ${min}`,
  maxValue: (max: number) => `El valor máximo es ${max}`,
  invalidDate: "Fecha inválida",
  futureDateRequired: "La fecha debe ser futura",
  pastDateRequired: "La fecha debe ser pasada",
  invalidUrl: "URL inválida",
  passwordMismatch: "Las contraseñas no coinciden",
  weakPassword: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número",
  invalidFormat: "Formato inválido",
  duplicate: "Este valor ya existe",
  invalidSelection: "Selección inválida"
};

// Reusable validation schemas
export const commonValidations = {
  email: z.string().email(errorMessages.invalidEmail),
  
  phone: z.string()
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, errorMessages.invalidPhone)
    .optional()
    .or(z.literal("")),
  
  requiredString: (fieldName: string = "Este campo") =>
    z.string()
      .min(1, `${fieldName} es obligatorio`)
      .trim(),
  
  optionalString: z.string().optional().or(z.literal("")),
  
  stringWithLength: (min: number, max: number, fieldName: string = "Este campo") =>
    z.string()
      .min(min, `${fieldName} debe tener al menos ${min} caracteres`)
      .max(max, `${fieldName} debe tener máximo ${max} caracteres`)
      .trim(),
  
  positiveNumber: (fieldName: string = "Este campo") =>
    z.number({
      required_error: `${fieldName} es obligatorio`,
      invalid_type_error: `${fieldName} debe ser un número`
    })
    .positive(`${fieldName} debe ser mayor a 0`),
  
  nonNegativeNumber: (fieldName: string = "Este campo") =>
    z.number({
      required_error: `${fieldName} es obligatorio`,
      invalid_type_error: `${fieldName} debe ser un número`
    })
    .nonnegative(`${fieldName} no puede ser negativo`),
  
  percentage: (fieldName: string = "Porcentaje") =>
    z.number({
      required_error: `${fieldName} es obligatorio`,
      invalid_type_error: `${fieldName} debe ser un número`
    })
    .min(0, `${fieldName} debe ser entre 0 y 100`)
    .max(100, `${fieldName} debe ser entre 0 y 100`),
  
  futureDate: (fieldName: string = "Fecha") =>
    z.string()
      .refine(
        (date) => new Date(date) > new Date(),
        { message: `${fieldName} debe ser futura` }
      ),
  
  pastDate: (fieldName: string = "Fecha") =>
    z.string()
      .refine(
        (date) => new Date(date) < new Date(),
        { message: `${fieldName} debe ser pasada` }
      ),
  
  url: z.string().url(errorMessages.invalidUrl).optional().or(z.literal("")),
  
  password: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
  
  confirmPassword: (passwordField: string = "password") =>
    z.string(),
  
  array: (min: number = 1, fieldName: string = "Este campo") =>
    z.array(z.any())
      .min(min, `Debe seleccionar al menos ${min} ${min === 1 ? 'elemento' : 'elementos'}`),
  
  optionalArray: z.array(z.any()).optional().default([]),
};

// Validation helpers for forms
export const formValidation = {
  // Validate and parse number inputs (handles NaN, empty strings, etc.)
  parseNumber: (value: string | number | undefined, defaultValue: number = 0): number => {
    if (value === undefined || value === null || value === '') return defaultValue;
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(parsed) ? defaultValue : parsed;
  },

  // Validate and parse integer inputs
  parseInt: (value: string | number | undefined, defaultValue: number = 0): number => {
    if (value === undefined || value === null || value === '') return defaultValue;
    const parsed = typeof value === 'string' ? parseInt(value, 10) : Math.floor(value);
    return isNaN(parsed) ? defaultValue : parsed;
  },

  // Sanitize string input (trim, remove extra spaces)
  sanitizeString: (value: string | undefined): string => {
    if (!value) return '';
    return value.trim().replace(/\s+/g, ' ');
  },

  // Validate date is not in the past
  isNotPast: (date: string | Date): boolean => {
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate >= today;
  },

  // Validate date is in the past
  isPast: (date: string | Date): boolean => {
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate < today;
  },

  // Format error messages for display
  formatError: (error: z.ZodError): Record<string, string> => {
    const formatted: Record<string, string> = {};
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      formatted[path] = err.message;
    });
    return formatted;
  },

  // Check if value is empty (handles null, undefined, empty string, empty array)
  isEmpty: (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }
};

// Form field validators for common scenarios
export const fieldValidators = {
  // Risk name validator
  riskName: commonValidations.stringWithLength(3, 200, "El nombre del riesgo"),
  
  // Risk description validator
  riskDescription: commonValidations.stringWithLength(10, 1000, "La descripción"),
  
  // Control name validator
  controlName: commonValidations.stringWithLength(3, 200, "El nombre del control"),
  
  // Action plan title validator
  actionTitle: commonValidations.stringWithLength(3, 200, "El título"),
  
  // Process name validator
  processName: commonValidations.stringWithLength(2, 100, "El nombre del proceso"),
  
  // User name validator
  userName: commonValidations.stringWithLength(2, 100, "El nombre"),
  
  // Code validator (for codes like risk codes, audit codes)
  code: z.string()
    .min(2, "El código debe tener al menos 2 caracteres")
    .max(20, "El código debe tener máximo 20 caracteres")
    .regex(/^[A-Z0-9-]+$/, "El código solo puede contener letras mayúsculas, números y guiones")
    .trim(),
};
