/**
 * Seed script for App Templates.
 * Run: npx tsx prisma/seed-templates.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  {
    name: 'Generic Website',
    slug: 'generic-website',
    description: 'A versatile template for any website. Includes standard navigation, contact actions, and a clean color scheme.',
    category: 'BUSINESS' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Home', icon: 'home', path: '/' },
        { label: 'About', icon: 'info', path: '/about' },
        { label: 'Services', icon: 'briefcase', path: '/services' },
        { label: 'Blog', icon: 'file-text', path: '/blog' },
        { label: 'Contact', icon: 'mail', path: '/contact' },
      ],
      quickActions: [
        { label: 'Call Us', icon: 'phone', action: 'tel:' },
        { label: 'Email', icon: 'mail', action: 'mailto:' },
        { label: 'Directions', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['globe', 'layout', 'monitor'],
      colorScheme: { primary: '#4F46E5', secondary: '#7C3AED' },
      pageShortcuts: ['/', '/about', '/contact'],
    },
  },
  {
    name: 'Church',
    slug: 'church',
    description: 'Designed for churches and religious organizations. Includes sermon navigation, events, donation actions, and warm colors.',
    category: 'CHURCH' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Home', icon: 'home', path: '/' },
        { label: 'Sermons', icon: 'book-open', path: '/sermons' },
        { label: 'Events', icon: 'calendar', path: '/events' },
        { label: 'Ministries', icon: 'users', path: '/ministries' },
        { label: 'Give', icon: 'heart', path: '/give' },
        { label: 'Contact', icon: 'mail', path: '/contact' },
      ],
      quickActions: [
        { label: 'Watch Live', icon: 'video', action: 'livestream' },
        { label: 'Donate', icon: 'heart', action: 'donate' },
        { label: 'Prayer Request', icon: 'message-circle', action: 'prayer' },
        { label: 'Directions', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['church', 'book', 'heart'],
      colorScheme: { primary: '#7C3AED', secondary: '#A78BFA' },
      pageShortcuts: ['/', '/sermons', '/events', '/give'],
    },
  },
  {
    name: 'Restaurant',
    slug: 'restaurant',
    description: 'Perfect for restaurants and food businesses. Includes menu navigation, reservation actions, and appetizing color scheme.',
    category: 'FOOD' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Home', icon: 'home', path: '/' },
        { label: 'Menu', icon: 'utensils', path: '/menu' },
        { label: 'Reservations', icon: 'calendar', path: '/reservations' },
        { label: 'Gallery', icon: 'image', path: '/gallery' },
        { label: 'Reviews', icon: 'star', path: '/reviews' },
        { label: 'Contact', icon: 'phone', path: '/contact' },
      ],
      quickActions: [
        { label: 'Reserve Table', icon: 'calendar', action: 'reserve' },
        { label: 'Order Online', icon: 'shopping-bag', action: 'order' },
        { label: 'Call', icon: 'phone', action: 'tel:' },
        { label: 'Directions', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['utensils', 'coffee', 'chef-hat'],
      colorScheme: { primary: '#DC2626', secondary: '#F59E0B' },
      pageShortcuts: ['/', '/menu', '/reservations'],
    },
  },
  {
    name: 'Clinic',
    slug: 'clinic',
    description: 'Tailored for medical clinics and healthcare providers. Includes appointment booking, services, and calming colors.',
    category: 'HEALTH' as const,
    isPremium: true,
    configJson: {
      navigation: [
        { label: 'Home', icon: 'home', path: '/' },
        { label: 'Services', icon: 'stethoscope', path: '/services' },
        { label: 'Doctors', icon: 'users', path: '/doctors' },
        { label: 'Appointments', icon: 'calendar', path: '/appointments' },
        { label: 'Patient Portal', icon: 'shield', path: '/portal' },
        { label: 'Contact', icon: 'phone', path: '/contact' },
      ],
      quickActions: [
        { label: 'Book Appointment', icon: 'calendar-plus', action: 'book' },
        { label: 'Emergency', icon: 'phone', action: 'tel:911' },
        { label: 'Patient Portal', icon: 'shield', action: 'portal' },
        { label: 'Directions', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['heart-pulse', 'stethoscope', 'plus-circle'],
      colorScheme: { primary: '#0891B2', secondary: '#06B6D4' },
      pageShortcuts: ['/', '/services', '/appointments'],
    },
  },
  {
    name: 'Ecommerce',
    slug: 'ecommerce',
    description: 'Built for online stores. Includes product catalog navigation, cart actions, and conversion-optimized color scheme.',
    category: 'BUSINESS' as const,
    isPremium: true,
    configJson: {
      navigation: [
        { label: 'Home', icon: 'home', path: '/' },
        { label: 'Shop', icon: 'shopping-bag', path: '/shop' },
        { label: 'Categories', icon: 'grid', path: '/categories' },
        { label: 'Deals', icon: 'tag', path: '/deals' },
        { label: 'Cart', icon: 'shopping-cart', path: '/cart' },
        { label: 'Account', icon: 'user', path: '/account' },
      ],
      quickActions: [
        { label: 'View Cart', icon: 'shopping-cart', action: 'cart' },
        { label: 'Track Order', icon: 'package', action: 'track' },
        { label: 'Wishlist', icon: 'heart', action: 'wishlist' },
        { label: 'Support', icon: 'headphones', action: 'support' },
      ],
      iconSuggestions: ['shopping-bag', 'store', 'package'],
      colorScheme: { primary: '#059669', secondary: '#10B981' },
      pageShortcuts: ['/', '/shop', '/cart', '/deals'],
    },
  },
  {
    name: 'Course / Education',
    slug: 'course-education',
    description: 'Ideal for educational platforms and online courses. Includes lesson navigation, progress tracking, and academic colors.',
    category: 'EDUCATION' as const,
    isPremium: true,
    configJson: {
      navigation: [
        { label: 'Home', icon: 'home', path: '/' },
        { label: 'Courses', icon: 'book-open', path: '/courses' },
        { label: 'My Learning', icon: 'graduation-cap', path: '/my-learning' },
        { label: 'Resources', icon: 'file-text', path: '/resources' },
        { label: 'Community', icon: 'users', path: '/community' },
        { label: 'Profile', icon: 'user', path: '/profile' },
      ],
      quickActions: [
        { label: 'Continue Learning', icon: 'play', action: 'continue' },
        { label: 'Browse Courses', icon: 'search', action: 'browse' },
        { label: 'Certificates', icon: 'award', action: 'certificates' },
        { label: 'Help', icon: 'help-circle', action: 'help' },
      ],
      iconSuggestions: ['graduation-cap', 'book-open', 'award'],
      colorScheme: { primary: '#2563EB', secondary: '#3B82F6' },
      pageShortcuts: ['/', '/courses', '/my-learning'],
    },
  },
  {
    name: 'Booking / Services',
    slug: 'booking-services',
    description: 'Great for service-based businesses with booking. Includes appointment scheduling, service catalog, and professional colors.',
    category: 'SERVICES' as const,
    isPremium: false,
    configJson: {
      navigation: [
        { label: 'Home', icon: 'home', path: '/' },
        { label: 'Services', icon: 'briefcase', path: '/services' },
        { label: 'Book Now', icon: 'calendar', path: '/book' },
        { label: 'Pricing', icon: 'tag', path: '/pricing' },
        { label: 'Reviews', icon: 'star', path: '/reviews' },
        { label: 'Contact', icon: 'phone', path: '/contact' },
      ],
      quickActions: [
        { label: 'Book Now', icon: 'calendar-plus', action: 'book' },
        { label: 'Call', icon: 'phone', action: 'tel:' },
        { label: 'WhatsApp', icon: 'message-circle', action: 'whatsapp' },
        { label: 'Directions', icon: 'map-pin', action: 'maps:' },
      ],
      iconSuggestions: ['calendar', 'briefcase', 'clock'],
      colorScheme: { primary: '#D97706', secondary: '#F59E0B' },
      pageShortcuts: ['/', '/services', '/book', '/pricing'],
    },
  },
];

async function main() {
  console.log('🌱 Seeding templates...');

  for (const template of templates) {
    await prisma.appTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        description: template.description,
        category: template.category,
        isPremium: template.isPremium,
        configJson: template.configJson,
      },
      create: template,
    });
    console.log(`  ✓ ${template.name} (${template.slug})`);
  }

  console.log('✅ Templates seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
