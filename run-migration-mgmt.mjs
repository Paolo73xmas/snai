// Supabase Management API - try to run SQL via the /query endpoint
// This requires either a Management API key or we can try the service role key
const PROJECT_REF = 'idklfzwgzvjmuqnqnqxh';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlka2xmendnenZqbXVxbnFucXhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUxNjcxNCwiZXhwIjoyMDk0MDkyNzE0fQ.CBPtksY-P2rUcqx2CEvVCUfiZ53H8y-MGfBTHqJicbE';
const DB_PASSWORD = 'Emmilu75!.?';

async function main() {
  // Method 1: Try Supabase platform API (api.supabase.com)
  // This needs a management token, but let's try with service role
  const mgmtEndpoints = [
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    `https://api.supabase.io/v1/projects/${PROJECT_REF}/database/query`,
  ];

  for (const url of mgmtEndpoints) {
    console.log(`Trying: ${url}`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: 'SELECT 1 as test' }),
      });
      console.log(`  Status: ${res.status}`);
      const text = await res.text();
      console.log(`  Body: ${text.substring(0, 200)}`);
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }

  // Method 2: Try connecting with supabase-js admin client to create an exec_sql function
  // via the pg_net extension
  console.log('\nMethod 2: Check available extensions...');
  const extRes = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/rpc/extensions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
    body: '{}',
  });
  console.log(`  Extensions status: ${extRes.status}`);
  console.log(`  Body: ${(await extRes.text()).substring(0, 200)}`);

  // Method 3: Try the newer Supabase SQL API endpoint
  console.log('\nMethod 3: Try /sql endpoint variants...');
  const sqlEndpoints = [
    { url: `https://${PROJECT_REF}.supabase.co/pg`, body: { query: 'SELECT 1' } },
    { url: `https://${PROJECT_REF}.supabase.co/graphql/v1`, body: { query: '{ __schema { types { name } } }' } },
  ];

  for (const ep of sqlEndpoints) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
        },
        body: JSON.stringify(ep.body),
      });
      console.log(`  ${ep.url}: ${res.status}`);
      const text = await res.text();
      console.log(`    ${text.substring(0, 200)}`);
    } catch (e) {
      console.log(`  ${ep.url}: Error - ${e.message}`);
    }
  }

  // Method 4: Try using the Supabase CLI approach - install supabase CLI
  console.log('\nMethod 4: Check if supabase CLI is available...');
}

main().catch(console.error);
