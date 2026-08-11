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

module.exports = { getCollectionName };
