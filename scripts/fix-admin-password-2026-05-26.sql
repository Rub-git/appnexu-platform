-- =============================================================================
-- FIX: Reset admin password to "Admin123!"
-- 
-- Problema: El hash bcrypt almacenado NO coincide con "Admin123!"
-- Detectado: 2026-05-26 via /api/auth/debug
-- 
-- Ejecutar en: Supabase SQL Editor
-- =============================================================================

-- 1. Verificar estado actual del usuario admin
SELECT id, email, name, role, plan, 
       LENGTH(password) as password_length,
       LEFT(password, 7) as hash_prefix,
       "updatedAt"
FROM "User" 
WHERE email = 'admin@appnexu.com';

-- 2. Actualizar password con hash bcrypt correcto para "Admin123!"
UPDATE "User" 
SET 
  password = '$2b$12$Pngfu1mlFLBQ2mutSx7oEeNd12dhh9dbN4O62I2eSnVlG3JquerOu',
  "updatedAt" = NOW()
WHERE email = 'admin@appnexu.com';

-- 3. Verificar que se actualizó
SELECT id, email, name, role, plan, 
       LENGTH(password) as password_length,
       LEFT(password, 7) as hash_prefix,
       "updatedAt"
FROM "User" 
WHERE email = 'admin@appnexu.com';

-- ✅ Después de ejecutar este script:
-- 1. Ve a appnexu.com/login
-- 2. Inicia sesión con: admin@appnexu.com / Admin123!
-- 3. Si sigue fallando, prueba en modo incógnito (sin extensiones)
-- 4. Verifica con: curl -X POST https://appnexu.com/api/auth/test-login \
--      -H "Content-Type: application/json" \
--      -d '{"email":"admin@appnexu.com","password":"Admin123!"}'
