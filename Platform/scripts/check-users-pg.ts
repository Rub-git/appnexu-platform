import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve('.env.local') });
dotenv.config({ path: path.resolve('.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL no está configurada en .env.local/.env o variables de entorno');
  process.exit(1);
}

async function checkUsers() {
  const client = new Client({ connectionString });
  
  try {
    console.log('Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado\n');
    
    const result = await client.query(`
      SELECT id, email, role, plan, password IS NOT NULL as has_password 
      FROM "User" 
      ORDER BY "createdAt" DESC
    `);
    
    console.log('=== USUARIOS EN BASE DE DATOS ===');
    if (result.rows.length === 0) {
      console.log('❌ NO HAY USUARIOS REGISTRADOS');
    } else {
      console.log(`✅ Total: ${result.rows.length} usuario(s)\n`);
      result.rows.forEach((row: any, idx: number) => {
        console.log(`${idx + 1}. Email: ${row.email}`);
        console.log(`   ID: ${row.id}`);
        console.log(`   Role: ${row.role}`);
        console.log(`   Plan: ${row.plan}`);
        console.log(`   ¿Tiene contraseña?: ${row.has_password ? '✅ SÍ' : '❌ NO'}`);
        console.log('');
      });
    }
    
    await client.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
