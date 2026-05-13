const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn('⚠️  MONGODB_URI non défini — pas de connexion base de données');
      return false;
    }
    await mongoose.connect(uri);
    console.log('MongoDB connecté');
    return true;
  } catch (err) {
    console.error('Erreur connexion MongoDB:', err.message);
    console.error('L\'app va démarrer sans base de données (mode lecture seule)');
    return false;
  }
};

module.exports = connectDB;
