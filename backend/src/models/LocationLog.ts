import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class LocationLog extends Model {
    public id!: number;
    public doctorId!: number;
    public lat!: number;
    public lng!: number;
    public timestamp!: Date;
}

LocationLog.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        doctorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        lat: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        lng: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'location_logs',
    }
);
