/**
 * Prueba de Spike (Picos de Tráfico)
 * 
 * Simula picos repentinos de tráfico para verificar cómo responde el sistema
 * Útil para detectar problemas de escalado y timeouts
 * 
 * Ejecutar: k6 run tests/k6/spike-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Baseline: 10 usuarios
    { duration: '10s', target: 100 },  // SPIKE: 10 a 100 usuarios en 10s
    { duration: '30s', target: 100 }, // Mantener spike
    { duration: '10s', target: 10 },   // Recuperación: 100 a 10 usuarios
    { duration: '30s', target: 10 },  // Estabilizar
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.80'], // Permitir 401/403
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://unigrc-backend-7joma3s3xa-tl.a.run.app';

const endpoints = [
  '/api/health',
  '/api/auth/user',
  '/api/risks/bootstrap',
  '/api/controls/with-details?limit=50',
  '/api/validation/counts',
  '/api/processes',
];

export default function () {
  // Seleccionar endpoint aleatorio
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const res = http.get(`${BASE_URL}${endpoint}`, {
    tags: { name: endpoint },
  });
  
  const isOk = res.status === 200 || res.status === 401 || res.status === 403;
  check(res, {
    [`${endpoint} status is valid`]: (r) => isOk,
  });
  
  if (!isOk && res.status >= 500) {
    errorRate.add(1);
  }
  
  requestDuration.add(res.timings.duration);
  sleep(Math.random() * 2 + 0.5); // Sleep aleatorio entre 0.5-2.5s
}
