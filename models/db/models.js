const { DataTypes } = require('sequelize');
const sequelize = require('./config');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: true
});

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  sessionTokenHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ip: {
    type: DataTypes.STRING
  },
  expiresAt: {
    type: DataTypes.DATE
  }
}, {
  timestamps: true
});

const ApiToken = sequelize.define('ApiToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  tokenHash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  label: {
    type: DataTypes.STRING
  },
  lastUsedAt: {
    type: DataTypes.DATE
  }
}, {
  timestamps: true
});

const CliAuthToken = sequelize.define('CliAuthToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tokenHash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  usedAt: {
    type: DataTypes.DATE
  }
}, {
  timestamps: true
});

const Domain = sequelize.define('Domain', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  owner: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subdomains: {
    type: DataTypes.TEXT,
    defaultValue: '[]'
  },
  dnsVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
});

const Cloudcast = sequelize.define('Cloudcast', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  targetUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false
  },
  owner: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subdomain: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('online', 'offline'),
    defaultValue: 'offline'
  },
  lastSeenAt: {
    type: DataTypes.DATE
  }
}, {
  timestamps: true
});

// Associations
User.hasMany(Session, { foreignKey: 'userId' });
Session.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ApiToken, { foreignKey: 'userId' });
ApiToken.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(CliAuthToken, { foreignKey: 'userId' });
CliAuthToken.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Domain, { foreignKey: 'userId' });
Domain.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Cloudcast, { foreignKey: 'userId' });
Cloudcast.belongsTo(User, { foreignKey: 'userId' });

module.exports = { User, Session, ApiToken, CliAuthToken, Domain, Cloudcast };
