import axios, { AxiosInstance } from 'axios';

// API Base URL - use environment variable or fallback to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ========== AUTH API ==========
export const authAPI = {
    registerPatient: async (name: string, phone: string) => {
        const response = await apiClient.post('/auth/register/patient', { name, phone });
        return response.data;
    },

    registerDoctor: async (name: string, phone: string, specialty: string, licenseNumber: string, hospitalId: string) => {
        const response = await apiClient.post('/auth/register/doctor', {
            name,
            phone,
            specialty,
            licenseNumber,
            hospitalId,
        });
        return response.data;
    },

    login: async (phone: string) => {
        const response = await apiClient.post('/auth/login', { phone });
        return response.data;
    },

    verifyOTP: async (phone: string, otp: string) => {
        const response = await apiClient.post('/auth/verify', { phone, otp });
        return response.data;
    },
};

// ========== RECORDS API ==========
export const recordsAPI = {
    upload: async (file: File, type: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const response = await apiClient.post('/records/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    list: async (patientId?: string) => {
        const params = patientId ? { patientId } : {};
        const response = await apiClient.get('/records/list', { params });
        return response.data;
    },

    getRecord: async (recordId: string, latitude?: number, longitude?: number) => {
        const response = await apiClient.post(`/records/${recordId}/access`, {
            latitude,
            longitude,
        }, {
            responseType: 'blob', // For file download
        });
        return response.data;
    },
};

// ========== APPOINTMENTS API ==========
export const appointmentsAPI = {
    book: async (doctorId: string, startTime: string, endTime: string) => {
        const response = await apiClient.post('/appointments/book', {
            doctorId,
            startTime,
            endTime,
        });
        return response.data;
    },

    list: async () => {
        const response = await apiClient.get('/appointments');
        return response.data;
    },
};

// ========== USER API ==========
export const userAPI = {
    getCurrentUser: async () => {
        const response = await apiClient.get('/user/me');
        return response.data;
    },

    listDoctors: async () => {
        const response = await apiClient.get('/user/doctors');
        return response.data;
    },
};

export default apiClient;
