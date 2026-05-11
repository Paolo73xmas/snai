const SUPABASE_URL = 'https://idklfzwgzvjmuqnqnqxh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlka2xmendnenZqbXVxbnFucXhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUxNjcxNCwiZXhwIjoyMDk0MDkyNzE0fQ.CBPtksY-P2rUcqx2CEvVCUfiZ53H8y-MGfBTHqJicbE';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlka2xmendnenZqbXVxbnFucXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTY3MTQsImV4cCI6MjA5NDA5MjcxNH0.a5u-_6YruX8oefxq8LXp9Gxgvjp2EgxrENsNWMG3Y_U';

async function main() {
  // Step 1: Create admin user via Supabase Auth (using service role key)
  console.log('1. Creating admin user via Supabase Auth...');
  const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify({
      email: 'admin1@trezzanosnai.it',
      password: 'Test123!',
      email_confirm: true,
      user_metadata: {
        nome: 'Admin',
        cognome: 'Sistema',
        ruolo: 'admin',
        status: 'attivo'
      }
    }),
  });
  const signupData = await signupRes.json();
  console.log('  Status:', signupRes.status);
  console.log('  Response:', JSON.stringify(signupData).substring(0, 300));

  // Step 2: Try to login with the admin user
  console.log('\n2. Testing login with admin user...');
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({
      email: 'admin1@trezzanosnai.it',
      password: 'Test123!',
    }),
  });
  const loginData = await loginRes.json();
  console.log('  Status:', loginRes.status);
  console.log('  Response:', JSON.stringify(loginData).substring(0, 400));

  // Step 3: List users
  console.log('\n3. Listing auth users...');
  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
  });
  const listData = await listRes.json();
  console.log('  Status:', listRes.status);
  console.log('  Users count:', listData.users?.length || 0);
  if (listData.users?.length > 0) {
    listData.users.forEach(u => console.log(`    - ${u.email} (confirmed: ${!!u.email_confirmed_at})`));
  }
}

main().catch(console.error);
