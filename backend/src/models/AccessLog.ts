import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class AccessLog extends Model {
    public id!: number;
    public actorId!: number;
    public recordId!: number;
    public action!: string; // 'VIEW', 'UPLOAD'
    public timestamp!: Date;
    public locationLat!: number;
    public locationLng!: number;
    public verificationStatus!: boolean;
}

AccessLog.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        actorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        recordId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        locationLat: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        locationLng: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        verificationStatus: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'access_logs',
    }
);
