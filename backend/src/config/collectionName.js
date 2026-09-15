/**
 * Única fuente de verdad para el nombre de la colección de tickets.
 *
 * Se define SOLO con la variable de entorno COLLECTION_NAME (.env en local,
 * dashboard de Render en producción). No hay nombres de colección
 * hardcodeados en el código: así, cambiar de evento / renombrar la colección
 * es solo cambiar esa variable, sin tocar ni desplegar código.
 *
 * Si la variable no está definida se lanza un error en el arranque en vez de
 * caer a un nombre por defecto: es preferible fallar fuerte y visible a leer
 * y escribir silenciosamente en una colección equivocada.
 */
const getCollectionName = () => {
  const nombre = (process.env.COLLECTION_NAME || '').trim();

  if (!nombre) {
    throw new Error(
      'Falta la variable de entorno COLLECTION_NAME (nombre de la colección de tickets en MongoDB). ' +
      'Defínela en backend/.env para desarrollo o en las variables de entorno del servicio en producción.'
    );
  }

  return nombre;
};

/**
 * Nombre de colección "por evento" para todo lo que NO deben compartir dos
 * eventos corriendo sobre el mismo MONGODB_URI (auditoría, puntos de venta,
 * configuración de impresión/colores, cola de impresión, sobres): se arma
 * agregando COLLECTION_NAME como sufijo al nombre base, así cada deploy
 * (cada uno con su propio COLLECTION_NAME) termina leyendo y escribiendo en
 * su propio juego de colecciones sin necesitar un MONGODB_URI aparte ni
 * ninguna variable de entorno nueva.
 *
 * Los usuarios (Usuarios/User) quedan afuera a propósito: se comparten entre
 * eventos (el mismo jefe/staff puede loguearse en cualquiera de los dos).
 */
const getEventCollectionName = (nombreBase) => `${nombreBase}_${getCollectionName()}`;

module.exports = { getCollectionName, getEventCollectionName };
