const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DistributionConfig = sequelize.define('DistributionConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '配置ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '用户ID（为空表示全局默认配置）'
  },
  commission_rate: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    defaultValue: 0.1000,
    comment: '分销比例（0-1之间的小数，如0.1表示10%）'
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  description: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '配置说明'
  },
  config_key: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '配置键名（用于键值对配置）'
  },
  config_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '配置值（用于键值对配置）'
  },
  config_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '配置类型（string, number, boolean等）'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '创建时间'
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '更新时间'
  }
}, {
  tableName: 'distribution_configs',
  paranoid: false,
  indexes: [
    {
      fields: ['user_id'],
      unique: true,
      where: {
        user_id: {
          [require('sequelize').Op.ne]: null
        }
      }
    },
    {
      fields: ['user_id', 'config_key'],
      unique: true,
      where: {
        config_key: {
          [require('sequelize').Op.ne]: null
        }
      }
    }
  ]
});

// 定义关联关系
DistributionConfig.associate = (models) => {
  DistributionConfig.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

module.exports = DistributionConfig;