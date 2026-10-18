/**
 * Rutas de la API del profesional en el registro conductual (M-09, HU-16,
 * HU-18, HU-19), todas bajo /api/admin/registro: exigen la sesión del panel
 * con una cuenta de rol «profesional».
 */
export const RUTA_API_SESIONES = '/api/admin/registro/sesiones';
export const RUTA_API_EXPORTACION = '/api/admin/registro/exportacion';

export const rutaSesionWeb = (seudonimo) => `/registro/sesiones/${encodeURIComponent(seudonimo)}`;
