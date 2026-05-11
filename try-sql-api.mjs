const SUPABASE_URL = 'https://idklfzwgzvjmuqnqnqxh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlka2xmendnenZqbXVxbnFucXhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUxNjcxNCwiZXhwIjoyMDk0MDkyNzE0fQ.CBPtksY-P2rUcqx2CEvVCUfiZ53H8y-MGfBTHqJicbE';

async function main() {
  // Try various SQL execution endpoints
  const endpoints = [
    { path: '/pg/query', method: 'POST', body: JSON.stringify({ query: 'SELECT 1 as test' }) },
    { path: '/rest/v1/rpc/exec_sql', method: 'POST', body: JSON.stringify({ sql_text: 'SELECT 1' }) },
  ];

  for (const ep of endpoints) {
    const url = `${SUPABASE_URL}${ep.path}`;
    console.log(`\nTrying ${ep.method} ${ep.path}...`);
    try {
      const res = await fetch(url, {
        method: ep.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
        },
        body: ep.body,
      });
      console.log(`  Status: ${res.status}`);
      const text = await res.text();
      console.log(`  Response: ${text.substring(0, 300)}`);
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }

  // The key insight: Supabase Pooler uses the project ref as a "user" prefix
  // but if the project was created recently, it might use a different format
  // Let's check if maybe the project is paused
  console.log('\n\nChecking project health...');
  const healthRes = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
    headers: { 'apikey': SERVICE_KEY }
  });
  console.log('Auth health:', healthRes.status, await healthRes.text());

  const storageRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });
  console.log('Storage:', storageRes.status, await storageRes.text());
}

main().catch(console.error);
