require('dotenv').config();
const mongoose = require('mongoose');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected. Collection name:', process.env.COLLECTION_NAME);

  const db = mongoose.connection.db;
  const collectionName = process.env.COLLECTION_NAME || 'Lumineers_Canje';
  const col = db.collection(collectionName);

  const docs = await col.find({ 'Ticket ID': { $in: ['17808024', '17808025'] } }).toArray();
  console.log('Found', docs.length, 'docs');
  docs.forEach(d => {
    console.log('----');
    console.log('Ticket ID:', JSON.stringify(d['Ticket ID']), typeof d['Ticket ID']);
    console.log('Transaction ID:', JSON.stringify(d['Transaction ID']), typeof d['Transaction ID']);
    console.log('canjeado:', d.canjeado);
    console.log('impreso:', d.impreso);
    console.log('quienRetira:', d.quienRetira);
    console.log('celular:', d.celular);
    console.log('fechaCanje:', d.fechaCanje);
    console.log('puntoTrabajo:', d.puntoTrabajo);
    console.log('Ticket (tipo):', d['Ticket']);
  });

  if (docs.length > 0) {
    const txId = docs[0]['Transaction ID'];
    const siblings = await col.find({ 'Transaction ID': txId }).toArray();
    console.log('\nAll docs sharing Transaction ID', JSON.stringify(txId), ':', siblings.length);
    siblings.forEach(s => console.log(' -', s['Ticket ID'], 'canjeado:', s.canjeado, 'TransactionID type:', typeof s['Transaction ID']));
  }

  await mongoose.disconnect();
};

run().catch(err => { console.error('ERROR:', err); process.exit(1); });
