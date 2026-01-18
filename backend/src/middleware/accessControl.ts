import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../models/User';
import { DoctorProfile, Specialty } from '../models/DoctorProfile';
import { MedicalRecord } from '../models/MedicalRecord';
import { Appointment, AppointmentStatus } from '../models/Appointment';
import { AccessLog } from '../models/AccessLog';
import { isWithinHospital } from '../services/locationService';
import { LocationLog } from '../models/LocationLog';
import { Op } from 'sequelize';

interface AuthRequest extends Request {
    user?: User;
}

export const checkAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const recordId = req.params.id as string; // Casting to string to avoid lint

        // 1. Patient Access (Own records)
        if (user.role === UserRole.PATIENT) {
            const record = await MedicalRecord.findByPk(recordId);
            if (!record || record.ownerId !== user.id) {
                await logAccess(user.id, parseInt(recordId), 'VIEW', false, 0, 0); // Log failure
                return res.status(403).json({ error: 'Access denied to this record' });
            }
            await logAccess(user.id, parseInt(recordId), 'VIEW', true, 0, 0);
            return next();
        }

        // 2. Doctor Access
        if (user.role === UserRole.DOCTOR) {
            const { lat, lng } = req.body; // Location passed in body for verification on access

            // LOCATION CHECK
            if (!lat || !lng) {
                return res.status(403).json({ error: 'Location data required for access' });
            }

            const validLocation = isWithinHospital(parseFloat(lat), parseFloat(lng));

            // Log location
            await LocationLog.create({
                doctorId: user.id,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
            });

            if (!validLocation) {
                await logAccess(user.id, parseInt(recordId), 'VIEW', false, parseFloat(lat), parseFloat(lng));
                return res.status(403).json({ error: 'Access denied: You are outside the hospital' });
            }

            const record = await MedicalRecord.findByPk(recordId);
            if (!record) return res.status(404).json({ error: 'Record not found' });

            // SPECIALTY CHECK
            const doctorProfile = await DoctorProfile.findOne({ where: { userId: user.id } });
            if (!doctorProfile) return res.status(403).json({ error: 'Doctor profile not found' });

            if (doctorProfile.specialty !== record.type && doctorProfile.specialty !== Specialty.GENERAL) {
                await logAccess(user.id, parseInt(recordId), 'VIEW', false, parseFloat(lat), parseFloat(lng));
                return res.status(403).json({ error: `Access denied: Specialty Mismatch. Required: ${record.type}` });
            }

            // APPOINTMENT CHECK
            // Check for active appointment with the record owner
            const activeAppointment = await Appointment.findOne({
                where: {
                    doctorId: user.id,
                    patientId: record.ownerId,
                    status: AppointmentStatus.ACTIVE,
                    startTime: { [Op.lte]: new Date() },
                    endTime: { [Op.gte]: new Date() },
                },
            });

            if (!activeAppointment) {
                await logAccess(user.id, parseInt(recordId), 'VIEW', false, parseFloat(lat), parseFloat(lng));
                return res.status(403).json({ error: 'Access denied: No active appointment with this patient' });
            }

            // If all pass
            await logAccess(user.id, parseInt(recordId), 'VIEW', true, parseFloat(lat), parseFloat(lng));
            return next();
        }

        return res.status(403).json({ error: 'Role not authorized' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error checkAccess' });
    }
};

async function logAccess(actorId: number, recordId: number, action: string, success: boolean, lat: number, lng: number) {
    try {
        await AccessLog.create({
            actorId,
            recordId,
            action,
            timestamp: new Date(),
            verificationStatus: success,
            locationLat: lat,
            locationLng: lng
        });
    } catch (e) {
        console.error("Failed to log access", e);
    }
}
