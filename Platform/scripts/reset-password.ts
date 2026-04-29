import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve('.env.local') });
dotenv.config({ path: path.resolve('.env') });

const connectionString = process.env.DATABASE_URL;
const email = process.argv[2];
const newPassword = process.argv[3];

if (!connectionString) {
  console.error('DATABASE_URL no está configurada en .env.local/.env o variables de entorno');
  process.exit(1);
}

if (!email || !newPassword) {
  console.error('Uso: npx tsx scripts/reset-password.ts <email> <newPassword>');
  process.exit(1);
}

async function resetPassword() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔐 Generando nueva contraseña...');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Nueva contraseña: ${newPassword}\n`);
    
    // Hashear la contraseña
    console.log('🔒 Hasheando contraseña...');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log(`✅ Hash generado: ${hashedPassword.substring(0, 20)}...\n`);
    
    // Conectar a la BD
    console.log('Conectando a la base de datos...');
    await client.connect();
    
    // Actualizar contraseña
    console.log('📝 Actualizando usuario en la BD...');
    const result = await client.query(`
      UPDATE "User"
      SET password = $1
      WHERE email = $2
      RETURNING email, role, plan
    `, [hashedPassword, email]);
    
    if (result.rows.length === 0) {
      console.log(`❌ Usuario ${email} no encontrado`);
      process.exit(1);
    }
    
    const user = result.rows[0];
    console.log('\n✅ ✅ ✅ CONTRASEÑAS ACTUALIZADAS ✅ ✅ ✅\n');
    console.log('📧 Email:', user.email);
    console.log('📍 Rol:', user.role);
    console.log('📊 Plan:', user.plan);
    console.log('\n' + '='.repeat(50));
    console.log('CREDENCIALES DE ACCESO:');
    console.log('='.repeat(50));
    console.log(`Email:       ${email}`);
    console.log(`Contraseña:  ${newPassword}`);
    console.log('='.repeat(50) + '\n');
    
    await client.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetPassword();
