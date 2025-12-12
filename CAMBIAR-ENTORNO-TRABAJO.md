# 🔄 Guía: Cambiar Entorno de Trabajo

## 📍 Nueva Ubicación
```
/Users/claudiovalencia/Git Hub/unigrc-m-production
```

---

## 🎯 Método 1: Cambiar Workspace en Cursor (RECOMENDADO)

### Paso 1: Cerrar el workspace actual
1. En Cursor, ve a: **File → Close Folder** (o `Cmd + K, Cmd + F`)

### Paso 2: Abrir la nueva carpeta
1. Ve a: **File → Open Folder...** (o `Cmd + O`)
2. Pega esta ruta:
   ```
   /Users/claudiovalencia/Git Hub/unigrc-m-production
   ```
3. Haz clic en **Open**

### Paso 3: Verificar
- La barra lateral debería mostrar los archivos del proyecto
- La terminal debería abrirse en la nueva ubicación
- Verifica que estás en la carpeta correcta ejecutando: `pwd`

---

## 🖥️ Método 2: Cambiar Terminal Manualmente

Si ya tienes Cursor abierto, simplemente cambia el directorio en la terminal:

```bash
cd "/Users/claudiovalencia/Git Hub/unigrc-m-production"
pwd  # Verifica que estás en la ubicación correcta
```

---

## ✅ Verificación Final

Ejecuta estos comandos para verificar que todo está correcto:

```bash
# 1. Verificar ubicación
pwd
# Debe mostrar: /Users/claudiovalencia/Git Hub/unigrc-m-production

# 2. Verificar archivos .env
ls -la .env*
# Debe mostrar: .env y .env.local

# 3. Verificar Git
git status
# Debe mostrar el estado del repositorio sin errores

# 4. Verificar que puedes leer los archivos
cat .env
# Debe mostrar tu configuración (no errores de timeout)
```

---

## 🔧 Configuraciones Adicionales (Opcional)

### Si usas extensiones de Git:
- No necesitas cambiar nada, Git detectará automáticamente el nuevo repositorio

### Si tienes scripts personalizados:
- Actualiza cualquier ruta absoluta que apunte a la carpeta antigua de OneDrive

### Si usas un servidor de desarrollo:
- Reinicia el servidor después del cambio para asegurar que use la nueva ubicación

---

## 📝 Nota Importante

**La carpeta antigua en OneDrive:**
```
/Users/claudiovalencia/Library/CloudStorage/OneDrive-Personal/1.5 Sistema De Gestión de Riesgos/unigrc-m-production
```

Puedes:
- **Dejarla ahí** (no causará problemas si no la abres)
- **Eliminarla** (cuando estés seguro de que todo funciona en la nueva ubicación)
- **Renombrarla** (ej: `unigrc-m-production-backup`) para tener un respaldo

---

## 🆘 Si algo no funciona

1. **Cierra completamente Cursor** y vuelve a abrirlo
2. **Abre la nueva carpeta** desde File → Open Folder
3. **Verifica los archivos .env** están en la nueva ubicación
4. **Reinicia el servidor de desarrollo** si lo estás usando
