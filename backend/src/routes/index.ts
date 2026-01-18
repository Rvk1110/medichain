import { Router } from 'express';
import { registerPatient, registerDoctor, login, verifyLoginOTP } from '../controllers/authController';
import { uploadRecord, getRecord, listRecords } from '../controllers/recordController';
import { bookAppointment, getAppointments } from '../controllers/appointmentController';
import { authenticate, authorize } from '../middleware/auth';
import { checkAccess } from '../middleware/accessControl';
import { UserRole } from '../models/User';
import multer from 'multer';
import path from 'path';

const router = Router();
const upload = multer({ dest: path.join(__dirname, '../../temp_uploads') }); // Temporary storage before encryption

// Auth
router.post('/auth/register/patient', registerPatient);
router.post('/auth/register/doctor', registerDoctor);
router.post('/auth/login', login);
router.post('/auth/verify', verifyLoginOTP);

// Records
router.post('/records/upload', authenticate, authorize([UserRole.PATIENT]), upload.single('file'), uploadRecord);
router.get('/records/list', authenticate, listRecords);
// The Critical Secure Endpoint:
router.post('/records/:id/access', authenticate, authorize([UserRole.DOCTOR, UserRole.PATIENT]), checkAccess, getRecord);
// Note: Using POST for access to allow Body (Location Lat/Lng) efficiently, though GET with Headers is also fine. 
// User Request said: "Doctor's device must send: Latitude, Longitude... Location check must happen: At access time"
// To send JSON body with GET is possible but unconventional. POST for "Requesting Access" is semantically acceptable.

// Appointments
router.post('/appointments/book', authenticate, authorize([UserRole.PATIENT]), bookAppointment);
router.get('/appointments', authenticate, getAppointments);

export default router;
