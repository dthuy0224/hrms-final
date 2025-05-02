const mongoose = require("mongoose");
require("dotenv").config();

mongoose.Promise = global.Promise;

let connection = null;

async function connect() {
  try {
    if (!connection) {
      let url;
      switch (process.env.NODE_ENV) {
        case "test":
          url = process.env.DB_URL_TEST;
          break;
        default:
          url = process.env.DB_URL;
      }
      
      console.log("[DB] Kết nối đến MongoDB với URL:", url);
      
      connection = await mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false
      });
      console.log('Connected to MongoDB');
    }
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

const close = () => {
  return mongoose.connection.close();
};

function getConnection() {
  if (!connection) {
    throw new Error('Please connect to database first');
  }
  return connection;
}

module.exports = { connect, close, getConnection };
