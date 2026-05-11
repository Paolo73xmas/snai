/**
 * Seed Admin User Script
 * Creates the admin user in Supabase after tables are created.
 * 
 * Usage: node seed-admin.mjs
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = 'https://idklfzwgzvjmuqnqnqxh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlka2xmendnenZqbXVxbnFucXhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUxNjcxNCwiZXhwIjoyMDk0MDkyNzE0fQ.CBPtksY-P2rUcqx2CEvVCUfiZ53H8y-MGfBTHqJicbE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seedAdmin() {
  console.log('🔐 Seeding admin user...\n');

  // Generate password hash for Test123!
  const passwordHash = await bcrypt.hash('Test123!', 12);
  console.log(`  Generated hash: ${passwordHash}`);

  // Check if admin exists
  const { data: existing, error: checkError } = await supabase
    .from('user_profiles')
    .select('id, username')
    .eq('username', 'admin1@trezzanosnai.it')
    .maybeSingle();

  if (checkError) {
    console.log(`\n❌ Error checking for existing admin: ${checkError.message}`);
    console.log('   Make sure you have run the SQL migration first!');
    console.log('   Copy supabase-migration.sql to: https://supabase.com/dashboard/project/idklfzwgzvjmuqnqnqxh/sql/new');
    process.exit(1);
  }

  if (existing) {
    console.log(`  ℹ️  Admin user already exists (id: ${existing.id}), updating password...`);
    const { error } = await supabase
      .from('user_profiles')
      .update({ password_hash: passwordHash })
      .eq('id', existing.id);

    if (error) {
      console.log(`  ❌ Error updating: ${error.message}`);
      process.exit(1);
    }
    console.log('  ✅ Admin password updated');
  } else {
    console.log('  📝 Creating admin user...');
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: 'admin-001',
        nome: 'Admin',
        cognome: 'Sistema',
        telefono: '+39 000 0000000',
        ruolo: 'admin',
        status: 'attivo',
        username: 'admin1@trezzanosnai.it',
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (error) {
      console.log(`  ❌ Error creating admin: ${error.message}`);
      process.exit(1);
    }
    console.log(`  ✅ Admin user created (id: ${data.id})`);
  }

  // Verify login works
  console.log('\n🔍 Verifying login...');
  const { data: user, error: loginError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('username', 'admin1@trezzanosnai.it')
    .single();

  if (loginError || !user) {
    console.log(`  ❌ Cannot find admin user: ${loginError?.message}`);
    process.exit(1);
  }

  const isValid = await bcrypt.compare('Test123!', user.password_hash);
  console.log(`  Password verification: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  User details: ${user.nome} ${user.cognome} (${user.ruolo})`);

  console.log('\n✨ Admin seeding complete!');
  console.log('   Login credentials:');
  console.log('   Username: admin1@trezzanosnai.it');
  console.log('   Password: Test123!');
}

seedAdmin().catch(err => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});