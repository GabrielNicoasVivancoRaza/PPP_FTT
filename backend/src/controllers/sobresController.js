const Sobre = require('../models/Sobre');
const { parseCsvBuffer } = require('../utils/csvImportHelpers');
const { normalizarNombre } = require('../utils/nombreHelpers');

// @desc    Importar el CSV de ubicación de sobres (proceso externo que
// ordena los boletos físicos impresos por nombre). Reemplaza TODO lo que
// había antes: no se mezcla con una subida vieja, porque el reordenamiento
// de sobres puede cambiar de una tanda a otra.
// Columnas esperadas: sobre, numero_boleto, posicion_original, nombre
// @route   POST /api/sobres/import
// @access  Private (jefe, importador)
const importarSobres = async (req, res) => {
  try {
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

    // Reemplazo completo: se borra todo lo anterior y se inserta la tanda nueva
    await Sobre.deleteMany({});
    await Sobre.insertMany(docs, { ordered: false });

    const nombresDistintos = new Set(docs.map(d => d.nombreNormalizado)).size;

    res.json({
      success: true,
      message: `${docs.length} fila(s) importada(s) (${nombresDistintos} persona(s) distintas). Se reemplazó la información de sobres anterior.`,
      data: {
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

// @desc    Buscar el/los posible(s) sobre(s) de una o varias personas por
// nombre. Se usa al momento de canjear, para saber dónde buscar el boleto
// físico impreso. No todos los tickets van a tener resultado (no es
// obligatorio subir este archivo, y no todos los nombres matchean).
// @route   POST /api/sobres/buscar
// body: { nombres: string[] }
// @access  Private (jefe, staff, impresor_solo, impresor_cola)
const buscarSobres = async (req, res) => {
  try {
    const { nombres } = req.body;

    if (!Array.isArray(nombres) || nombres.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un array de nombres'
      });
    }

    const normalizados = [...new Set(nombres.map(n => normalizarNombre(n)).filter(Boolean))];
    if (normalizados.length === 0) {
      return res.json({ success: true, data: {} });
    }

    const registros = await Sobre.find({ nombreNormalizado: { $in: normalizados } }).lean();

    // Se agrupa por nombre normalizado: mismo nombre => mismo sobre (ya se
    // verificó que el archivo no trae conflictos), así que alcanza con un
    // valor por nombre. Si algún día llegara a haber más de uno, se listan
    // todos para no ocultar la ambigüedad.
    const resultado = {};
    registros.forEach(r => {
      if (!resultado[r.nombreNormalizado]) {
        resultado[r.nombreNormalizado] = { nombre: r.nombre, sobres: [] };
      }
      if (!resultado[r.nombreNormalizado].sobres.includes(r.sobre)) {
        resultado[r.nombreNormalizado].sobres.push(r.sobre);
      }
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

// @desc    Resumen de la información de sobres cargada actualmente
// (cantidad de filas, cuándo se subió por última vez)
// @route   GET /api/sobres/resumen
// @access  Private (jefe, importador)
const getResumenSobres = async (req, res) => {
  try {
    const [total, ultimo] = await Promise.all([
      Sobre.countDocuments(),
      Sobre.findOne().sort({ createdAt: -1 }).populate('subidoPor', 'nombre')
    ]);

    const nombresDistintos = total > 0 ? (await Sobre.distinct('nombreNormalizado')).length : 0;

    res.json({
      success: true,
      data: {
        totalFilas: total,
        nombresDistintos,
        ultimaImportacion: ultimo
          ? { fecha: ultimo.createdAt, usuario: ultimo.subidoPor?.nombre || null }
          : null
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
