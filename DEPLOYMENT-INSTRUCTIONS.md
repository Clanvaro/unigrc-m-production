# RiskMatrix Pro - Instrucciones de Deployment

Este documento contiene las instrucciones para descargar y configurar los repositorios de RiskMatrix Pro para deployment en AWS ECS.

## Estructura de Repositorios

El proyecto se ha dividido en dos repositorios independientes:

1. **riskmatrix-backend** - API REST con Express.js
2. **riskmatrix-frontend** - Aplicación React con nginx

## Cómo Descargar los Repositorios

### Opción 1: Descarga desde Replit (Recomendado)

1. En el panel de archivos de Replit, navega a la carpeta `riskmatrix-backend`
2. Haz clic derecho en la carpeta → **"Download as ZIP"**
3. Guarda el archivo como `riskmatrix-backend.zip`
4. Repite el proceso con la carpeta `riskmatrix-frontend`
5. Guarda el archivo como `riskmatrix-frontend.zip`

### Opción 2: Usar Git (si está conectado)

```bash
# Si tienes Git configurado en Replit
cd /path/to/local/workspace
git clone <URL_DEL_REPO_BACKEND> riskmatrix-backend
git clone <URL_DEL_REPO_FRONTEND> riskmatrix-frontend
```

## Configuración Inicial

### 1. Extraer y Configurar Backend

```bash
# Extraer el ZIP
unzip riskmatrix-backend.zip
cd riskmatrix-backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus valores

# Inicializar repositorio Git
git init
git add .
git commit -m "Initial commit"

# Conectar con tu repositorio de GitHub
git remote add origin https://github.com/TU_USUARIO/riskmatrix-backend.git
git push -u origin main
```

### 2. Extraer y Configurar Frontend

```bash
# Extraer el ZIP
unzip riskmatrix-frontend.zip
cd riskmatrix-frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con la URL del backend

# Inicializar repositorio Git
git init
git add .
git commit -m "Initial commit"

# Conectar con tu repositorio de GitHub
git remote add origin https://github.com/TU_USUARIO/riskmatrix-frontend.git
git push -u origin main
```

## Configuración de AWS

### Prerequisitos

1. **Cuenta AWS** con permisos para:
   - ECR (Elastic Container Registry)
   - ECS (Elastic Container Service)
   - IAM (Identity and Access Management)
   - Secrets Manager
   - CloudWatch Logs
   - VPC y Security Groups

2. **AWS CLI** instalado y configurado

### Paso 1: Crear Repositorios ECR

```bash
# Backend
aws ecr create-repository \
    --repository-name riskmatrix-backend \
    --region us-east-1

# Frontend
aws ecr create-repository \
    --repository-name riskmatrix-frontend \
    --region us-east-1
```

### Paso 2: Crear ECS Cluster

```bash
aws ecs create-cluster \
    --cluster-name riskmatrix-cluster \
    --region us-east-1
```

### Paso 3: Crear CloudWatch Log Groups

```bash
# Backend logs
aws logs create-log-group \
    --log-group-name /ecs/riskmatrix-backend \
    --region us-east-1

# Frontend logs
aws logs create-log-group \
    --log-group-name /ecs/riskmatrix-frontend \
    --region us-east-1
```

### Paso 4: Crear IAM Roles

#### Task Execution Role

```bash
# Crear el rol
aws iam create-role \
    --role-name ecsTaskExecutionRole \
    --assume-role-policy-document file://trust-policy.json

# Adjuntar política
aws iam attach-role-policy \
    --role-name ecsTaskExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

trust-policy.json:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Paso 5: Almacenar Secrets en AWS Secrets Manager

```bash
# Database URL
aws secretsmanager create-secret \
    --name riskmatrix/database-url \
    --secret-string "postgresql://user:password@host:5432/database" \
    --region us-east-1

# Session Secret
aws secretsmanager create-secret \
    --name riskmatrix/session-secret \
    --secret-string "your-super-secret-session-key-change-this" \
    --region us-east-1

# Mailgun API Key
aws secretsmanager create-secret \
    --name riskmatrix/mailgun-key \
    --secret-string "your-mailgun-api-key" \
    --region us-east-1

# Mailgun Domain
aws secretsmanager create-secret \
    --name riskmatrix/mailgun-domain \
    --secret-string "mg.yourdomain.com" \
    --region us-east-1

# SMTP Configuration (alternativa a Mailgun)
aws secretsmanager create-secret \
    --name riskmatrix/smtp-config \
    --secret-string '{"host":"smtp.gmail.com","port":587,"user":"your-email@gmail.com","password":"your-app-password"}' \
    --region us-east-1

# Twilio Credentials
aws secretsmanager create-secret \
    --name riskmatrix/twilio-sid \
    --secret-string "your-twilio-account-sid" \
    --region us-east-1

aws secretsmanager create-secret \
    --name riskmatrix/twilio-token \
    --secret-string "your-twilio-auth-token" \
    --region us-east-1

aws secretsmanager create-secret \
    --name riskmatrix/twilio-phone \
    --secret-string "+1234567890" \
    --region us-east-1
```

### Paso 6: Actualizar Task Definitions

En ambos repositorios, edita los archivos `task-definition-*.json`:

1. Reemplaza `YOUR_ACCOUNT_ID` con tu AWS Account ID
2. Actualiza los ARNs de los roles IAM
3. Actualiza los ARNs de los secrets en Secrets Manager

### Paso 7: Crear Servicios ECS

```bash
# Backend
aws ecs create-service \
    --cluster riskmatrix-cluster \
    --service-name riskmatrix-backend-service \
    --task-definition riskmatrix-backend \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"

# Frontend
aws ecs create-service \
    --cluster riskmatrix-cluster \
    --service-name riskmatrix-frontend-service \
    --task-definition riskmatrix-frontend \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

## Configuración de GitHub Actions

### En ambos repositorios:

1. Ve a **Settings > Secrets and variables > Actions**
2. Agrega los siguientes secrets:

#### Backend:
- `AWS_ACCESS_KEY_ID` - Tu AWS Access Key ID
- `AWS_SECRET_ACCESS_KEY` - Tu AWS Secret Access Key

#### Frontend:
- `AWS_ACCESS_KEY_ID` - Tu AWS Access Key ID
- `AWS_SECRET_ACCESS_KEY` - Tu AWS Secret Access Key
- `VITE_API_URL` - URL del backend (ej: `https://api.tu-dominio.com`)

## Load Balancer y Dominios (Recomendado)

### Application Load Balancer

1. **Crear ALB**:
   ```bash
   aws elbv2 create-load-balancer \
       --name riskmatrix-alb \
       --subnets subnet-xxx subnet-yyy \
       --security-groups sg-xxx
   ```

2. **Crear Target Groups**:
   ```bash
   # Backend target group
   aws elbv2 create-target-group \
       --name riskmatrix-backend-tg \
       --protocol HTTP \
       --port 3000 \
       --vpc-id vpc-xxx \
       --target-type ip

   # Frontend target group
   aws elbv2 create-target-group \
       --name riskmatrix-frontend-tg \
       --protocol HTTP \
       --port 80 \
       --vpc-id vpc-xxx \
       --target-type ip
   ```

3. **Configurar Listeners**:
   - Puerto 443 (HTTPS) → Frontend Target Group
   - Configurar regla de path `/api/*` → Backend Target Group

4. **Certificado SSL**:
   - Usar AWS Certificate Manager (ACM) para generar certificado SSL
   - Adjuntar al listener HTTPS del ALB

### Configurar Route 53 (Opcional)

```bash
# Crear registro A para tu dominio apuntando al ALB
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --change-batch file://dns-change.json
```

## Testing Local con Docker

### Backend:
```bash
cd riskmatrix-backend
docker-compose up
# Backend en http://localhost:3000
```

### Frontend:
```bash
cd riskmatrix-frontend
docker-compose up
# Frontend en http://localhost:80
```

## Deployment Automático

Después de configurar todo, el deployment es automático:

```bash
# Hacer cambios en el código
git add .
git commit -m "Update feature X"
git push origin main

# GitHub Actions automáticamente:
# 1. Construye la imagen Docker
# 2. La sube a ECR
# 3. Actualiza el servicio ECS
# 4. ECS hace rolling update sin downtime
```

## Monitoreo y Logs

### Ver logs en tiempo real:

```bash
# Backend
aws logs tail /ecs/riskmatrix-backend --follow

# Frontend
aws logs tail /ecs/riskmatrix-frontend --follow
```

### Métricas en CloudWatch:

- CPU utilization
- Memory utilization
- Request count
- Error rate

## Troubleshooting

### El servicio no inicia:
1. Verificar logs en CloudWatch
2. Verificar que los secrets estén correctamente configurados
3. Verificar security groups y subnets
4. Verificar que la imagen se haya subido correctamente a ECR

### Frontend no puede conectar al backend:
1. Verificar que `VITE_API_URL` esté correctamente configurado
2. Verificar CORS en el backend
3. Verificar que el ALB esté rutando correctamente

### Database connection error:
1. Verificar que el secret `DATABASE_URL` sea correcto
2. Verificar que el security group permita conexión desde ECS al RDS
3. Verificar que la VPC tenga acceso a la base de datos

## Costos Estimados (us-east-1)

- **ECS Fargate**: ~$30-50/mes por servicio (depende del tamaño)
- **Application Load Balancer**: ~$20/mes
- **ECR Storage**: ~$1/mes
- **CloudWatch Logs**: ~$5/mes
- **RDS PostgreSQL**: $50-200/mes (depende del tamaño)
- **Total aproximado**: $150-300/mes

## Soporte

Para problemas o preguntas:
- Revisa los README.md en cada repositorio
- Consulta la documentación de AWS ECS
- Contacta al equipo de desarrollo

## Próximos Pasos

1. ✅ Descargar los ZIPs
2. ✅ Extraer y configurar repositorios
3. ✅ Configurar AWS infrastructure
4. ✅ Configurar GitHub Actions secrets
5. ✅ Push inicial a GitHub
6. ✅ Verificar deployment automático
7. ✅ Configurar dominio y SSL
8. ✅ Monitorear y optimizar

¡Buena suerte con el deployment! 🚀
