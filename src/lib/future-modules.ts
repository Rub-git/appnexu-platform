export type FutureModuleKey =
  | 'push_notifications'
  | 'advanced_analytics'
  | 'install_tracking'
  | 'apk_export_v2'
  | 'offline_cache_settings'
  | 'versioning_updates'
  | 'team_accounts'
  | 'billing_limits';

export type FutureModule = {
  key: FutureModuleKey;
  title: string;
  description: string;
  category: 'engagement' | 'growth' | 'operations';
};

export const FUTURE_SAAS_MODULES: FutureModule[] = [
  {
    key: 'push_notifications',
    title: 'Push Notifications',
    description: 'Mensajeria para reactivar usuarios e impulsar conversion.',
    category: 'engagement',
  },
  {
    key: 'advanced_analytics',
    title: 'Analytics Avanzadas',
    description: 'Embudo, cohortes y retencion por fuente de trafico.',
    category: 'growth',
  },
  {
    key: 'install_tracking',
    title: 'Tracking de Instalaciones',
    description: 'Monitoreo de instalaciones por dispositivo y canal.',
    category: 'growth',
  },
  {
    key: 'apk_export_v2',
    title: 'Export APK Pro',
    description: 'Pipeline robusto de export y firma automatizada.',
    category: 'operations',
  },
  {
    key: 'offline_cache_settings',
    title: 'Control de Cache Offline',
    description: 'Politicas personalizadas de cache y actualizacion.',
    category: 'operations',
  },
  {
    key: 'versioning_updates',
    title: 'Versionado y Updates',
    description: 'Historial de versiones con rollback seguro.',
    category: 'operations',
  },
  {
    key: 'team_accounts',
    title: 'Team Accounts',
    description: 'Colaboracion multi-usuario con roles y permisos.',
    category: 'operations',
  },
  {
    key: 'billing_limits',
    title: 'Planes y Limites',
    description: 'Control de cuota por plan y facturacion escalable.',
    category: 'growth',
  },
];
