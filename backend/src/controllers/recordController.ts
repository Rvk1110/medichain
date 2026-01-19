import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';
import { MedicalRecord } from '../models/MedicalRecord';
import { UserRole } from '../models/User';
import { encryptFile, decryptFile, generateFileHash } from '../services/cryptoService';

export const uploadRecord = async (req: AuthRequest, res: Response) => {
    try {
        const { type } = req.body;
        const file = req.file;
        const user = req.user!;

        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const fileData = fs.readFileSync(file.path);
        const hash = generateFileHash(fileData);

        // Encrypt
        const { encryptedData, iv } = encryptFile(fileData);

        // Upload to Cloudinary
        const { uploadToCloud } = await import('../services/cloudinaryService');
        const encryptedFileName = `${user.id}_${Date.now()}_encrypted.bin`;
        const ivFileName = `${user.id}_${Date.now()}_iv.bin`;

        const encryptedUpload = await uploadToCloud(encryptedData, encryptedFileName);
        const ivUpload = await uploadToCloud(iv, ivFileName);

        // Save metadata
        let record;
        record = await MedicalRecord.create({
            ownerId: user.id,
            type,
            fileKey: encryptedUpload.publicId,
            ivKey: ivUpload.publicId,
            hash,
            mimeType: file.mimetype,
            isEmergencyAccessible: false // Default to not emergency accessible
        });

        // Cleanup temp file
        fs.unlinkSync(file.path);

        res.status(201).json({ message: 'Record uploaded successfully', recordId: record.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error uploading record' });
    }
};

export const getRecord = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const record = await MedicalRecord.findByPk(Number(id));
        if (!record) return res.status(404).json({ error: 'Record not found' });

        // Access Control: Patient owns it OR Doctor has valid access
        const user = req.user!;
        if (user.role === UserRole.PATIENT && record.ownerId !== user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Download from Cloudinary
        const { downloadFromCloud } = await import('../services/cloudinaryService');

        try {
            const encryptedData = await downloadFromCloud(record.fileKey);
            const iv = await downloadFromCloud((record as any).ivKey || record.fileKey.replace('.enc', '.iv'));

            // Decrypt
            const decryptedData = decryptFile(encryptedData, iv);

            // Verify Integrity
            const currentHash = generateFileHash(decryptedData);
            if (currentHash !== record.hash) {
                // Alert!
                return res.status(500).json({ error: 'SECURITY ALERT: File integrity mismatch! Data may be corrupted or tampered.' });
            }

            // Return File
            res.setHeader('Content-Type', record.mimeType);
            res.send(decryptedData);

        } catch (cloudError) {
            console.error('Cloudinary download error:', cloudError);
            return res.status(500).json({ error: 'File storage retrieval failed' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error retrieving record' });
    }
};

export const listRecords = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user!;
        let records;

        if (user.role === UserRole.PATIENT) {
            records = await MedicalRecord.findAll({ where: { ownerId: user.id } });
        } else {
            const patientId = req.query.patientId;
            if (!patientId) return res.status(400).json({ error: "Doctor must provide patientId to list records" });

            records = await MedicalRecord.findAll({ where: { ownerId: Number(patientId) } });
        }

        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ error: 'Error listing records' });
    }
};

export const emergencyAccess = async (req: AuthRequest, res: Response) => {
    try {
        const { phoneNumber } = req.body;
        const doctor = req.user;

        // Only doctors can use emergency access
        if (doctor?.role !== UserRole.DOCTOR) {
            return res.status(403).json({ error: 'Only doctors can use emergency access' });
        }

        // Find patient by phone number
        const { User } = await import('../models/User');
        const patient = await User.findOne({
            where: {
                phone: phoneNumber,
                role: UserRole.PATIENT
            }
        });

        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        // Get only emergency-accessible records
        const records = await MedicalRecord.findAll({
            where: {
                ownerId: patient.id,
                isEmergencyAccessible: true
            }
        });

        // Log emergency access
        console.log(`EMERGENCY ACCESS: Dr. ${doctor.id} accessed patient ${patient.id} records`);

        res.status(200).json({
            patient: {
                id: patient.id,
                name: patient.name,
                phone: patient.phone,
                emergencyInfo: (patient as any).emergencyInfo
            },
            records
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error accessing emergency records' });
    }
};
