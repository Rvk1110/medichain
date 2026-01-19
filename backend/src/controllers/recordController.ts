import { Request, Response } from 'express';
import { MedicalRecord } from '../models/MedicalRecord';
import path from 'path';
import fs from 'fs';
import { encryptFile, decryptFile, generateFileHash } from '../services/cryptoService';
import { UserRole } from '../models/User';
import { AccessLog } from '../models/AccessLog';

// Extend Request to handle file from Multer
interface AuthRequest extends Request {
    user?: any;
    file?: Express.Multer.File;
}

// Upload Record (Patient only)
export const uploadRecord = async (req: AuthRequest, res: Response) => {
    try {
        const { type } = req.body;
        const user = req.user;

        if (user.role !== UserRole.PATIENT) {
            return res.status(403).json({ error: 'Only patients can upload records' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // 1. Read file buffer
        const fileBuffer = fs.readFileSync(req.file.path);

        // 2. Generate Hash
        const fileHash = generateFileHash(fileBuffer);

        // 3. Encrypt
        const { encryptedData, iv } = encryptFile(fileBuffer);

        // 4. Upload to Cloudinary (instead of local storage)
        const { uploadToCloud } = await import('../services/cloudinaryService');

        const timestamp = Date.now();
        const encryptedFileName = `${user.id}_${timestamp}.enc`;
        const ivFileName = `${user.id}_${timestamp}.iv`;

        // Upload encrypted file and IV to cloud
        const encryptedUpload = await uploadToCloud(encryptedData, encryptedFileName);
        const ivUpload = await uploadToCloud(iv, ivFileName);

        // 5. Save Metadata to DB
        const record = await MedicalRecord.create({
            ownerId: user.id,
            type,
            fileKey: encryptedUpload.publicId, // Store Cloudinary public ID
            hash: fileHash,
            mimeType: req.file.mimetype,
            // Store IV public ID in a new field (we'll add this to model)
            ivKey: ivUpload.publicId,
        });

        // Cleanup temp Multer file
        fs.unlinkSync(req.file.path);

        res.status(201).json({ message: 'File uploaded and encrypted securely', recordId: record.id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Upload failed' });
    }
};

// Get Record (Protected by Middleware)
export const getRecord = async (req: AuthRequest, res: Response) => {
    try {
        const recordId = req.params.id as string;
        const record = await MedicalRecord.findByPk(recordId);

        if (!record) return res.status(404).json({ error: 'Record not found' });

        // Download from Cloudinary instead of local filesystem
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
        const user = req.user;
        let records;

        if (user.role === UserRole.PATIENT) {
            records = await MedicalRecord.findAll({ where: { ownerId: user.id } });
        } else {
            const patientId = req.query.patientId;
            if (!patientId) return res.status(400).json({ error: "Doctor must provide patientId to list records" });

            records = await MedicalRecord.findAll({ where: { ownerId: patientId } });
        }

        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ error: 'Error listing records' });
    }
};
