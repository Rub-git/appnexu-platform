'use client';

export default function PricingPage() {
    const handleCheckout = async (priceId: string) => {
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceId }),
            });

            const data = await res.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error('No checkout URL returned');
            }
        } catch (error) {
            console.error('Checkout error:', error);
        }
    };

    return (
        <div className="px-6 py-20 max-w-6xl mx-auto text-center">

            <h1 className="text-4xl font-bold mb-4">
                Precios simples y transparentes
            </h1>

            <p className="text-gray-500 mb-12">
                Comienza gratis y escala a medida que creces
            </p>

            <div className="grid md:grid-cols-3 gap-6">

                {/* FREE */}
                <div className="border rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Gratis</h2>
                    <p className="text-3xl font-bold">$0</p>
                    <ul className="mt-4 space-y-2 text-sm text-gray-600">
                        <li>1 app</li>
                        <li>Funciones básicas</li>
                        <li>Soporte comunitario</li>
                    </ul>
                    <button className="mt-6 w-full bg-gray-900 text-white py-2 rounded-lg">
                        Comenzar
                    </button>
                </div>

                {/* PRO */}
                <div className="border-2 border-blue-500 rounded-xl p-6 shadow-lg relative">
                    <span className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl">
                        Más popular
                    </span>
                    <h2 className="text-xl font-semibold">Pro</h2>
                    <p className="text-3xl font-bold">$19/mes</p>
                    <ul className="mt-4 space-y-2 text-sm text-gray-600">
                        <li>5 apps</li>
                        <li>IA incluida</li>
                        <li>Exportación APK</li>
                        <li>Analíticas avanzadas</li>
                    </ul>
                    <button
                        onClick={() =>
                            handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!)
                        }
                        className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg"
                    >
                        Mejorar
                    </button>
                </div>

                {/* AGENCY */}
                <div className="border rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Agency</h2>
                    <p className="text-3xl font-bold">$49/mes</p>
                    <ul className="mt-4 space-y-2 text-sm text-gray-600">
                        <li>Apps ilimitadas</li>
                        <li>Marca blanca</li>
                        <li>Dominios personalizados</li>
                        <li>Soporte prioritario</li>
                    </ul>
                    <button
                        onClick={() =>
                            handleCheckout(process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID!)
                        }
                        className="mt-6 w-full bg-purple-600 text-white py-2 rounded-lg"
                    >
                        Mejorar
                    </button>
                </div>

            </div>
        </div>
    )
}
