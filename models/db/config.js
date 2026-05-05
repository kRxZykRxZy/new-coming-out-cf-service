const { Sequelize } = require('sequelize');

const dbType = process.env.DB_TYPE || 'sqlite';

let sequelize;

if (dbType === 'postgres') {
  // Assuming DATABASE_URL is set for postgres
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries
  });
} else if (dbType === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_PATH || './database.sqlite',
    logging: false,
  });
} else {
  throw new Error('Unsupported DB_TYPE. Use "postgres" or "sqlite".');
}

module.exports = sequelize;