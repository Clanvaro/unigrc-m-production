unigrc-backend-00211-qz9
Implementación realizada por 524018293934-compute@developer.gserviceaccount.com using gcloud
Contenedores
Redes
Seguridad
YAML
General
Facturación
Basada en solicitudes
Aumento de CPU de inicio
Habilitada
Simultaneidad
10
Tiempo de espera de la solicitud
300 seconds
Entorno de ejecución
Segunda generación
Ajuste de escala automático
Cantidad mínima de instancias de revisión
1
Cantidad máxima de instancias de revisión
5
Imagen
southamerica-west1-docker.pkg.dev/unigrc-m/unigrc/backend@sha256:017922030ea09ec3b39a6fa9ef17ac8469bf0ff42acbcc3e7071d971a685294b
Puerto
5000
Compilación
(no hay información disponible sobre la creación) 
Fuente
(no hay información disponible sobre la fuente) 
Comandos y argumentos
(punto de entrada del contenedor)
Límite de CPU
2
Límite de memoria
2GiB

Variables de entorno (13)
Nombre
Valor
NODE_ENV	production	
IS_GCP_DEPLOYMENT	true	
GCS_PROJECT_ID	unigrc-m	
GCS_BUCKET_NAME	unigrc-uploads-unigrc-m	
FRONTEND_URL	https://unigrc-frontend-7joma3s3xa-tl.a.run.app	
DATABASE_URL	Secreto:DATABASE_URL:latest	
SESSION_SECRET	Secreto:SESSION_SECRET:latest	
CSRF_SECRET	Secreto:CSRF_SECRET:latest	
GCS_CLIENT_EMAIL	Secreto:GCS_CLIENT_EMAIL:latest	
GCS_PRIVATE_KEY	Secreto:GCS_PRIVATE_KEY:latest	
OPENAI_API_KEY	Secreto:OPENAI_API_KEY:latest	
UPSTASH_REDIS_REST_TOKEN	Secreto:UPSTASH_REDIS_REST_TOKEN:latest	
UPSTASH_REDIS_REST_URL	Secreto:UPSTA