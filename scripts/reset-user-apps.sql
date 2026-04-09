-- ============================================================
-- Script para resetear el contador de apps de un usuario
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Ver estado actual del usuario admin
SELECT 
  u.id, 
  u.email, 
  u.name, 
  u.plan, 
  u.role,
  COUNT(a.id) as app_count
FROM "User" u
LEFT JOIN "AppProject" a ON a."userId" = u.id
WHERE u.email = 'admin@appnexu.com'
GROUP BY u.id;

-- 2. Ver las apps existentes del usuario
SELECT 
  a.id, 
  a."appName", 
  a."targetUrl", 
  a.status, 
  a."createdAt"
FROM "AppProject" a
JOIN "User" u ON a."userId" = u.id
WHERE u.email = 'admin@appnexu.com';

-- 3. Eliminar todas las apps del usuario (resetea el contador)
-- DESCOMENTA la siguiente línea para ejecutar:
-- DELETE FROM "AppProject" WHERE "userId" = (SELECT id FROM "User" WHERE email = 'admin@appnexu.com');

-- 4. Verificar que el contador quedó en 0
SELECT 
  u.email, 
  u.plan,
  COUNT(a.id) as app_count,
  CASE 
    WHEN u.plan = 'FREE' THEN 1
    WHEN u.plan = 'PRO' THEN 10
    WHEN u.plan = 'AGENCY' THEN -1
  END as app_limit
FROM "User" u
LEFT JOIN "AppProject" a ON a."userId" = u.id
WHERE u.email = 'admin@appnexu.com'
GROUP BY u.id;
