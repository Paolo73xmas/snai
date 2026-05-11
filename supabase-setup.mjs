/**
 * Supabase Setup Script
 * Runs the SQL migration against the Supabase database using the Management API.
 * 
 * Usage: node supabase-setup.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://idklfzwgzvjmuqnqnqxh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlka2xmendnenZqbXVxbnFucXhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUxNjcxNCwiZXhwIjoyMDk0MDkyNzE0fQ.CBPtksY-P2rUcqx2CEvVCUfiZ53H8y-MGfBTHqJicbE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
  console.log('🚀 Starting Supabase migration...\n');

  // Read the SQL file
  const sqlPath = resolve(__dirname, 'supabase-migration.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // Split SQL into individual statements (handling multi-line statements)
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });
      
      if (error) {
        // Try direct fetch to the SQL endpoint
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ sql_query: stmt + ';' }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      }
      
      console.log(`  ✅ [${i + 1}/${statements.length}] ${preview}...`);
      successCount++;
    } catch (err) {
      console.log(`  ❌ [${i + 1}/${statements.length}] ${preview}...`);
      console.log(`     Error: ${err.message}\n`);
      errorCount++;
    }
  }

  console.log(`\n📊 Migration complete: ${successCount} succeeded, ${errorCount} failed`);
}

// Alternative: Use the Supabase SQL API directly
async function runMigrationDirect() {
  console.log('🚀 Starting Supabase migration (direct SQL)...\n');

  const sqlPath = resolve(__dirname, 'supabase-migration.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // Execute the entire SQL as one batch
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({}),
  });

  // The PostgREST API doesn't support raw SQL, so we'll use individual table operations
  // Let's create tables using the Supabase client and insert seed data

  console.log('📋 Creating admin user via Supabase client...\n');

  // Check if admin user already exists
  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('username', 'admin1@trezzanosnai.it')
    .single();

  if (existingUser) {
    console.log('  ℹ️  Admin user already exists, updating...');
    const { error } = await supabase
      .from('user_profiles')
      .update({
        password_hash: '$2b$12$LJ3m4ys3GZ8kPqNFAYCrruB8SQx0bVyXHGDAv5bNdPj3RKvOqFKuS',
        ruolo: 'admin',
        status: 'attivo',
      })
      .eq('username', 'admin1@trezzanosnai.it');

    if (error) {
      console.log(`  ❌ Error updating admin: ${error.message}`);
    } else {
      console.log('  ✅ Admin user updated');
    }
  } else {
    console.log('  📝 Creating admin user...');
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: 'admin-001',
        nome: 'Admin',
        cognome: 'Sistema',
        telefono: '+39 000 0000000',
        ruolo: 'admin',
        status: 'attivo',
        username: 'admin1@trezzanosnai.it',
        password_hash: '$2b$12$LJ3m4ys3GZ8kPqNFAYCrruB8SQx0bVyXHGDAv5bNdPj3RKvOqFKuS',
      });

    if (error) {
      console.log(`  ❌ Error creating admin: ${error.message}`);
    } else {
      console.log('  ✅ Admin user created');
    }
  }

  console.log('\n✨ Done! Tables must be created via Supabase SQL Editor.');
  console.log('   Copy the contents of supabase-migration.sql and run it in:');
  console.log('   https://supabase.com/dashboard/project/idklfzwgzvjmuqnqnqxh/sql/new');
}

// Try direct approach first
runMigrationDirect().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});