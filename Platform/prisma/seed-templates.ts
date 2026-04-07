/**
 * Seed script for App Templates.
 * Run: npx tsx prisma/seed-templates.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  // ─────────────────────────────────────────────────
  // BUSINESS (4 plantillas)
  // ─────────────────────────────────────────────────
  {
    name: 'Negocio Local',
    slug: 'negocio-local',
    description: 'Plantilla versátil para negocios locales. Incluye navegación estándar, acciones de contacto y un esquema de colores profesional.',
    category: 'BUSINESS' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Nosotros', icon: 'info', path: '/nosotros' },
        { label: 'Servicios', icon: 'briefcase', path: '/servicios' },
        { label: 'Blog', icon: 'file-text', path: '/blog' },
        { label: 'Contacto', icon: 'mail', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Llamar', icon: 'phone', action: 'tel:' },
        { label: 'Email', icon: 'mail', action: 'mailto:' },
        { label: 'Ubicación', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['globe', 'layout', 'monitor'],
      colorScheme: { primary: '#4F46E5', secondary: '#7C3AED' },
      pageShortcuts: ['/', '/nosotros', '/contacto'],
    },
  },
  {
    name: 'Tienda Online',
    slug: 'tienda-online',
    description: 'Diseñada para tiendas en línea. Incluye catálogo de productos, carrito de compras y esquema de colores optimizado para conversión.',
    category: 'BUSINESS' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Tienda', icon: 'shopping-bag', path: '/tienda' },
        { label: 'Categorías', icon: 'grid', path: '/categorias' },
        { label: 'Ofertas', icon: 'tag', path: '/ofertas' },
        { label: 'Carrito', icon: 'shopping-cart', path: '/carrito' },
        { label: 'Mi Cuenta', icon: 'user', path: '/cuenta' },
      ],
      quickActions: [
        { label: 'Ver Carrito', icon: 'shopping-cart', action: 'cart' },
        { label: 'Rastrear Pedido', icon: 'package', action: 'track' },
        { label: 'Lista de Deseos', icon: 'heart', action: 'wishlist' },
        { label: 'Soporte', icon: 'headphones', action: 'support' },
      ],
      iconSuggestions: ['shopping-bag', 'store', 'package'],
      colorScheme: { primary: '#059669', secondary: '#10B981' },
      pageShortcuts: ['/', '/tienda', '/carrito', '/ofertas'],
    },
  },
  {
    name: 'Agencia Digital',
    slug: 'agencia-digital',
    description: 'Ideal para agencias de marketing, diseño o desarrollo. Incluye portafolio, servicios y formulario de contacto profesional.',
    category: 'BUSINESS' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Servicios', icon: 'briefcase', path: '/servicios' },
        { label: 'Portafolio', icon: 'image', path: '/portafolio' },
        { label: 'Equipo', icon: 'users', path: '/equipo' },
        { label: 'Blog', icon: 'file-text', path: '/blog' },
        { label: 'Contacto', icon: 'mail', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Cotización', icon: 'file-text', action: 'quote' },
        { label: 'WhatsApp', icon: 'message-circle', action: 'whatsapp' },
        { label: 'Llamar', icon: 'phone', action: 'tel:' },
        { label: 'Agendar Cita', icon: 'calendar', action: 'book' },
      ],
      iconSuggestions: ['monitor', 'code', 'palette'],
      colorScheme: { primary: '#6366F1', secondary: '#8B5CF6' },
      pageShortcuts: ['/', '/servicios', '/portafolio'],
    },
  },
  {
    name: 'Inmobiliaria',
    slug: 'inmobiliaria',
    description: 'Perfecta para agencias inmobiliarias. Incluye listado de propiedades, búsqueda avanzada y contacto directo con agentes.',
    category: 'BUSINESS' as const,
    isPremium: true,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Propiedades', icon: 'building', path: '/propiedades' },
        { label: 'Venta', icon: 'tag', path: '/venta' },
        { label: 'Renta', icon: 'key', path: '/renta' },
        { label: 'Agentes', icon: 'users', path: '/agentes' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Buscar Propiedad', icon: 'search', action: 'search' },
        { label: 'Agendar Visita', icon: 'calendar', action: 'book' },
        { label: 'WhatsApp', icon: 'message-circle', action: 'whatsapp' },
        { label: 'Llamar', icon: 'phone', action: 'tel:' },
      ],
      iconSuggestions: ['building', 'home', 'key'],
      colorScheme: { primary: '#0D9488', secondary: '#14B8A6' },
      pageShortcuts: ['/', '/propiedades', '/venta', '/renta'],
    },
  },

  // ─────────────────────────────────────────────────
  // CHURCH / IGLESIA (3 plantillas)
  // ─────────────────────────────────────────────────
  {
    name: 'Iglesia Básica',
    slug: 'iglesia-basica',
    description: 'Diseñada para iglesias y organizaciones religiosas. Incluye sermones, eventos, donaciones y colores cálidos.',
    category: 'CHURCH' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Sermones', icon: 'book-open', path: '/sermones' },
        { label: 'Eventos', icon: 'calendar', path: '/eventos' },
        { label: 'Ministerios', icon: 'users', path: '/ministerios' },
        { label: 'Ofrendar', icon: 'heart', path: '/ofrendar' },
        { label: 'Contacto', icon: 'mail', path: '/contacto' },
      ],
      quickActions: [
        { label: 'En Vivo', icon: 'video', action: 'livestream' },
        { label: 'Donar', icon: 'heart', action: 'donate' },
        { label: 'Oración', icon: 'message-circle', action: 'prayer' },
        { label: 'Ubicación', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['church', 'book', 'heart'],
      colorScheme: { primary: '#7C3AED', secondary: '#A78BFA' },
      pageShortcuts: ['/', '/sermones', '/eventos', '/ofrendar'],
    },
  },
  {
    name: 'Iglesia Moderna',
    slug: 'iglesia-moderna',
    description: 'Para iglesias con presencia digital activa. Incluye transmisiones en vivo, podcast, grupos pequeños y donaciones en línea.',
    category: 'CHURCH' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'En Vivo', icon: 'video', path: '/en-vivo' },
        { label: 'Podcast', icon: 'headphones', path: '/podcast' },
        { label: 'Grupos', icon: 'users', path: '/grupos' },
        { label: 'Eventos', icon: 'calendar', path: '/eventos' },
        { label: 'Dar', icon: 'heart', path: '/dar' },
      ],
      quickActions: [
        { label: 'Ver en Vivo', icon: 'video', action: 'livestream' },
        { label: 'Escuchar Podcast', icon: 'headphones', action: 'podcast' },
        { label: 'Unirse a Grupo', icon: 'users', action: 'groups' },
        { label: 'Donar', icon: 'heart', action: 'donate' },
      ],
      iconSuggestions: ['video', 'headphones', 'heart'],
      colorScheme: { primary: '#1E40AF', secondary: '#3B82F6' },
      pageShortcuts: ['/', '/en-vivo', '/podcast', '/dar'],
    },
  },
  {
    name: 'Ministerio Juvenil',
    slug: 'ministerio-juvenil',
    description: 'Especial para ministerios juveniles. Diseño vibrante con eventos, devocionales, registro de actividades y redes sociales.',
    category: 'CHURCH' as const,
    isPremium: true,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Devocionales', icon: 'book-open', path: '/devocionales' },
        { label: 'Eventos', icon: 'calendar', path: '/eventos' },
        { label: 'Galería', icon: 'image', path: '/galeria' },
        { label: 'Únete', icon: 'user-plus', path: '/registro' },
        { label: 'Contacto', icon: 'mail', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Próximo Evento', icon: 'calendar', action: 'next-event' },
        { label: 'Instagram', icon: 'camera', action: 'instagram' },
        { label: 'Registrarse', icon: 'user-plus', action: 'register' },
        { label: 'Contacto', icon: 'message-circle', action: 'contact' },
      ],
      iconSuggestions: ['zap', 'star', 'music'],
      colorScheme: { primary: '#EC4899', secondary: '#F472B6' },
      pageShortcuts: ['/', '/devocionales', '/eventos', '/registro'],
    },
  },

  // ─────────────────────────────────────────────────
  // FOOD / COMIDA (4 plantillas)
  // ─────────────────────────────────────────────────
  {
    name: 'Restaurante',
    slug: 'restaurante',
    description: 'Perfecta para restaurantes. Incluye menú digital, reservaciones, galería de platos y sistema de pedidos.',
    category: 'FOOD' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Menú', icon: 'utensils', path: '/menu' },
        { label: 'Reservar', icon: 'calendar', path: '/reservar' },
        { label: 'Galería', icon: 'image', path: '/galeria' },
        { label: 'Reseñas', icon: 'star', path: '/resenas' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Reservar Mesa', icon: 'calendar', action: 'reserve' },
        { label: 'Pedir en Línea', icon: 'shopping-bag', action: 'order' },
        { label: 'Llamar', icon: 'phone', action: 'tel:' },
        { label: 'Ubicación', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['utensils', 'coffee', 'chef-hat'],
      colorScheme: { primary: '#DC2626', secondary: '#F59E0B' },
      pageShortcuts: ['/', '/menu', '/reservar'],
    },
  },
  {
    name: 'Cafetería',
    slug: 'cafeteria',
    description: 'Ideal para cafeterías y coffee shops. Menú de bebidas, horarios, programa de lealtad y ambiente acogedor.',
    category: 'FOOD' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Menú', icon: 'coffee', path: '/menu' },
        { label: 'Especialidades', icon: 'star', path: '/especialidades' },
        { label: 'Horarios', icon: 'clock', path: '/horarios' },
        { label: 'Lealtad', icon: 'award', path: '/lealtad' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Pedir Ahora', icon: 'coffee', action: 'order' },
        { label: 'Programa de Lealtad', icon: 'award', action: 'loyalty' },
        { label: 'Llamar', icon: 'phone', action: 'tel:' },
        { label: 'Ubicación', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['coffee', 'cup-soda', 'cake'],
      colorScheme: { primary: '#92400E', secondary: '#D97706' },
      pageShortcuts: ['/', '/menu', '/especialidades'],
    },
  },
  {
    name: 'Delivery de Comida',
    slug: 'delivery-comida',
    description: 'Para negocios de delivery y comida a domicilio. Incluye menú, rastreo de pedidos, zonas de entrega y pagos en línea.',
    category: 'FOOD' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Menú', icon: 'utensils', path: '/menu' },
        { label: 'Pedir', icon: 'shopping-cart', path: '/pedir' },
        { label: 'Rastrear', icon: 'map', path: '/rastrear' },
        { label: 'Promos', icon: 'tag', path: '/promos' },
        { label: 'Mi Cuenta', icon: 'user', path: '/cuenta' },
      ],
      quickActions: [
        { label: 'Pedir Ahora', icon: 'shopping-cart', action: 'order' },
        { label: 'Rastrear Pedido', icon: 'map', action: 'track' },
        { label: 'WhatsApp', icon: 'message-circle', action: 'whatsapp' },
        { label: 'Llamar', icon: 'phone', action: 'tel:' },
      ],
      iconSuggestions: ['truck', 'package', 'clock'],
      colorScheme: { primary: '#E11D48', secondary: '#FB7185' },
      pageShortcuts: ['/', '/menu', '/pedir', '/rastrear'],
    },
  },
  {
    name: 'Panadería y Repostería',
    slug: 'panaderia-reposteria',
    description: 'Para panaderías y pastelerías. Catálogo de productos, pedidos personalizados, galería y horarios de atención.',
    category: 'FOOD' as const,
    isPremium: true,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Productos', icon: 'cake', path: '/productos' },
        { label: 'Pedidos Especiales', icon: 'gift', path: '/pedidos-especiales' },
        { label: 'Galería', icon: 'image', path: '/galeria' },
        { label: 'Horarios', icon: 'clock', path: '/horarios' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Hacer Pedido', icon: 'shopping-bag', action: 'order' },
        { label: 'Pedido Especial', icon: 'gift', action: 'custom-order' },
        { label: 'WhatsApp', icon: 'message-circle', action: 'whatsapp' },
        { label: 'Ubicación', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['cake', 'cookie', 'croissant'],
      colorScheme: { primary: '#BE185D', secondary: '#EC4899' },
      pageShortcuts: ['/', '/productos', '/pedidos-especiales'],
    },
  },

  // ─────────────────────────────────────────────────
  // HEALTH / SALUD (4 plantillas)
  // ─────────────────────────────────────────────────
  {
    name: 'Clínica Médica',
    slug: 'clinica-medica',
    description: 'Para clínicas y consultorios médicos. Incluye citas en línea, directorio de doctores, servicios y portal de pacientes.',
    category: 'HEALTH' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Servicios', icon: 'stethoscope', path: '/servicios' },
        { label: 'Doctores', icon: 'users', path: '/doctores' },
        { label: 'Citas', icon: 'calendar', path: '/citas' },
        { label: 'Portal Paciente', icon: 'shield', path: '/portal' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Agendar Cita', icon: 'calendar-plus', action: 'book' },
        { label: 'Emergencia', icon: 'phone', action: 'tel:911' },
        { label: 'Portal Paciente', icon: 'shield', action: 'portal' },
        { label: 'Ubicación', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['heart-pulse', 'stethoscope', 'plus-circle'],
      colorScheme: { primary: '#0891B2', secondary: '#06B6D4' },
      pageShortcuts: ['/', '/servicios', '/citas'],
    },
  },
  {
    name: 'Gimnasio y Fitness',
    slug: 'gimnasio-fitness',
    description: 'Para gimnasios y centros de fitness. Clases, membresías, horarios, entrenadores y seguimiento de progreso.',
    category: 'HEALTH' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Clases', icon: 'activity', path: '/clases' },
        { label: 'Membresías', icon: 'credit-card', path: '/membresias' },
        { label: 'Horarios', icon: 'clock', path: '/horarios' },
        { label: 'Entrenadores', icon: 'users', path: '/entrenadores' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Clase de Prueba', icon: 'zap', action: 'trial' },
        { label: 'Ver Horarios', icon: 'clock', action: 'schedule' },
        { label: 'Inscribirse', icon: 'user-plus', action: 'signup' },
        { label: 'Llamar', icon: 'phone', action: 'tel:' },
      ],
      iconSuggestions: ['dumbbell', 'heart-pulse', 'trophy'],
      colorScheme: { primary: '#EA580C', secondary: '#F97316' },
      pageShortcuts: ['/', '/clases', '/membresias', '/horarios'],
    },
  },
  {
    name: 'Centro de Bienestar',
    slug: 'centro-bienestar',
    description: 'Para spas, centros de bienestar y terapias alternativas. Tratamientos, reservas, paquetes y ambiente relajante.',
    category: 'HEALTH' as const,
    isPremium: true,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Tratamientos', icon: 'sparkles', path: '/tratamientos' },
        { label: 'Paquetes', icon: 'gift', path: '/paquetes' },
        { label: 'Reservar', icon: 'calendar', path: '/reservar' },
        { label: 'Terapeutas', icon: 'users', path: '/terapeutas' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Reservar Cita', icon: 'calendar', action: 'book' },
        { label: 'Ver Paquetes', icon: 'gift', action: 'packages' },
        { label: 'WhatsApp', icon: 'message-circle', action: 'whatsapp' },
        { label: 'Ubicación', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['leaf', 'sun', 'heart'],
      colorScheme: { primary: '#059669', secondary: '#34D399' },
      pageShortcuts: ['/', '/tratamientos', '/paquetes', '/reservar'],
    },
  },
  {
    name: 'Consultorio Dental',
    slug: 'consultorio-dental',
    description: 'Para dentistas y clínicas dentales. Servicios dentales, citas, doctores, seguros aceptados y emergencias.',
    category: 'HEALTH' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Servicios', icon: 'smile', path: '/servicios' },
        { label: 'Doctores', icon: 'users', path: '/doctores' },
        { label: 'Citas', icon: 'calendar', path: '/citas' },
        { label: 'Seguros', icon: 'shield', path: '/seguros' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Agendar Cita', icon: 'calendar', action: 'book' },
        { label: 'Emergencia Dental', icon: 'alert-circle', action: 'emergency' },
        { label: 'Llamar', icon: 'phone', action: 'tel:' },
        { label: 'Ubicación', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['smile', 'shield', 'star'],
      colorScheme: { primary: '#2563EB', secondary: '#60A5FA' },
      pageShortcuts: ['/', '/servicios', '/citas'],
    },
  },

  // ─────────────────────────────────────────────────
  // EDUCATION / EDUCACIÓN (4 plantillas)
  // ─────────────────────────────────────────────────
  {
    name: 'Cursos en Línea',
    slug: 'cursos-en-linea',
    description: 'Ideal para plataformas educativas y cursos online. Catálogo de cursos, progreso del estudiante y certificados.',
    category: 'EDUCATION' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Cursos', icon: 'book-open', path: '/cursos' },
        { label: 'Mi Aprendizaje', icon: 'graduation-cap', path: '/mi-aprendizaje' },
        { label: 'Recursos', icon: 'file-text', path: '/recursos' },
        { label: 'Comunidad', icon: 'users', path: '/comunidad' },
        { label: 'Perfil', icon: 'user', path: '/perfil' },
      ],
      quickActions: [
        { label: 'Continuar Curso', icon: 'play', action: 'continue' },
        { label: 'Explorar Cursos', icon: 'search', action: 'browse' },
        { label: 'Certificados', icon: 'award', action: 'certificates' },
        { label: 'Ayuda', icon: 'help-circle', action: 'help' },
      ],
      iconSuggestions: ['graduation-cap', 'book-open', 'award'],
      colorScheme: { primary: '#2563EB', secondary: '#3B82F6' },
      pageShortcuts: ['/', '/cursos', '/mi-aprendizaje'],
    },
  },
  {
    name: 'Escuela o Colegio',
    slug: 'escuela-colegio',
    description: 'Para escuelas, colegios e instituciones educativas. Portal de padres, calendario escolar, noticias y admisiones.',
    category: 'EDUCATION' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Admisiones', icon: 'user-plus', path: '/admisiones' },
        { label: 'Académico', icon: 'book', path: '/academico' },
        { label: 'Calendario', icon: 'calendar', path: '/calendario' },
        { label: 'Noticias', icon: 'newspaper', path: '/noticias' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Solicitar Admisión', icon: 'user-plus', action: 'apply' },
        { label: 'Portal de Padres', icon: 'shield', action: 'portal' },
        { label: 'Calendario', icon: 'calendar', action: 'calendar' },
        { label: 'Llamar', icon: 'phone', action: 'tel:' },
      ],
      iconSuggestions: ['school', 'book-open', 'users'],
      colorScheme: { primary: '#1D4ED8', secondary: '#60A5FA' },
      pageShortcuts: ['/', '/admisiones', '/academico', '/calendario'],
    },
  },
  {
    name: 'Academia de Idiomas',
    slug: 'academia-idiomas',
    description: 'Para academias de idiomas y centros de capacitación. Cursos por nivel, inscripciones, horarios y profesores.',
    category: 'EDUCATION' as const,
    isPremium: true,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Idiomas', icon: 'globe', path: '/idiomas' },
        { label: 'Niveles', icon: 'bar-chart', path: '/niveles' },
        { label: 'Inscripción', icon: 'user-plus', path: '/inscripcion' },
        { label: 'Profesores', icon: 'users', path: '/profesores' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Prueba de Nivel', icon: 'clipboard', action: 'test' },
        { label: 'Inscribirse', icon: 'user-plus', action: 'signup' },
        { label: 'Horarios', icon: 'clock', action: 'schedule' },
        { label: 'WhatsApp', icon: 'message-circle', action: 'whatsapp' },
      ],
      iconSuggestions: ['globe', 'languages', 'award'],
      colorScheme: { primary: '#7C3AED', secondary: '#A78BFA' },
      pageShortcuts: ['/', '/idiomas', '/inscripcion'],
    },
  },
  {
    name: 'Centro de Tutorías',
    slug: 'centro-tutorias',
    description: 'Para centros de tutorías y clases particulares. Materias, tutores disponibles, reserva de sesiones y seguimiento.',
    category: 'EDUCATION' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Materias', icon: 'book-open', path: '/materias' },
        { label: 'Tutores', icon: 'users', path: '/tutores' },
        { label: 'Agendar', icon: 'calendar', path: '/agendar' },
        { label: 'Precios', icon: 'tag', path: '/precios' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Clase de Prueba', icon: 'play', action: 'trial' },
        { label: 'Buscar Tutor', icon: 'search', action: 'search' },
        { label: 'Agendar Sesión', icon: 'calendar', action: 'book' },
        { label: 'Llamar', icon: 'phone', action: 'tel:' },
      ],
      iconSuggestions: ['pen-tool', 'book', 'lightbulb'],
      colorScheme: { primary: '#0EA5E9', secondary: '#38BDF8' },
      pageShortcuts: ['/', '/materias', '/tutores', '/agendar'],
    },
  },

  // ─────────────────────────────────────────────────
  // SERVICES / SERVICIOS (4 plantillas)
  // ─────────────────────────────────────────────────
  {
    name: 'Servicios Profesionales',
    slug: 'servicios-profesionales',
    description: 'Para negocios de servicios con reservas. Catálogo de servicios, agenda en línea, precios y reseñas de clientes.',
    category: 'SERVICES' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Servicios', icon: 'briefcase', path: '/servicios' },
        { label: 'Reservar', icon: 'calendar', path: '/reservar' },
        { label: 'Precios', icon: 'tag', path: '/precios' },
        { label: 'Reseñas', icon: 'star', path: '/resenas' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Reservar Ahora', icon: 'calendar-plus', action: 'book' },
        { label: 'Llamar', icon: 'phone', action: 'tel:' },
        { label: 'WhatsApp', icon: 'message-circle', action: 'whatsapp' },
        { label: 'Ubicación', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['calendar', 'briefcase', 'clock'],
      colorScheme: { primary: '#D97706', secondary: '#F59E0B' },
      pageShortcuts: ['/', '/servicios', '/reservar', '/precios'],
    },
  },
  {
    name: 'Salón de Belleza',
    slug: 'salon-belleza',
    description: 'Para salones de belleza, peluquerías y barberías. Servicios, precios, citas en línea y portafolio de trabajos.',
    category: 'SERVICES' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Servicios', icon: 'scissors', path: '/servicios' },
        { label: 'Estilistas', icon: 'users', path: '/estilistas' },
        { label: 'Galería', icon: 'image', path: '/galeria' },
        { label: 'Citas', icon: 'calendar', path: '/citas' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Reservar Cita', icon: 'calendar', action: 'book' },
        { label: 'Ver Galería', icon: 'image', action: 'gallery' },
        { label: 'WhatsApp', icon: 'message-circle', action: 'whatsapp' },
        { label: 'Llamar', icon: 'phone', action: 'tel:' },
      ],
      iconSuggestions: ['scissors', 'sparkles', 'heart'],
      colorScheme: { primary: '#DB2777', secondary: '#F472B6' },
      pageShortcuts: ['/', '/servicios', '/galeria', '/citas'],
    },
  },
  {
    name: 'Taller Mecánico',
    slug: 'taller-mecanico',
    description: 'Para talleres mecánicos y de servicio automotriz. Servicios, citas, cotizaciones y seguimiento de reparaciones.',
    category: 'SERVICES' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Servicios', icon: 'wrench', path: '/servicios' },
        { label: 'Cotización', icon: 'file-text', path: '/cotizacion' },
        { label: 'Citas', icon: 'calendar', path: '/citas' },
        { label: 'Reseñas', icon: 'star', path: '/resenas' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Agendar Cita', icon: 'calendar', action: 'book' },
        { label: 'Cotización', icon: 'file-text', action: 'quote' },
        { label: 'Llamar', icon: 'phone', action: 'tel:' },
        { label: 'Ubicación', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['wrench', 'car', 'tool'],
      colorScheme: { primary: '#374151', secondary: '#6B7280' },
      pageShortcuts: ['/', '/servicios', '/cotizacion', '/citas'],
    },
  },
  {
    name: 'Servicios de Limpieza',
    slug: 'servicios-limpieza',
    description: 'Para empresas de limpieza y mantenimiento. Tipos de servicio, cotizaciones, paquetes y reserva en línea.',
    category: 'SERVICES' as const,
    isPremium: true,
    configJson: {
      navigation: [
        { label: 'Inicio', icon: 'home', path: '/' },
        { label: 'Servicios', icon: 'sparkles', path: '/servicios' },
        { label: 'Paquetes', icon: 'package', path: '/paquetes' },
        { label: 'Cotizar', icon: 'calculator', path: '/cotizar' },
        { label: 'Reseñas', icon: 'star', path: '/resenas' },
        { label: 'Contacto', icon: 'phone', path: '/contacto' },
      ],
      quickActions: [
        { label: 'Cotizar Servicio', icon: 'calculator', action: 'quote' },
        { label: 'Reservar', icon: 'calendar', action: 'book' },
        { label: 'WhatsApp', icon: 'message-circle', action: 'whatsapp' },
        { label: 'Llamar', icon: 'phone', action: 'tel:' },
      ],
      iconSuggestions: ['sparkles', 'home', 'check-circle'],
      colorScheme: { primary: '#0D9488', secondary: '#2DD4BF' },
      pageShortcuts: ['/', '/servicios', '/paquetes', '/cotizar'],
    },
  },
];

async function main() {
  console.log('🌱 Seeding templates...');

  // First, deactivate old templates that won't be in the new set
  const newSlugs = templates.map(t => t.slug);
  await prisma.appTemplate.updateMany({
    where: { slug: { notIn: newSlugs } },
    data: { isActive: false },
  });
  console.log('  🔄 Deactivated old templates not in new set');

  for (const template of templates) {
    await prisma.appTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        description: template.description,
        category: template.category,
        isPremium: template.isPremium,
        configJson: template.configJson,
        isActive: true,
      },
      create: { ...template, isActive: true },
    });
    console.log(`  ✓ ${template.name} (${template.slug}) — ${template.category}`);
  }

  const count = await prisma.appTemplate.count({ where: { isActive: true } });
  console.log(`\n✅ ${count} plantillas activas en total!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
