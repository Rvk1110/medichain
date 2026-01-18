import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';

export enum Specialty {
    CARDIOLOGY = 'CARDIOLOGY',
    RADIOLOGY = 'RADIOLOGY',
    PATHOLOGY = 'PATHOLOGY',
    GENERAL = 'GENERAL',
}

export class DoctorProfile extends Model {
    public id!: number;
    public userId!: number;
    public specialty!: Specialty;
    public hospitalId!: string; // Could be a separate model, keeping simplified for MVP
    public licenseNumber!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

DoctorProfile.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: 'id',
            },
        },
        specialty: {
            type: DataTypes.ENUM(...Object.values(Specialty)),
            allowNull: false,
        },
        hospitalId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        licenseNumber: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
    },
    {
        sequelize,
        tableName: 'doctor_profiles',
    }
);

// Association defined in index.ts or here
User.hasOne(DoctorProfile, { foreignKey: 'userId', as: 'doctorProfile' });
DoctorProfile.belongsTo(User, { foreignKey: 'userId' });
