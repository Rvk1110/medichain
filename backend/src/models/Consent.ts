import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Consent extends Model {
    public id!: number;
    public patientId!: number;
    public doctorId!: number;
    public recordId!: number;
    public validUntil!: Date;
}

Consent.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        patientId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        doctorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        recordId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        validUntil: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'consents',
    }
);
