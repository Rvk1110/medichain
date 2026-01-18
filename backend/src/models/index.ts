import { User } from './User';
import { DoctorProfile } from './DoctorProfile';
import { MedicalRecord } from './MedicalRecord';
import { Appointment } from './Appointment';
import { AccessLog } from './AccessLog';
import { LocationLog } from './LocationLog';
import { Consent } from './Consent';
import { OTP } from './OTP';
import { sequelize } from '../config/database';

// Initialize associations
// (Done inside model files where possible, or centralized here)
// Current approach: mixed (defined in model files but imports might cycle)

// Check imports to avoid circular dependency issues if needed.
// For now, exporting them centralized.

export {
    User,
    DoctorProfile,
    MedicalRecord,
    Appointment,
    AccessLog,
    LocationLog,
    Consent,
    OTP,
    sequelize,
};

export const syncDatabase = async () => {
    await sequelize.sync({ alter: true }); // Use force: true to drop tables
    console.log('Database synced');
};
