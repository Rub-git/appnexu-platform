# QA Checklist - Instalacion PWA Appnexu

Fecha base: 2026-04-22
Objetivo: validar que una app generada por Appnexu se instala como PWA real en desktop y mobile, con icono correcto, apertura directa al sitio objetivo y comportamiento standalone.

## 1. Datos de prueba

- Sitio objetivo principal: https://adelantobilingualsdachurch.com
- Navegadores:
  - Desktop: Chrome estable (ultima version)
  - Android: Chrome estable (ultima version)
  - iOS: Safari estable (ultima version)
- Entorno Appnexu:
  - URL plataforma: ____________________
  - Build/commit: ____________________
  - Tester: ____________________

## 2. Preparacion inicial

1. Crear una app nueva apuntando a https://adelantobilingualsdachurch.com.
2. Publicar la app en Appnexu.
3. Abrir la URL publica de la app generada.
4. Verificar HTTPS activo y sin errores de certificado.

Criterio de aceptacion:
- La app esta en estado PUBLISHED y la URL publica responde 200.

## 3. Validacion de Manifest (Chrome Desktop)

Ruta esperada del manifest por app:
- /pwa/{appId}/manifest.json

Pasos:
1. Abrir la URL publica en Chrome.
2. Abrir DevTools > Application > Manifest.
3. Confirmar que el manifest cargado sea el de la app especifica.
4. Validar campos obligatorios:
   - name
   - short_name
   - id
   - start_url
   - scope
   - display = standalone
   - background_color
   - theme_color
   - icons
5. Validar que start_url no apunte a pagina de install/preview.
6. Validar que scope sea de la app (no global) y mantenga la navegacion en modo app.

Criterio de aceptacion:
- No hay errores de parseo del manifest.
- display es standalone.
- start_url abre la app real (wrapper/launch) y no la pagina promocional.

## 4. Validacion de iconos

Pasos:
1. En DevTools > Application > Manifest, revisar bloque icons.
2. Confirmar existencia de iconos PNG 192x192 y 512x512.
3. Confirmar purpose incluye any maskable cuando aplique.
4. En Network, abrir cada icons.src y validar HTTP 200.
5. Instalar y verificar visualmente el icono final en:
   - Desktop (launcher/apps)
   - Android home screen
6. Si no hay icono del sitio original, validar fallback visual de marca (no solo letra aislada).

Criterio de aceptacion:
- Ambos tamanos (192 y 512) cargan correctamente.
- No hay icon download errors.
- El icono instalado es consistente con la marca de la app.

## 5. Validacion de Service Worker

Pasos:
1. DevTools > Application > Service Workers.
2. Confirmar SW registrado para la app y con scope correcto por app.
3. Confirmar que el SW este activo (activated/running).
4. Revisar consola por errores de registro o runtime.
5. Verificar que fetch handler no rompa navegacion:
   - Navegar dentro de la app instalada
   - Refrescar la app
6. Confirmar que no intercepte rutas fuera del scope de la app.

Criterio de aceptacion:
- Sin service worker registration errors.
- Navegacion funcional y estable.
- Sin interferencia en rutas externas al scope.

## 6. Flujo de instalacion (UX)

### 6.1 Chrome Desktop

Pasos:
1. En URL publica, activar instalacion con boton Install o icono del navegador.
2. Completar instalacion.
3. Abrir app desde acceso instalado (no desde tab web).
4. Confirmar apertura en ventana tipo app (standalone).
5. Confirmar que abre start_url de la app y NO pagina intermedia de download/install.

Criterio de aceptacion:
- Installability sin errores.
- App instalada abre directo el website objetivo en modo app.

### 6.2 Android

Pasos:
1. Abrir URL publica en Chrome Android.
2. Instalar via prompt (beforeinstallprompt) o menu Add to Home Screen/Install app.
3. Confirmar icono correcto en pantalla de inicio.
4. Abrir desde icono.
5. Confirmar modo standalone y contenido de app correcto.
6. Confirmar que no regresa a preview/install.

Criterio de aceptacion:
- Instalable y funcional desde icono home.
- Sin salto a pagina promocional despues de instalada.

### 6.3 iOS Safari

Pasos:
1. Abrir URL publica en Safari iOS.
2. Usar Share > Add to Home Screen.
3. Abrir desde icono creado.
4. Confirmar comportamiento de app (sin chrome del navegador cuando aplique).

Criterio de aceptacion:
- Flujo manual funciona con instrucciones claras.
- Abre contenido correcto de la app.

## 7. beforeinstallprompt y fallback

Pasos:
1. Verificar en Chrome que el evento beforeinstallprompt se captura.
2. Click en Install y confirmar que se llama prompt() correctamente.
3. Validar estados:
   - accepted
   - dismissed
4. En navegadores sin prompt automatico, validar instrucciones por plataforma:
   - Android
   - iOS
   - Desktop

Criterio de aceptacion:
- Boton Install funciona donde existe prompt.
- Fallback muestra instrucciones reales y utiles.

## 8. Debug tecnico obligatorio

Recolectar evidencia:
1. Consola:
   - manifest parse errors
   - icon download errors
   - service worker registration errors
   - installability criteria not met
2. Application panel:
   - Manifest validado
   - SW activo
3. Network:
   - manifest.json 200
   - icon-192 200
   - icon-512 200

Criterio de aceptacion:
- Cero errores bloqueantes de instalabilidad.
- Evidencias capturadas (screenshots o export de logs).

## 9. Casos negativos

1. Iconos externos no disponibles (404): debe existir fallback instalable.
2. Sitio objetivo lento: instalacion sigue disponible si criterios se cumplen.
3. App en estado no publicado: no debe instalarse como app publica final.
4. Cambio de iconos/theme: nueva instalacion refleja cambios esperados.

## 10. Criterios de aprobacion final (Go/No-Go)

Go si se cumple todo:
1. Instala en Desktop Chrome y Android Chrome.
2. Icono correcto en ambos.
3. Abre en modo standalone.
4. Abre directo al website objetivo (sin pagina intermedia).
5. Manifest y SW sin errores bloqueantes.
6. Evidencia QA completa adjunta.

No-Go si falla cualquiera:
1. App instalada vuelve a preview/install.
2. Icono incorrecto o faltan 192/512.
3. Installability errors en DevTools.
4. SW rompe navegacion o registra scope incorrecto.

## 11. Plantilla de reporte QA

- Build/commit:
- URL app probada:
- Plataforma probada:
- Resultado general: PASS / FAIL
- Hallazgos:
  - Hallazgo 1:
  - Hallazgo 2:
- Evidencias:
  - Screenshot Manifest:
  - Screenshot SW:
  - Video instalacion:
- Bloqueadores:
- Recomendacion final:
