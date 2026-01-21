import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload encrypted file buffer to Cloudinary
 * @param buffer - File buffer to upload
 * @param filename - Original filename for reference
 * @returns Cloudinary public ID and secure URL
 */
export const uploadToCloud = async (buffer: Buffer, filename: string): Promise<{ publicId: string; url: string }> => {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error('Cloudinary not configured! Missing environment variables.');
        throw new Error('Cloudinary configuration missing');
    }

    console.log(`Uploading to Cloudinary: ${filename}, buffer size: ${buffer.length} bytes`);

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'medichain/records',
                resource_type: 'raw', // For encrypted binary files
                public_id: `${Date.now()}_${filename.replace(/\.[^/.]+$/, '')}`, // Remove extension from public_id
                format: filename.split('.').pop(), // Set format separately
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return reject(error);
                }
                if (!result) {
                    console.error('Cloudinary upload failed: No result returned');
                    return reject(new Error('Upload failed'));
                }
                console.log(`Cloudinary upload success: ${result.public_id}`);
                resolve({
                    publicId: result.public_id,
                    url: result.secure_url,
                });
            }
        );

        // Convert buffer to stream and pipe to Cloudinary
        const readableStream = Readable.from(buffer);
        readableStream.pipe(uploadStream);
    });
};

/**
 * Download file from Cloudinary
 * @param publicId - Cloudinary public ID
 * @returns File buffer
 */
export const downloadFromCloud = async (publicId: string): Promise<Buffer> => {
    const url = cloudinary.url(publicId, { resource_type: 'raw' });

    // Fetch file from Cloudinary URL
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download file from Cloudinary: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
};

/**
 * Delete file from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export const deleteFromCloud = async (publicId: string): Promise<void> => {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
};
