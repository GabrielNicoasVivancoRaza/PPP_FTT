const Sobre = require('../models/Sobre');
const User = require('../models/User');
const { parseCsvBuffer } = require('../utils/csvImportHelpers');
const { normalizarNombre } = require('../utils/nombreHelpers');

// Normaliza la lista de localidades que vino en el body: acepta tanto un
// array (varios campos "localidades" en el FormData) como un string suelto
// (una sola localidad), recorta espacios, descarta vacíos y duplicados, y
// ordena para que la combinación quede siempre igual sin importar el orden
// en que se hayan marcado los checkboxes (así agrupa bien en el resumen).
const normalizarLocalidadesBody = (valor) => {
  const lista = Array.isArray(valor) ? valor : (valor ? [valor] : []);
  return [...new Set(lista.map(l => String(l || '').trim()).filter(Boolean))].sort();
};

// @desc    Importar el CSV de ubicación de sobres de una o más localidades
// (proceso externo que ordena los boletos físicos impresos por nombre). A
// veces el CSV de tickets usa más de un nombre para la MISMA zona física
// (p. ej. "CLUB AREA" y "CLUB AREA/DANCE FLOOR"), así que un mismo archivo
// se puede marcar con varias localidades a la vez. Reemplaza lo que había
// antes SOLO de esas localidades — las demás no se tocan.
// Columnas esperadas: sobre, numero_boleto, posicion_original, nombre
// @route   POST /api/sobres/import
// @access  Private (jefe, importador)
const importarSobres = async (req, res) => {
  try {
    const localidades = normalizarLocalidadesBody(req.body.localidades);
    if (localidades.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe indicar a qué localidad (o localidades) corresponde este archivo de sobres'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Debe adjuntar un archivo CSV'
      });
    }

    let filas;
    try {
      filas = await parseCsvBuffer(req.file.buffer);
    } catch (parseError) {
      console.error('Error al parsear CSV de sobres:', parseError);
      return res.status(400).json({
        success: false,
        message: 'No se pudo leer el archivo. Verifique que sea un CSV válido.'
      });
    }

    if (filas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El archivo está vacío'
      });
    }

    let omitidas = 0;
    const docs = [];
    for (const fila of filas) {
      const nombre = (fila.nombre || '').trim();
      const sobre = (fila.sobre || '').trim();
      if (!nombre || !sobre) {
        omitidas++;
        continue;
      }
      docs.push({
        localidades,
        nombre,
        nombreNormalizado: normalizarNombre(nombre),
        sobre,
        numeroBoleto: (fila.numero_boleto || '').toString().trim(),
        posicionOriginal: (fila.posicion_original || '').toString().trim(),
        subidoPor: req.user._id
      });
    }

    if (docs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró ninguna fila válida (revise que tenga las columnas "nombre" y "sobre")'
      });
    }

    // Reemplazo solo de las localidades elegidas: cualquier sobre que ya
    // tuviera alguna de ellas se borra (venga del mismo combo o de otro
    // combo viejo), las que no se tocan.
    await Sobre.deleteMany({ localidades: { $in: localidades } });
    await Sobre.insertMany(docs, { ordered: false });

    const nombresDistintos = new Set(docs.map(d => d.nombreNormalizado)).size;
    const etiqueta = localidades.join(' + ');

    res.json({
      success: true,
      message: `${docs.length} fila(s) importada(s) para "${etiqueta}" (${nombresDistintos} persona(s) distintas). Se reemplazó la información de sobres anterior de esa(s) localidad(es).`,
      data: {
        localidades,
        totalFilas: docs.length,
        nombresDistintos,
        omitidas
      }
    });

  } catch (error) {
    console.error('Error al importar sobres:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Misma clave que usa el frontend para no pisar resultados cuando el mismo
// nombre (o el mismo bucket de nombres, tipo "Al") existe en más de una
// localidad con sobres distintos (ver utils/ticketFields.js en el frontend).
// Usa la localidad PROPIA del ticket (una sola), no el combo completo del
// archivo que se subió.
const claveSobre = (localidad, nombreNormalizado) => `${localidad}||${nombreNormalizado}`;

// @desc    Buscar el/los posible(s) sobre(s) de una o varias personas por
// nombre + localidad del ticket. Se usa al momento de canjear, para saber
// dónde buscar el boleto físico impreso. No todos los tickets van a tener
// resultado (no es obligatorio subir este archivo, y no todos los nombres
// matchean).
// @route   POST /api/sobres/buscar
// body: { items: [{ nombre: string, localidad: string }] }
// @access  Private (jefe, staff, impresor_solo, impresor_cola)
const buscarSobres = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un array de items {nombre, localidad}'
      });
    }

    // $or de pares exactos (nombreNormalizado + localidad del ticket): no
    // se puede buscar por nombre solo, porque el mismo bucket puede existir
    // en más de una localidad con sobres distintos. "localidades" es un
    // array en el documento, así que {localidades: 'X'} matchea cualquier
    // sobre cuyo array de localidades incluya X.
    const pares = [];
    const vistos = new Set();
    for (const item of items) {
      const nombreNormalizado = normalizarNombre(item?.nombre);
      const localidad = (item?.localidad || '').trim();
      if (!nombreNormalizado || !localidad) continue;
      const clave = claveSobre(localidad, nombreNormalizado);
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      pares.push({ nombreNormalizado, localidades: localidad });
    }

    if (pares.length === 0) {
      return res.json({ success: true, data: {} });
    }

    const registros = await Sobre.find({ $or: pares }).lean();

    // Se agrupa por localidad (la del par buscado, no el combo completo del
    // documento) + nombre normalizado: mismo nombre en la misma localidad
    // => mismo sobre (ya se verificó que el archivo no trae conflictos),
    // así que alcanza con un valor por clave. Si algún día llegara a haber
    // más de uno, se listan todos para no ocultar la ambigüedad.
    const resultado = {};
    registros.forEach(r => {
      // Un doc puede tener varias localidades (el combo completo); se
      // reporta bajo cada una que efectivamente se haya buscado
      const localidadesBuscadas = pares
        .filter(p => p.nombreNormalizado === r.nombreNormalizado && r.localidades.includes(p.localidades))
        .map(p => p.localidades);

      localidadesBuscadas.forEach(localidad => {
        const clave = claveSobre(localidad, r.nombreNormalizado);
        if (!resultado[clave]) {
          resultado[clave] = { nombre: r.nombre, localidad, sobres: [] };
        }
        if (!resultado[clave].sobres.includes(r.sobre)) {
          resultado[clave].sobres.push(r.sobre);
        }
      });
    });

    res.json({ success: true, data: resultado });

  } catch (error) {
    console.error('Error al buscar sobres:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Resumen de la información de sobres cargada actualmente, por
// combinación de localidades (puede haber varias cargadas a la vez, p. ej.
// AREA, VIP, o un combo como "CLUB AREA + CLUB AREA/DANCE FLOOR")
// @route   GET /api/sobres/resumen
// @access  Private (jefe, importador)
const getResumenSobres = async (req, res) => {
  try {
    const grupos = await Sobre.aggregate([
      {
        $group: {
          _id: '$localidades',
          totalFilas: { $sum: 1 },
          nombresDistintos: { $addToSet: '$nombreNormalizado' },
          ultimaFecha: { $max: '$createdAt' },
          ultimoSubidoPor: { $last: '$subidoPor' }
        }
      }
    ]);

    const porGrupo = await Promise.all(grupos.map(async (g) => {
      let usuario = null;
      if (g.ultimoSubidoPor) {
        const u = await User.findById(g.ultimoSubidoPor).select('nombre').lean();
        usuario = u?.nombre || null;
      }
      return {
        localidades: g._id,
        totalFilas: g.totalFilas,
        nombresDistintos: g.nombresDistintos.length,
        ultimaImportacion: g.ultimaFecha ? { fecha: g.ultimaFecha, usuario } : null
      };
    }));

    porGrupo.sort((a, b) => a.localidades.join(',').localeCompare(b.localidades.join(',')));

    res.json({
      success: true,
      data: {
        porGrupo,
        totalFilas: porGrupo.reduce((sum, g) => sum + g.totalFilas, 0)
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen de sobres:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = { importarSobres, buscarSobres, getResumenSobres };
