# 🔧 Guía de Configuración de Stripe para Appnexu

## Problema Actual
Los botones de upgrade muestran el error:
> "Price configuration missing for PRO plan. Please contact support."
> "Price configuration missing for AGENCY plan. Please contact support."

Esto ocurre porque faltan 2 variables de entorno en Vercel: los **Price IDs** de Stripe.

---

## Paso 1: Crear Productos y Precios en Stripe Dashboard

### 1.1 Accede a Stripe Dashboard
- Ve a [https://dashboard.stripe.com](https://dashboard.stripe.com)
- Asegúrate de estar en **modo Live** (no Test) si es producción, o **modo Test** para pruebas

### 1.2 Crear el producto PRO ($19/mes)
1. Ve a **Products** → **+ Add product**
2. Llena los campos:
   - **Name:** `Appnexu Pro`
   - **Description:** `Plan Pro - hasta 5 apps, custom domain, soporte prioritario`
3. En **Pricing**:
   - **Model:** Standard pricing
   - **Price:** `$19.00`
   - **Billing period:** `Monthly` (Recurring)
   - **Currency:** `USD`
4. Haz clic en **Save product**
5. 📋 **COPIA el Price ID** — tiene formato `price_1Abc123...` (haz clic en el precio para ver el ID)

### 1.3 Crear el producto AGENCY ($49/mes)
1. Ve a **Products** → **+ Add product**
2. Llena los campos:
   - **Name:** `Appnexu Agency`
   - **Description:** `Plan Agency - apps ilimitadas, custom domain, white label`
3. En **Pricing**:
   - **Model:** Standard pricing
   - **Price:** `$49.00`
   - **Billing period:** `Monthly` (Recurring)
   - **Currency:** `USD`
4. Haz clic en **Save product**
5. 📋 **COPIA el Price ID** — tiene formato `price_1Xyz789...`

---

## Paso 2: Configurar Variables de Entorno en Vercel

Ve a tu proyecto en [Vercel Dashboard](https://vercel.com) → **Settings** → **Environment Variables**

### Variables REQUERIDAS para Stripe:

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| `STRIPE_SECRET_KEY` | Tu clave secreta de Stripe | `sk_live_51Abc...` o `sk_test_51Abc...` |
| `STRIPE_PRO_PRICE_ID` | El Price ID del plan Pro | `price_1Abc123DefGhi456` |
| `STRIPE_AGENCY_PRICE_ID` | El Price ID del plan Agency | `price_1Xyz789AbcDef012` |

### Variables OPCIONALES (pero recomendadas):

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` o `pk_test_...` | Clave pública de Stripe |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Para procesar pagos automáticamente |

### Cómo agregar cada variable:
1. En Vercel, ve a **Settings** → **Environment Variables**
2. En **Key**, escribe el nombre exacto (ej: `STRIPE_PRO_PRICE_ID`)
3. En **Value**, pega el Price ID copiado de Stripe
4. Selecciona los entornos: ✅ Production, ✅ Preview, ✅ Development
5. Haz clic en **Save**

---

## Paso 3: Configurar Webhook (para procesar pagos)

### 3.1 Crear el Webhook en Stripe
1. En Stripe Dashboard → **Developers** → **Webhooks**
2. Haz clic en **+ Add endpoint**
3. **Endpoint URL:** `https://appnexu.com/api/stripe/webhook`
4. **Events to listen:** Selecciona:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Haz clic en **Add endpoint**
6. 📋 **COPIA el Signing Secret** (empieza con `whsec_...`)

### 3.2 Agregar el Webhook Secret en Vercel
- **Key:** `STRIPE_WEBHOOK_SECRET`
- **Value:** `whsec_...` (el que copiaste)

---

## Paso 4: Re-deploy

Después de agregar todas las variables:
1. Ve a tu proyecto en Vercel → **Deployments**
2. Haz clic en los 3 puntos del último deployment → **Redeploy**
3. Espera a que termine el deploy

---

## Paso 5: Verificar

1. Ve a `https://appnexu.com/es/settings`
2. Los botones de upgrade deberían funcionar sin errores
3. Al hacer clic, deberían redirigirte al checkout de Stripe

---

## Resumen de Variables Necesarias

```env
# Ya deberías tener estas:
STRIPE_SECRET_KEY=sk_live_... (o sk_test_...)

# ⚠️ ESTAS SON LAS QUE FALTAN (causan el error):
STRIPE_PRO_PRICE_ID=price_...     # Copiado del producto Pro en Stripe
STRIPE_AGENCY_PRICE_ID=price_...  # Copiado del producto Agency en Stripe

# Recomendado para webhooks:
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## ¿Dónde encontrar los Price IDs?

En Stripe Dashboard:
1. Ve a **Products**
2. Haz clic en el producto (ej: "Appnexu Pro")
3. En la sección de **Pricing**, verás el precio
4. Haz clic en el precio → el **API ID** es el Price ID (formato: `price_1Abc...`)

Si no encuentras el ID directamente, haz clic en el precio y busca el campo **API ID** en el panel lateral.
