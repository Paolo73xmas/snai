import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PASSWORD = 'Emmilu75!.?';
const PROJECT_REF = 'idklfzwgzvjmuqnqnqxh';

// Try all possible connection formats
const connections = [
  // Transaction pooler (port 6543) - various regions
  ...['eu-central-1', 'eu-west-1', 'eu-west-2', 'us-east-1', 'us-west-2', 'ap-southeast-1'].map(r => 
    `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-${r}.pooler.supabase.com:6543/postgres`
  ),
  // Session pooler (port 5432) - various regions  
  ...['eu-central-1', 'eu-west-1', 'us-east-1'].map(r => 
    `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-${r}.pooler.supabase.com:5432/postgres`
  ),
  // Direct connection
  `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  // Alternative direct format
  `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@${PROJECT_REF}.supabase.co:5432/postgres`,
];

async function tryConnect(url, index) {
  const masked = url.replace(/:([^:@]+)@/, ':***@');
  process.stdout.write(`  ${index+1}. ${masked.substring(0, 80)}... `);
  
  const sql = postgres(url, {
    ssl: { rejectUnauthorized: false },
    connect_timeout: 5,
    idle_timeout: 3,
  });

  try {
    await sql`SELECT 1`;
    console.log('✅');
    return sql;
  } catch (err) {
    console.log(`❌ ${err.message.substring(0, 50)}`);
    await sql.end();
    return null;
  }
}

async function main() {
  console.log(`🔍 Trying ${connections.length} connection strings...\n`);
  
  for (let i = 0; i < connections.length; i++) {
    const sql = await tryConnect(connections[i], i);
    if (sql) {
      console.log('\n📋 Running migration...');
      const migrationSql = readFileSync(resolve(__dirname, 'supabase-migration.sql'), 'utf-8');
      await sql.unsafe(migrationSql);
      console.log('✅ Migration completed!');
      
      const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`;
      console.log('\n📊 Tables:', tables.map(t => t.table_name).join(', '));
      
      const admin = await sql`SELECT id, username, ruolo FROM user_profiles WHERE username = 'admin1@trezzanosnai.it'`;
      console.log('👤 Admin:', admin.length > 0 ? `Found (${admin[0].ruolo})` : 'NOT FOUND');
      
      await sql.end();
      return;
    }
  }
  
  console.log('\n⚠️  All connection attempts failed.');
}

main();
