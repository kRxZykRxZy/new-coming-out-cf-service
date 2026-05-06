"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sessions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      sessionTokenHash: {
        allowNull: false,
        type: Sequelize.STRING
      },
      ip: {
        type: Sequelize.STRING
      },
      expiresAt: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.createTable('apiTokens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      tokenHash: {
        allowNull: false,
        type: Sequelize.STRING,
        unique: true
      },
      label: {
        type: Sequelize.STRING
      },
      lastUsedAt: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.createTable('cliAuthTokens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      tokenHash: {
        allowNull: false,
        type: Sequelize.STRING,
        unique: true
      },
      userId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      expiresAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      usedAt: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addColumn('domains', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });
    await queryInterface.addIndex('domains', ['userId']);

    await queryInterface.addColumn('cloudcasts', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('cloudcasts', 'targetUrl', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('cloudcasts', 'subdomain', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('cloudcasts', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'offline'
    });
    await queryInterface.addColumn('cloudcasts', 'lastSeenAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addIndex('cloudcasts', ['userId']);

    await queryInterface.addIndex('users', ['email'], { unique: true, name: 'users_email_unique' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('users', 'users_email_unique');

    await queryInterface.removeIndex('cloudcasts', ['userId']);
    await queryInterface.removeColumn('cloudcasts', 'lastSeenAt');
    await queryInterface.removeColumn('cloudcasts', 'status');
    await queryInterface.removeColumn('cloudcasts', 'subdomain');
    await queryInterface.removeColumn('cloudcasts', 'targetUrl');
    await queryInterface.removeColumn('cloudcasts', 'userId');

    await queryInterface.removeIndex('domains', ['userId']);
    await queryInterface.removeColumn('domains', 'userId');

    await queryInterface.dropTable('cliAuthTokens');
    await queryInterface.dropTable('apiTokens');
    await queryInterface.dropTable('sessions');
  }
};
