import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User, UserRole, MedicalRecord, Appointment, AccessKey,
  LedgerBlock, AppState, LedgerAction, AppointmentStatus, LabRequest
} from '../types';
import { authAPI, recordsAPI, appointmentsAPI } from '../services/api';

// Simple hashing simulation (keep for client-side ledger)
const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

interface StoreContextType extends AppState {
  login: (phone: string, otp: string) => Promise<void>;
  registerPatient: (name: string, phoneNumber: string, emergencyInfo?: string) => Promise<void>;
  sendOTP: (phone: string) => Promise<void>;
  logout: () => void;
  uploadRecord: (file: File, type: string) => Promise<void>;
  fetchRecords: () => Promise<void>;
  bookAppointment: (doctorId: string, startTime: string, endTime: string) => Promise<void>;
  fetchAppointments: () => Promise<void>;
  // Keep these for backward compatibility (will implement later)
  generateAccessKey: (appointmentId: string, isAuto?: boolean) => string;
  verifyAccessKey: (key: string, doctorId: string) => { valid: boolean; message: string; patientId?: string };
  revokeKey: (code: string) => void;
  isGeoFenced: boolean;
  toggleGeoFence: () => void;
  getUsersByPhone: (phone: string) => User[];
  requestAccess: (appointmentId: string) => void;
  respondToAccessRequest: (appointmentId: string, approved: boolean) => void;
  completeAppointment: (appointmentId: string, summary: string, followUpDate?: string) => void;
  performEmergencyAccess: (phoneNumber: string) => User[];
  updateEmergencyInfo: (userId: string, info: string) => void;
  toggleRecordEmergency: (recordId: string) => void;
  submitLabRequest: (patientId: string, title: string, description: string, fileType: MedicalRecord['fileType'], reportFileName: string, billFileName: string) => void;
  respondToLabRequest: (requestId: string, approved: boolean) => void;
  checkAutoKeys: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    users: [],
    records: [],
    appointments: [],
    accessKeys: [],
    labRequests: [],
    ledger: [
      {
        index: 0, timestamp: new Date().toISOString(), action: LedgerAction.UPLOAD_RECORD,
        details: 'Genesis Block', dataHash: '0000', previousHash: '0', blockHash: '0001'
      }
    ]
  });

  const [isGeoFenced, setIsGeoFenced] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // Load user data on mount if token exists
  useEffect(() => {
    const loadData = async () => {
      if (token) {
        await fetchRecords();
        await fetchAppointments();
      }
    };
    loadData();
  }, [token]);

  // Helper to add to immutable ledger
  const addToLedger = (action: LedgerAction, details: string, dataHash: string) => {
    setState(prev => {
      const lastBlock = prev.ledger[prev.ledger.length - 1];
      const newBlock: LedgerBlock = {
        index: prev.ledger.length,
        timestamp: new Date().toISOString(),
        action,
        details,
        dataHash,
        previousHash: lastBlock.blockHash,
        blockHash: simpleHash(lastBlock.blockHash + action + details + dataHash)
      };
      return { ...prev, ledger: [...prev.ledger, newBlock] };
    });
  };

  // ========== AUTH FUNCTIONS ==========
  const sendOTP = async (phone: string) => {
    try {
      await authAPI.login(phone);
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    }
  };

  const registerPatient = async (name: string, phoneNumber: string, emergencyInfo: string = '') => {
    try {
      const response = await authAPI.registerPatient(name, phoneNumber);
      addToLedger(LedgerAction.REGISTER_PATIENT, `New patient registered: ${name}`, simpleHash(name + phoneNumber));
      // OTP will be sent automatically by backend
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const login = async (phone: string, otp: string) => {
    try {
      const response = await authAPI.verifyOTP(phone, otp);
      const { token: authToken, role } = response;

      setToken(authToken);
      localStorage.setItem('token', authToken);

      // Create a temporary user object (will be replaced with actual user data from backend)
      const user: User = {
        id: 'temp', // Will be replaced
        name: 'User', // Will be replaced
        role: role as UserRole,
        phoneNumber: phone,
      };

      setState(prev => ({ ...prev, currentUser: user }));

      // Fetch user's data
      await fetchRecords();
      await fetchAppointments();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setState(prev => ({ ...prev, currentUser: null, records: [], appointments: [] }));
  };

  // ========== RECORDS FUNCTIONS ==========
  const uploadRecord = async (file: File, type: string) => {
    try {
      const response = await recordsAPI.upload(file, type);
      addToLedger(LedgerAction.UPLOAD_RECORD, `New ${type} uploaded`, simpleHash(file.name));

      // Refresh records list
      await fetchRecords();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const fetchRecords = async () => {
    try {
      const records = await recordsAPI.list();
      setState(prev => ({ ...prev, records }));
    } catch (error) {
      console.error('Fetch records error:', error);
    }
  };

  // ========== APPOINTMENTS FUNCTIONS ==========
  const bookAppointment = async (doctorId: string, startTime: string, endTime: string) => {
    try {
      const response = await appointmentsAPI.book(doctorId, startTime, endTime);
      await fetchAppointments();
    } catch (error) {
      console.error('Book appointment error:', error);
      throw error;
    }
  };

  const fetchAppointments = async () => {
    try {
      const appointments = await appointmentsAPI.list();
      setState(prev => ({ ...prev, appointments }));
    } catch (error) {
      console.error('Fetch appointments error:', error);
    }
  };

  // ========== LEGACY FUNCTIONS (Keep for backward compatibility) ==========
  // These will be implemented properly later or kept as client-side only

  const getUsersByPhone = (phone: string) => {
    return state.users.filter(u => u.phoneNumber === phone && u.role === UserRole.PATIENT);
  };

  const generateAccessKey = (appointmentId: string, isAuto: boolean = false): string => {
    const apt = state.appointments.find(a => a.id === appointmentId);
    if (!apt) return '';

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const duration = isAuto ? 90 : 30;
    const expiresAt = new Date(Date.now() + 1000 * 60 * duration).toISOString();

    const newKey: AccessKey = {
      code,
      appointmentId,
      patientId: apt.patientId,
      generatedAt: new Date().toISOString(),
      expiresAt,
      isActive: true,
      isAutoGenerated: isAuto
    };

    setState(prev => ({ ...prev, accessKeys: [...prev.accessKeys, newKey] }));
    addToLedger(
      isAuto ? LedgerAction.AUTO_GENERATE_KEY : LedgerAction.GENERATE_KEY,
      `Key generated for Apt ${appointmentId}`,
      simpleHash(code)
    );
    return code;
  };

  const verifyAccessKey = (key: string, doctorId: string) => {
    const accessKey = state.accessKeys.find(k => k.code === key);

    if (!accessKey) return { valid: false, message: 'Invalid Key' };
    if (!accessKey.isActive) return { valid: false, message: 'Key Revoked' };
    if (new Date() > new Date(accessKey.expiresAt)) return { valid: false, message: 'Key Expired' };

    const appointment = state.appointments.find(a => a.id === accessKey.appointmentId);
    if (!appointment) return { valid: false, message: 'Appointment Not Found' };
    if (appointment.doctorId !== doctorId) return { valid: false, message: 'Key not valid for this doctor' };

    if (!isGeoFenced) return { valid: false, message: 'Doctor not at hospital location (Geo-fence failed)' };

    addToLedger(LedgerAction.ACCESS_DATA, `Doctor ${doctorId} accessed Patient ${accessKey.patientId}`, simpleHash(key));

    return { valid: true, message: 'Success', patientId: accessKey.patientId };
  };

  const revokeKey = (code: string) => {
    setState(prev => ({
      ...prev,
      accessKeys: prev.accessKeys.map(k => k.code === code ? { ...k, isActive: false } : k)
    }));
    addToLedger(LedgerAction.REVOKE_ACCESS, `Key ${code} revoked`, simpleHash(code));
  };

  const toggleGeoFence = () => setIsGeoFenced(!isGeoFenced);

  const requestAccess = (appointmentId: string) => {
    setState(prev => ({
      ...prev,
      appointments: prev.appointments.map(a =>
        a.id === appointmentId ? { ...a, accessRequestStatus: 'PENDING' } : a
      )
    }));
    addToLedger(LedgerAction.REQUEST_ACCESS, `Doctor requested access for Apt ${appointmentId}`, simpleHash(appointmentId));
  };

  const respondToAccessRequest = (appointmentId: string, approved: boolean) => {
    setState(prev => ({
      ...prev,
      appointments: prev.appointments.map(a =>
        a.id === appointmentId ? { ...a, accessRequestStatus: approved ? 'APPROVED' : 'REJECTED' } : a
      )
    }));

    if (approved) {
      generateAccessKey(appointmentId, false);
      addToLedger(LedgerAction.APPROVE_ACCESS, `Access Approved for Apt ${appointmentId}`, simpleHash(appointmentId));
    } else {
      addToLedger(LedgerAction.REJECT_ACCESS, `Access Rejected for Apt ${appointmentId}`, simpleHash(appointmentId));
    }
  };

  const completeAppointment = (appointmentId: string, summary: string, followUpDate?: string) => {
    // Implementation kept for backward compatibility
    setState(prev => ({
      ...prev,
      appointments: prev.appointments.map(a =>
        a.id === appointmentId ? { ...a, status: AppointmentStatus.COMPLETED } : a
      )
    }));
  };

  const performEmergencyAccess = (phoneNumber: string): User[] => {
    const targets = state.users.filter(u => u.phoneNumber === phoneNumber && u.role === UserRole.PATIENT);

    if (targets.length > 0 && state.currentUser) {
      targets.forEach(t => {
        addToLedger(
          LedgerAction.EMERGENCY_ACCESS,
          `EMERGENCY OVERRIDE: Dr. ${state.currentUser?.id} accessed ${t.name} (ID: ${t.id})`,
          simpleHash(phoneNumber + Date.now())
        );
      });
    }
    return targets;
  };

  const updateEmergencyInfo = (userId: string, info: string) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, emergencyInfo: info } : u),
      currentUser: prev.currentUser?.id === userId ? { ...prev.currentUser, emergencyInfo: info } : prev.currentUser
    }));
    addToLedger(LedgerAction.UPDATE_EMERGENCY_SETTINGS, `User ${userId} updated vital emergency info`, simpleHash(info));
  };

  const toggleRecordEmergency = (recordId: string) => {
    setState(prev => ({
      ...prev,
      records: prev.records.map(r => r.id === recordId ? { ...r, isEmergencyAccessible: !r.isEmergencyAccessible } : r)
    }));
  };

  const submitLabRequest = (patientId: string, title: string, description: string, fileType: MedicalRecord['fileType'], reportFileName: string, billFileName: string) => {
    const labTech = state.currentUser;
    if (!labTech || labTech.role !== UserRole.LAB_TECHNICIAN) return;

    const newRequest: LabRequest = {
      id: `req${Date.now()}`,
      patientId,
      labTechId: labTech.id,
      labName: labTech.hospitalName || 'Unknown Lab',
      title,
      description,
      fileType,
      reportFileName,
      billFileName,
      status: 'PENDING',
      dateSubmitted: new Date().toISOString()
    };

    setState(prev => ({ ...prev, labRequests: [newRequest, ...prev.labRequests] }));
    addToLedger(LedgerAction.LAB_REQUEST_SUBMITTED, `Lab Request sent to ${patientId} by ${labTech.name}`, simpleHash(title + reportFileName));
  };

  const respondToLabRequest = (requestId: string, approved: boolean) => {
    const request = state.labRequests.find(r => r.id === requestId);
    if (!request) return;

    if (approved) {
      addToLedger(LedgerAction.LAB_REQUEST_APPROVED, `Patient approved lab report ${requestId}`, simpleHash(requestId));
    } else {
      addToLedger(LedgerAction.LAB_REQUEST_REJECTED, `Patient rejected lab report ${requestId}`, simpleHash(requestId));
    }

    setState(prev => ({
      ...prev,
      labRequests: prev.labRequests.filter(r => r.id !== requestId)
    }));
  };

  const checkAutoKeys = () => {
    // Auto-key generation logic (client-side for now)
  };

  return (
    <StoreContext.Provider value={{
      ...state,
      login,
      registerPatient,
      sendOTP,
      logout,
      uploadRecord,
      fetchRecords,
      bookAppointment,
      fetchAppointments,
      generateAccessKey,
      verifyAccessKey,
      revokeKey,
      isGeoFenced,
      toggleGeoFence,
      getUsersByPhone,
      checkAutoKeys,
      requestAccess,
      respondToAccessRequest,
      completeAppointment,
      performEmergencyAccess,
      updateEmergencyInfo,
      toggleRecordEmergency,
      submitLabRequest,
      respondToLabRequest
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};