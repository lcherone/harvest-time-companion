const response = await fetch("http://127.0.0.1:8787/health");

if (!response.ok) {
  throw new Error(`HarvestTime health check failed with HTTP ${response.status}`);
}

const health = await response.json();

if (health?.status !== "ok" || health?.service !== "harvest-time-api") {
  throw new Error(`Unexpected HarvestTime health response: ${JSON.stringify(health)}`);
}

console.log(JSON.stringify(health, null, 2));
