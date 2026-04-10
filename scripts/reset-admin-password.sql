-- ============================================
-- Script: Resetear password del usuario admin
-- Password: Admin123!
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- 1. Verificar que el usuario existe
SELECT id, name, email, role, plan
FROM "User"
WHERE email = 'admin@appnexu.com';

-- 2. Actualizar el password con hash bcrypt correcto
UPDATE "User"
SET password = '$2b$12$3T.AYPu0brW6CmelxT74TeIrdKAy52ldkBW9xSL5e.OrCHDGBm7sS',
    "updatedAt" = NOW()
WHERE email = 'admin@appnexu.com';

-- 3. Verificar la actualización
SELECT id, name, email, role, plan, "updatedAt"
FROM "User"
WHERE email = 'admin@appnexu.com';
