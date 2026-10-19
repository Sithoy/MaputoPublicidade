// This helper cannot be pointed at production or a credential-bearing endpoint.
const target = 'http://127.0.0.1:8008/health/';
const deadline = Date.now() + 90_000;
while (Date.now() < deadline) {
  try {
    const response = await fetch(target, { signal: AbortSignal.timeout(1500), redirect: 'error' });
    if (response.ok) process.exit(0);
  } catch { /* The disposable backend may still be applying migrations. */ }
  await new Promise(resolve => setTimeout(resolve, 500));
}
throw new Error('Isolated E2E backend did not become healthy');
