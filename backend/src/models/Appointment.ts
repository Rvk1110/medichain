import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';

export enum AppointmentStatus {
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export class Appointment extends Model {
    public id!: number;
    public doctorId!: number; // Points to User (Doctor)
    public patientId!: number; // Points to User (Patient)
    public startTime!: Date;
    public endTime!: Date;
    public status!: AppointmentStatus;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Appointment.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        doctorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: 'id',
            },
        },
        patientId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: 'id',
            },
        },
        startTime: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        endTime: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(...Object.values(AppointmentStatus)),
            defaultValue: AppointmentStatus.ACTIVE,
        },
    },
    {
        sequelize,
        tableName: 'appointments',
    }
);

Appointment.belongsTo(User, { as: 'doctor', foreignKey: 'doctorId' });
Appointment.belongsTo(User, { as: 'patient', foreignKey: 'patientId' });
User.hasMany(Appointment, { as: 'doctorAppointments', foreignKey: 'doctorId' });
User.hasMany(Appointment, { as: 'patientAppointments', foreignKey: 'patientId' });
