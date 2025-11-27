# Instrucciones para Arreglar el Deployment

## Problema
El deployment falla con timeout porque `node_modules` es 790MB después de `npm prune --production`. Esto sucede porque los paquetes de build están en `dependencies` en lugar de `devDependencies`.

## Solución: Editar package.json Manualmente

### Paso 1: Abrir package.json
Abre el archivo `package.json` en el editor.

### Paso 2: Mover Estos Paquetes de `dependencies` a `devDependencies`

**QUITA estas 5 líneas de la sección `dependencies` (líneas 59, 61, 79, 107, 118, 123):**

```json
"@vitejs/plugin-react": "^4.3.2",
"autoprefixer": "^10.4.20",
"esbuild": "^0.25.0",
"postcss": "^8.4.47",
"tailwindcss": "^3.4.17",
"vite": "^5.4.19",
```

**AGRÉGALAS en la sección `devDependencies` (después de la línea 174, antes del cierre de la sección):**

```json
"@vitejs/plugin-react": "^4.3.2",
"autoprefixer": "^10.4.20",
"esbuild": "^0.25.0",
"postcss": "^8.4.47",
"tailwindcss": "^3.4.17",
"vite": "^5.4.19",
```

### Paso 3: Regenerar package-lock.json

Ejecuta en la consola:

```bash
npm install
```

Esto regenerará `package-lock.json` con la nueva configuración.

### Paso 4: Verificar que el Build Funciona

```bash
npm run build
```

Deberías ver:
- ✅ Frontend built
- ✅ Backend built

### Paso 5: Verificar Reducción de Tamaño

```bash
npm prune --production
du -sh node_modules
```

**Resultado esperado:** node_modules debería reducirse de **790MB a ~550-600MB**

### Paso 6: Restaurar Dependencias de Desarrollo

```bash
npm install
```

### Paso 7: Deploy

Ahora haz el deployment desde Replit. El proceso automático hará:
1. `npm install` (todo)
2. `npm run build` (construye)
3. `npm prune --production` (elimina ~200MB de dev dependencies)
4. Sube ~600MB en lugar de 790MB

---

## ¿Por Qué Estos Paquetes?

- **vite** (13MB): Solo para build del frontend
- **esbuild** (5MB): Solo para build del backend  
- **tailwindcss** (8MB): Solo procesa CSS en build time
- **postcss** (2MB): Procesa CSS en build time
- **autoprefixer** (1MB): Agrega prefijos CSS en build time
- **@vitejs/plugin-react** (1MB): Plugin de Vite

**Total eliminado: ~30MB directos + ~180MB en dependencias transitivas = ~210MB menos**

---

## Verificación Final

Después de editar y antes de deployar:

```bash
# 1. Instalar todo
npm install

# 2. Build exitoso
npm run build

# 3. Simular deployment
npm prune --production
du -sh node_modules  # Debe mostrar ~600MB o menos

# 4. Restaurar dev dependencies
npm install
```

Si ves ~600MB o menos, el deployment debería funcionar. ✅
