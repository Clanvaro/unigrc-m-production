# 📦 Guía Rápida de Descarga - RiskMatrix Pro

## ¿Qué encontrarás?

Dos repositorios completamente independientes y listos para producción:

### 🔧 riskmatrix-backend
```
✅ Express.js + TypeScript
✅ Dockerfile optimizado para producción
✅ CORS configurado para standalone
✅ GitHub Actions CI/CD para AWS ECS
✅ Task Definition de ECS
✅ Docker Compose para desarrollo local
✅ README completo con instrucciones
✅ package.json con todas las dependencias
```

### 🎨 riskmatrix-frontend
```
✅ React 18 + Vite + TypeScript
✅ Dockerfile multi-stage con nginx
✅ API URL configurable via VITE_API_URL
✅ GitHub Actions CI/CD para AWS ECS
✅ Task Definition de ECS
✅ nginx.conf optimizado
✅ README completo con instrucciones
✅ package.json con todas las dependencias
```

## 📥 Cómo Descargar

### Desde Replit:

1. **Backend:**
   - En el panel de archivos, haz clic derecho en `riskmatrix-backend/`
   - Selecciona **"Download as ZIP"**
   - Guarda como `riskmatrix-backend.zip`

2. **Frontend:**
   - Haz clic derecho en `riskmatrix-frontend/`
   - Selecciona **"Download as ZIP"**
   - Guarda como `riskmatrix-frontend.zip`

## 🚀 Setup Rápido (5 minutos)

### Backend:

```bash
# 1. Extraer
unzip riskmatrix-backend.zip
cd riskmatrix-backend

# 2. Instalar
npm install

# 3. Configurar
cp .env.example .env
# Edita .env con tus valores

# 4. Ejecutar localmente
npm run dev
# 🎉 Backend corriendo en http://localhost:3000
```

### Frontend:

```bash
# 1. Extraer
unzip riskmatrix-frontend.zip
cd riskmatrix-frontend

# 2. Instalar
npm install

# 3. Configurar
cp .env.example .env
# Agrega: VITE_API_URL=http://localhost:3000

# 4. Ejecutar localmente
npm run dev
# 🎉 Frontend corriendo en http://localhost:5173
```

## 🐳 Testing con Docker

### Backend:
```bash
cd riskmatrix-backend
docker-compose up
```

### Frontend:
```bash
cd riskmatrix-frontend
docker-compose up
```

## 📝 Subir a GitHub

### Backend:
```bash
cd riskmatrix-backend
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/riskmatrix-backend.git
git push -u origin main
```

### Frontend:
```bash
cd riskmatrix-frontend
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/riskmatrix-frontend.git
git push -u origin main
```

## ☁️ Deploy a AWS ECS

### Configuración de Secrets en GitHub:

**Backend** (Settings > Secrets > Actions):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

**Frontend** (Settings > Secrets > Actions):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `VITE_API_URL` (ej: https://api.tudominio.com)

### Deploy automático:
```bash
git push origin main
```

GitHub Actions se encargará del resto! 🚀

## 📚 Documentación Completa

- **DEPLOYMENT-INSTRUCTIONS.md** - Guía completa de deployment AWS
- **riskmatrix-backend/README.md** - Documentación del backend
- **riskmatrix-frontend/README.md** - Documentación del frontend
- **riskmatrix-backend/ARCHITECTURE.md** - Arquitectura técnica

## 🔑 Variables de Entorno Importantes

### Backend (.env):
```env
DATABASE_URL=postgresql://...
SESSION_SECRET=tu-secreto-aqui
mailgun_API_KEY=SG.xxx
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env):
```env
VITE_API_URL=http://localhost:3000
```

## ✅ Checklist Pre-Deployment

- [ ] Descargar ambos ZIPs
- [ ] Extraer y configurar .env
- [ ] Probar localmente (npm run dev)
- [ ] Crear repositorios en GitHub
- [ ] Push inicial a GitHub
- [ ] Configurar ECR en AWS
- [ ] Configurar ECS Cluster
- [ ] Crear secrets en AWS Secrets Manager
- [ ] Configurar GitHub Actions secrets
- [ ] Push para trigger CI/CD
- [ ] Verificar deployment en AWS Console

## 🆘 Problemas Comunes

### "Cannot find module 'cors'"
✅ Normal en Replit. Se resuelve al hacer `npm install` en tu local.

### Frontend no conecta al backend
✅ Verifica que `VITE_API_URL` esté correctamente configurado.

### Docker build falla
✅ Asegúrate de tener Docker instalado y corriendo.

## 💰 Costos Estimados AWS

- **ECS Fargate** (2 servicios): ~$60-100/mes
- **Application Load Balancer**: ~$20/mes
- **RDS PostgreSQL**: ~$50-200/mes
- **Total**: **$150-300/mes**

## 🎯 Próximos Pasos

1. Descarga los ZIPs
2. Prueba localmente
3. Sube a GitHub
4. Configura AWS
5. Deploy automático con cada push

¡Todo listo para producción! 🚀

---

**¿Necesitas ayuda?** Consulta DEPLOYMENT-INSTRUCTIONS.md para instrucciones detalladas.
