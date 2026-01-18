import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export enum UserRole {
    PATIENT = 'PATIENT',
    DOCTOR = 'DOCTOR',
    HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
}

export class User extends Model {
    public id!: number;
    public phone!: string;
    public role!: UserRole;
    public name!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        role: {
            type: DataTypes.ENUM(...Object.values(UserRole)),
            allowNull: false,
            defaultValue: UserRole.PATIENT,
        },
    },
    {
        sequelize,
        tableName: 'users',
    }
);
