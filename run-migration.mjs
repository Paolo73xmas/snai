import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Correct password provided by user
const DB_PASSWORD = 'Emmilu75!.?';

const connections = [
  `postgresql://postgres.idklfzwgzvjmuqnqnqxh:${encodeURIComponent(DB_PASSWORD)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.idklfzwgzvjmuqnqnqxh:${encodeURIComponent(DB_PASSWORD)}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.idklfzwgzvjmuqnqnqxh:${encodeURIComponent(DB_PASSWORD)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.idklfzwgzvjmuqnqnqxh.supabase.co:5432/postgres`,
];

async function tryConnection(url, index) {
  const masked = url.replace(/:[^:@]+@/, ':***@');
  console.log(`\n🔄 Attempt ${index + 1}: ${masked}`);
  
  const sql = postgres(url, {
    ssl: 'require',
    connect_timeout: 10,
    idle_timeout: 5,
  });

  try {
    const [{ test }] = await sql`SELECT 1 as test`;
    console.log(`  ✅ Connected!`);
    return sql;
  } catch (err) {
    console.log(`  ❌ Failed: ${err.message}`);
    await sql.end();
    return null;
  }
}

async function runMigration() {
  console.log('🚀 Trying to connect to Supabase PostgreSQL...');
  
  let sql = null;
  for (let i = 0; i < connections.length; i++) {
    sql = await tryConnection(connections[i], i);
    if (sql) break;
  }

  if (!sql) {
    console.log('\n⚠️  Cannot connect. Please check the password and try again.');
    return;
  }

  try {
    const migrationPath = resolve(__dirname, 'supabase-migration.sql');
    const migrationSql = readFileSync(migrationPath, 'utf-8');

    console.log('\n📋 Running migration...');
    await sql.unsafe(migrationSql);
    console.log('  ✅ Migration completed!\n');

    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('📊 Tables in database:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    const users = await sql`SELECT id, username, ruolo, status FROM user_profiles WHERE username = 'admin1@trezzanosnai.it'`;
    if (users.length > 0) {
      console.log(`\n✅ Admin user found: ${users[0].username} (role: ${users[0].ruolo}, status: ${users[0].status})`);
    } else {
      console.log('\n❌ Admin user NOT found!');
    }

  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    await sql.end();
  }
}

runMigration();
