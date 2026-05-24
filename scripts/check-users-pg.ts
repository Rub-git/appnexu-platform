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
      type UserRow = {
        id: string;
        email: string;
        role: string;
        plan: string;
        has_password: boolean;
      };

      result.rows.forEach((row, idx: number) => {
        const user = row as UserRow;
        console.log(`${idx + 1}. Email: ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Plan: ${user.plan}`);
        console.log(`   ¿Tiene contraseña?: ${user.has_password ? '✅ SÍ' : '❌ NO'}`);
        console.log('');
      });
    }
    
    await client.end();
    process.exit(0);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error:', message);
    process.exit(1);
  }
}

checkUsers();
