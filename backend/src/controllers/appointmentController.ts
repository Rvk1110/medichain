import { Request, Response } from 'express';
import { Appointment, AppointmentStatus } from '../models/Appointment';
import { User, UserRole } from '../models/User';
import { Op } from 'sequelize';

interface AuthRequest extends Request {
    user?: any;
}

// Book Appointment (Patient)
export const bookAppointment = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { doctorId, startTime, endTime } = req.body;

        if (user.role !== UserRole.PATIENT) {
            return res.status(403).json({ error: 'Only patients can book appointments' });
        }

        // Validate Doctor exists
        const doctor = await User.findByPk(doctorId);
        if (!doctor || doctor.role !== UserRole.DOCTOR) {
            return res.status(400).json({ error: 'Invalid doctor ID' });
        }

        // Check availability (Overlapping)
        const overlap = await Appointment.findOne({
            where: {
                doctorId,
                status: AppointmentStatus.ACTIVE,
                [Op.or]: [
                    {
                        startTime: {
                            [Op.between]: [startTime, endTime]
                        }
                    },
                    {
                        endTime: {
                            [Op.between]: [startTime, endTime]
                        }
                    }
                ]
            }
        });

        if (overlap) {
            return res.status(409).json({ error: 'Doctor is busy at this time' });
        }

        const appointment = await Appointment.create({
            patientId: user.id,
            doctorId,
            startTime,
            endTime,
            status: AppointmentStatus.ACTIVE
        });

        res.status(201).json({ message: 'Appointment booked', appointment });

    } catch (error) {
        res.status(500).json({ error: 'Booking failed' });
    }
};

// View Appointments
export const getAppointments = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const whereClause: any = {};

        if (user.role === UserRole.PATIENT) {
            whereClause.patientId = user.id;
        } else if (user.role === UserRole.DOCTOR) {
            whereClause.doctorId = user.id;
        }

        const appointments = await Appointment.findAll({ where: whereClause, include: ['doctor', 'patient'] });
        res.status(200).json(appointments);
    } catch (error) {
        res.status(500).json({ error: 'Fetch failed' });
    }
}
