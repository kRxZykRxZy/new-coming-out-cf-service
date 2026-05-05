# New Coming Out CF Service

This project uses Sequelize ORM with support for PostgreSQL and SQLite databases.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables:
   - For SQLite (default): Set `DB_TYPE=sqlite` and optionally `DB_PATH=./database.sqlite`
   - For PostgreSQL: Set `DB_TYPE=postgres` and `DATABASE_URL=postgresql://user:password@host:port/database`

3. Run migrations:
   ```bash
   npm run migrate
   ```

## Usage

Import the sequelize instance from `models/db/config.js` in your models.

Example model:
```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('./db/config');

const Random = sequelize.define('Random', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  value: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
});

module.exports = Random;
```

## Troubleshooting

- Ensure environment variables are set correctly.
- For PostgreSQL, make sure the database exists and credentials are correct.
- For SQLite, the database file will be created automatically.