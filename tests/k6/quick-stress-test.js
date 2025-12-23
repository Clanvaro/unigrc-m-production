/**
 * Prueba rápida de estrés usando Node.js (sin necesidad de k6)
 * 
 * Esta prueba puede ejecutarse inmediatamente sin instalar k6
 * Ejecutar: node tests/k6/quick-stress-test.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const CONCURRENT_USERS = parseInt(process.env.VUS) || 50;
const DURATION_SECONDS = parseInt(process.env.DURATION) || 30;

const endpoints = [
  { path: '/api/health', name: 'Health Check' },
  { path: '/api/auth/user', name: 'Auth User' },
  { path: '/api/risks/bootstrap', name: 'Risks Bootstrap' },
  { path: '/api/controls/with-details?limit=50&offset=0', name: 'Controls with Details' },
  { path: '/api/validation/counts', name: 'Validation Counts' },
  { path: '/api/processes', name: 'Processes' },
];

const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  durations: [],
  errors: [],
  startTime: Date.now(),
};

async function makeRequest(endpoint) {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout (reducido)
    
    const response = await fetch(`${BASE_URL}${endpoint.path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'k6-stress-test/1.0',
      },
      signal: controller.signal,
    }).catch(err => {
      clearTimeout(timeoutId);
      throw err;
    });
    
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    results.totalRequests++;
    results.durations.push(duration);
    
    // Considerar 200, 401 (no auth), 403 (forbidden) como "exitosos" para pruebas de carga
    // Solo contar como error si es 500+ o timeout
    if (response.ok || response.status === 401 || response.status === 403) {
      results.successfulRequests++;
      return { success: true, duration, status: response.status };
    } else if (response.status >= 500) {
      results.failedRequests++;
      results.errors.push({ endpoint: endpoint.name, status: response.status, duration });
      return { success: false, duration, status: response.status };
    } else {
      // 4xx (excepto 401/403) se consideran exitosos para carga pero se registran
      results.successfulRequests++;
      return { success: true, duration, status: response.status };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    results.totalRequests++;
    
    // Timeout o error de red se considera fallo
    if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      results.failedRequests++;
      const errorMsg = error.name === 'AbortError' ? 'Timeout (>15s)' : (error.message || error.code || 'Network error');
      results.errors.push({ endpoint: endpoint.name, error: errorMsg, duration });
      return { success: false, duration, error: errorMsg };
    } else {
      // Otros errores también se consideran fallos
      results.failedRequests++;
      results.errors.push({ endpoint: endpoint.name, error: error.message || error.code || 'Unknown error', duration });
      return { success: false, duration, error: error.message || error.code };
    }
  }
}

async function runUser() {
  const endTime = Date.now() + (DURATION_SECONDS * 1000);
  
  while (Date.now() < endTime) {
    // Seleccionar endpoint aleatorio
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    await makeRequest(endpoint);
    
    // Sleep aleatorio entre 1-3 segundos
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
  }
}

function calculateStats(durations) {
  if (durations.length === 0) return { avg: 0, p95: 0, p99: 0, min: 0, max: 0 };
  
  const sorted = [...durations].sort((a, b) => a - b);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const p95Index = Math.floor(sorted.length * 0.95);
  const p99Index = Math.floor(sorted.length * 0.99);
  
  return {
    avg: Math.round(avg),
    p95: sorted[p95Index] || 0,
    p99: sorted[p99Index] || 0,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

async function runStressTest() {
  console.log('\n🚀 Iniciando prueba de estrés...\n');
  console.log(`📍 URL Base: ${BASE_URL}`);
  console.log(`👥 Usuarios concurrentes: ${CONCURRENT_USERS}`);
  console.log(`⏱️  Duración: ${DURATION_SECONDS} segundos\n`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Iniciar usuarios concurrentes
  const userPromises = Array.from({ length: CONCURRENT_USERS }, () => runUser());
  
  // Mostrar progreso cada 5 segundos
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - results.startTime) / 1000;
    const rps = (results.totalRequests / elapsed).toFixed(2);
    const errorRate = ((results.failedRequests / results.totalRequests) * 100).toFixed(2);
    
    process.stdout.write(`\r⏳ Progreso: ${elapsed.toFixed(0)}s | Requests: ${results.totalRequests} | RPS: ${rps} | Errores: ${errorRate}%`);
  }, 1000);
  
  // Esperar a que terminen todos los usuarios
  await Promise.all(userPromises);
  clearInterval(progressInterval);
  
  const totalDuration = (Date.now() - results.startTime) / 1000;
  const stats = calculateStats(results.durations);
  const rps = (results.totalRequests / totalDuration).toFixed(2);
  const errorRate = ((results.failedRequests / results.totalRequests) * 100).toFixed(2);
  
  // Mostrar resultados
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  📊 RESULTADOS DE PRUEBA DE ESTRÉS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`⏱️  Duración total: ${totalDuration.toFixed(2)}s`);
  console.log(`📈 Requests totales: ${results.totalRequests}`);
  console.log(`✅ Requests exitosos: ${results.successfulRequests}`);
  console.log(`❌ Requests fallidos: ${results.failedRequests}`);
  console.log(`🚀 Requests/segundo: ${rps}`);
  console.log(`⚠️  Tasa de errores: ${errorRate}%\n`);
  
  console.log('📉 LATENCIA:');
  console.log(`   Promedio: ${stats.avg}ms`);
  console.log(`   Mínima: ${stats.min}ms`);
  console.log(`   Máxima: ${stats.max}ms`);
  console.log(`   p95: ${stats.p95}ms`);
  console.log(`   p99: ${stats.p99}ms\n`);
  
  if (results.errors.length > 0) {
    console.log('❌ ERRORES DETECTADOS:');
    results.errors.slice(0, 10).forEach((error, i) => {
      console.log(`   ${i + 1}. ${error.endpoint}: ${error.error || `Status ${error.status}`} (${error.duration}ms)`);
    });
    if (results.errors.length > 10) {
      console.log(`   ... y ${results.errors.length - 10} errores más`);
    }
    console.log('');
  }
  
  // Evaluación de resultados (ajustado para producción con cold starts)
  console.log('🎯 EVALUACIÓN:');
  const checks = {
    latency: stats.avg < 5000, // Más permisivo para Cloud Run con cold starts
    p95: stats.p95 < 10000,
    p99: stats.p99 < 20000,
    errorRate: parseFloat(errorRate) < 5, // 5% aceptable para pruebas sin auth
    throughput: parseFloat(rps) > 1, // Mínimo 1 req/s
  };
  
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${check}: ${passed ? 'PASÓ' : 'FALLÓ'}`);
  });
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
  
  // Guardar resultados en JSON (solo si fs está disponible)
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const summary = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      concurrentUsers: CONCURRENT_USERS,
      duration: totalDuration,
      metrics: {
        totalRequests: results.totalRequests,
        successfulRequests: results.successfulRequests,
        failedRequests: results.failedRequests,
        requestsPerSecond: parseFloat(rps),
        errorRate: parseFloat(errorRate),
        latency: stats,
      },
      checks,
      errors: results.errors.slice(0, 20),
    };
    
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const filename = `quick-stress-${Date.now()}.json`;
    fs.writeFileSync(path.join(resultsDir, filename), JSON.stringify(summary, null, 2));
    console.log(`💾 Resultados guardados en: tests/k6/results/${filename}\n`);
  } catch (err) {
    // Ignorar si no se puede guardar
  }
}

// Ejecutar prueba
runStressTest().catch(error => {
  console.error('❌ Error ejecutando prueba:', error);
  process.exit(1);
});
