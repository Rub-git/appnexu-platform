import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

// Cargar .env.local
dotenv.config({ path: path.resolve('.env.local') });

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('Conectando a BD...');
    console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
    
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, plan: true, password: true }
    });
    
    console.log('\n=== USUARIOS EN BASE DE DATOS ===');
    if (users.length === 0) {
      console.log('❌ NO HAY USUARIOS EN LA BASE DE DATOS');
    } else {
      console.log(`✅ Total de usuarios: ${users.length}\n`);
      users.forEach(user => {
        console.log(`Email: ${user.email}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Plan: ${user.plan}`);
        console.log(`  Tiene contraseña: ${!!user.password}`);
        if (user.password) {
          console.log(`  Hash (primeros 15 chars): ${user.password.substring(0, 15)}...`);
        }
        console.log('');
      });
    }
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkUsers();
