import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve('.env.local') });
dotenv.config({ path: path.resolve('.env') });

const connectionString = process.env.DATABASE_URL;
const testEmail = process.argv[2];
const testPassword = process.argv[3];

if (!connectionString) {
  console.error('DATABASE_URL no está configurada en .env.local/.env o variables de entorno');
  process.exit(1);
}

if (!testEmail || !testPassword) {
  console.error('Uso: npx tsx scripts/verify-password.ts <email> <password>');
  process.exit(1);
}

async function verifyPassword() {
  const client = new Client({ connectionString });
  
  try {
    console.log('Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado\n');
    
    const result = await client.query(`
      SELECT email, password, role, plan
      FROM "User"
      WHERE email = $1
    `, [testEmail]);
    
    if (result.rows.length === 0) {
      console.log(`❌ Usuario ${testEmail} no encontrado`);
      process.exit(1);
    }
    
    const user = result.rows[0];
    console.log(`📧 Usuario: ${user.email}`);
    console.log(`📍 Rol: ${user.role}`);
    console.log(`📊 Plan: ${user.plan}`);
    console.log(`🔐 Hash (primeros 20 chars): ${user.password.substring(0, 20)}...`);
    console.log(`\n🔍 Verificando contraseña: "${testPassword}"`);
    
    const isValid = await bcrypt.compare(testPassword, user.password);
    
    if (isValid) {
      console.log('✅ ✅ ✅ CONTRASEÑA CORRECTA ✅ ✅ ✅');
    } else {
      console.log('❌ CONTRASEÑA INCORRECTA');
      console.log('\n💡 La contraseña no coincide con el hash en la BD.');
      console.log('¿Necesitas que resete la contraseña para este usuario?');
    }
    
    await client.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyPassword();
