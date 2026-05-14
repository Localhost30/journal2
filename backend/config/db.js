const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn('MONGODB_URI non defini');
      return false;
    }
    await mongoose.connect(uri);
    isConnected = true;
    console.log('MongoDB connecte');
    return true;
  } catch (err) {
    console.error('Erreur connexion MongoDB:', err.message);
    isConnected = false;
    return false;
  }
};

const getDBStatus = () => isConnected;

module.exports = { connectDB, getDBStatus };
