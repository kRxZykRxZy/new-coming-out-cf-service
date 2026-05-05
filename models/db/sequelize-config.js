const dbType = process.env.DB_TYPE || 'sqlite';

module.exports = {
  development: dbType === 'postgres' ? {
    dialect: 'postgres',
    url: process.env.DATABASE_URL,
    logging: false,
  } : {
    dialect: 'sqlite',
    storage: process.env.DB_PATH || './database.sqlite',
    logging: false,
  }
};