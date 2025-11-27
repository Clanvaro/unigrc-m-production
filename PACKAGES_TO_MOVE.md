# Paquetes a Mover de dependencies → devDependencies

## ✂️ COPIA estos paquetes y PÉGALOS en devDependencies

### 🧪 Testing & E2E (~ 70MB)
```json
"@playwright/test": "1.56.1",
"@vitest/ui": "^3.2.4",
"vitest": "^3.2.4",
"happy-dom": "^20.0.0",
"supertest": "^7.1.4",
```

### 📝 Type Definitions - @types/* (~ 50MB)
```json
"@types/bcrypt": "^6.0.0",
"@types/compression": "^1.8.1",
"@types/cookie-parser": "^1.4.9",
"@types/cors": "^2.8.19",
"@types/express-rate-limit": "^5.1.3",
"@types/jsdom": "^27.0.0",
"@types/memoizee": "^0.4.12",
"@types/multer": "^2.0.0",
"@types/nodemailer": "^7.0.3",
"@types/pg": "^8.15.5",
"@types/supertest": "^6.0.3",
"@types/validator": "^13.15.3",
"@types/web-push": "^3.6.4",
```

### 🔍 Linting Tools (~ 15MB)
```json
"@typescript-eslint/eslint-plugin": "8.46.3",
"@typescript-eslint/parser": "8.46.3",
"eslint": "9.39.1",
"eslint-plugin-react": "7.37.5",
"eslint-plugin-react-hooks": "7.0.1",
```

### 🎨 Build & CSS Tools (~ 10MB)
```json
"@tailwindcss/container-queries": "^0.1.1",
```

### 🛠️ Development Utilities (~ 15MB)
```json
"@jridgewell/trace-mapping": "^0.3.25",
"autocannon": "^8.0.0",
"husky": "9.1.7",
"lint-staged": "16.2.6",
```

---

## 📋 Paso a Paso

### 1. Abre `package.json`

### 2. BORRA estas líneas de `dependencies` (líneas 26, 27, 55, 58-72, 77, 79, 97-99, 107, 110, 115, 140, 147):

```json
"@jridgewell/trace-mapping": "^0.3.25",
"@playwright/test": "1.56.1",
"@tailwindcss/container-queries": "^0.1.1",
"@types/bcrypt": "^6.0.0",
"@types/compression": "^1.8.1",
"@types/cookie-parser": "^1.4.9",
"@types/cors": "^2.8.19",
"@types/express-rate-limit": "^5.1.3",
"@types/jsdom": "^27.0.0",
"@types/memoizee": "^0.4.12",
"@types/multer": "^2.0.0",
"@types/nodemailer": "^7.0.3",
"@types/pg": "^8.15.5",
"@types/supertest": "^6.0.3",
"@types/validator": "^13.15.3",
"@types/web-push": "^3.6.4",
"@typescript-eslint/eslint-plugin": "8.46.3",
"@typescript-eslint/parser": "8.46.3",
"@vitest/ui": "^3.2.4",
"autocannon": "^8.0.0",
"eslint": "9.39.1",
"eslint-plugin-react": "7.37.5",
"eslint-plugin-react-hooks": "7.0.1",
"happy-dom": "^20.0.0",
"husky": "9.1.7",
"lint-staged": "16.2.6",
"supertest": "^7.1.4",
"vitest": "^3.2.4",
```

### 3. PEGA estas líneas en `devDependencies` (después de línea 154)

Agrega los paquetes arriba listados en la sección `devDependencies`, manteniendo el orden alfabético.

### 4. Resultado Final

Tu `devDependencies` debe quedar así:

```json
"devDependencies": {
  "@jridgewell/trace-mapping": "^0.3.25",
  "@playwright/test": "1.56.1",
  "@replit/vite-plugin-cartographer": "^0.4.1",
  "@replit/vite-plugin-runtime-error-modal": "^0.0.3",
  "@tailwindcss/container-queries": "^0.1.1",
  "@tailwindcss/typography": "^0.5.15",
  "@tailwindcss/vite": "^4.1.3",
  "@types/bcrypt": "^6.0.0",
  "@types/compression": "^1.8.1",
  "@types/connect-pg-simple": "^7.0.3",
  "@types/cookie-parser": "^1.4.9",
  "@types/cors": "^2.8.19",
  "@types/express": "4.17.21",
  "@types/express-rate-limit": "^5.1.3",
  "@types/express-session": "^1.18.0",
  "@types/jsdom": "^27.0.0",
  "@types/memoizee": "^0.4.12",
  "@types/multer": "^2.0.0",
  "@types/node": "20.16.11",
  "@types/nodemailer": "^7.0.3",
  "@types/passport": "^1.0.16",
  "@types/passport-local": "^1.0.38",
  "@types/pg": "^8.15.5",
  "@types/react": "^18.3.11",
  "@types/react-dom": "^18.3.1",
  "@types/supertest": "^6.0.3",
  "@types/validator": "^13.15.3",
  "@types/web-push": "^3.6.4",
  "@types/ws": "^8.5.13",
  "@typescript-eslint/eslint-plugin": "8.46.3",
  "@typescript-eslint/parser": "8.46.3",
  "@vitejs/plugin-react": "^4.3.2",
  "@vitest/ui": "^3.2.4",
  "autocannon": "^8.0.0",
  "autoprefixer": "^10.4.20",
  "drizzle-kit": "^0.30.4",
  "esbuild": "^0.25.0",
  "eslint": "9.39.1",
  "eslint-plugin-react": "7.37.5",
  "eslint-plugin-react-hooks": "7.0.1",
  "happy-dom": "^20.0.0",
  "husky": "9.1.7",
  "lint-staged": "16.2.6",
  "postcss": "^8.4.47",
  "supertest": "^7.1.4",
  "tailwindcss": "^3.4.17",
  "typescript": "5.6.3",
  "vite": "^5.4.19",
  "vitest": "^3.2.4"
}
```

---

## ✅ Verificación

### Después de editar:

1. **Reinstala dependencias:**
   ```bash
   npm install
   ```

2. **Verifica que funciona:**
   ```bash
   npm run dev      # Debe iniciar el servidor
   npm run build    # Debe construir sin errores
   npm run lint     # Debe ejecutar ESLint
   npm test         # Debe ejecutar tests
   ```

3. **Verifica el tamaño:**
   ```bash
   # Instalar solo producción
   rm -rf node_modules
   npm install --production
   du -sh node_modules
   
   # Debería mostrar ~600MB (vs 886MB actual)
   ```

4. **Restaura todo:**
   ```bash
   npm install
   ```

---

## 📊 Reducción Esperada

**Antes:** node_modules = 886MB  
**Después:** node_modules (producción) = ~600MB  
**Ahorro:** ~280MB (31%)

Esto debería permitir que el deployment pase el límite de Replit Autoscale.
