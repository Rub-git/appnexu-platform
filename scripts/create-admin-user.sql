-- ============================================================
-- Script SQL para crear usuario admin en Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================
-- 
-- Credenciales del usuario:
--   Email:    admin@appnexu.com
--   Password: Admin123!
--   Role:     ADMIN
--   Plan:     AGENCY
--
-- La contraseña está hasheada con bcrypt (salt rounds=12)
-- ============================================================

-- Primero eliminar si ya existe (para evitar errores de duplicado)
DELETE FROM "User" WHERE email = 'admin@appnexu.com';

-- Crear el usuario admin
INSERT INTO "User" (
  id,
  name,
  email,
  password,
  role,
  plan,
  "createdAt",
  "updatedAt"
) VALUES (
  'cuid_admin_' || substr(md5(random()::text), 1, 20),
  'Admin User',
  'admin@appnexu.com',
  '$2b$12$e3Wie6A4VJX0LSKLbjr9g.ethC8zUzGeAr1oN5mgQ7E1M5HgUBcUm',
  'ADMIN',
  'AGENCY',
  NOW(),
  NOW()
);

-- Verificar que se creó correctamente
SELECT id, name, email, role, plan, "createdAt" 
FROM "User" 
WHERE email = 'admin@appnexu.com';
