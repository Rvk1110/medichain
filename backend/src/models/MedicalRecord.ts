import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';
import { Specialty } from './DoctorProfile'; // Reusing Specialty enum

export class MedicalRecord extends Model {
    public id!: number;
    public ownerId!: number;
    public type!: Specialty; // Matches doctor specialty
    public fileKey!: string; // Cloudinary public ID for encrypted file
    public ivKey?: string; // Cloudinary public ID for IV file
    public hash!: string; // SHA-256 for integrity
    public mimeType!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

MedicalRecord.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        ownerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: 'id',
            },
        },
        type: {
            type: DataTypes.ENUM(...Object.values(Specialty)),
            allowNull: false,
        },
        fileKey: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        ivKey: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        hash: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        mimeType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'medical_records',
    }
);

MedicalRecord.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
User.hasMany(MedicalRecord, { as: 'records', foreignKey: 'ownerId' });
