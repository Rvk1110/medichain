import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class OTP extends Model {
    public id!: number;
    public phone!: string;
    public codeHash!: string;
    public expiresAt!: Date;
    public used!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

OTP.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        codeHash: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        used: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    },
    {
        sequelize,
        tableName: 'otps',
    }
);
