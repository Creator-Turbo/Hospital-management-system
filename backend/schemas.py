from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    PATIENT = "patient"


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ---------- User Schemas ----------
class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.PATIENT


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None


# ---------- Patient Schemas ----------
class PatientBase(BaseModel):
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None


class PatientCreate(PatientBase):
    user_id: int


class PatientUpdate(PatientBase):
    pass


class PatientResponse(PatientBase):
    id: int
    user_id: int
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# ---------- Doctor Schemas ----------
class DoctorBase(BaseModel):
    specialization: str = Field(..., min_length=2, max_length=100)
    license_number: str = Field(..., min_length=2, max_length=50)
    phone: Optional[str] = None
    available_days: Optional[str] = None


class DoctorCreate(DoctorBase):
    user_id: int


class DoctorUpdate(BaseModel):
    specialization: Optional[str] = None
    phone: Optional[str] = None
    available_days: Optional[str] = None


class DoctorResponse(DoctorBase):
    id: int
    user_id: int
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# ---------- Appointment Schemas ----------
class AppointmentBase(BaseModel):
    date_time: datetime
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    patient_id: int
    doctor_id: int


class AppointmentUpdate(BaseModel):
    date_time: Optional[datetime] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None


class AppointmentResponse(AppointmentBase):
    id: int
    patient_id: int
    doctor_id: int
    status: AppointmentStatus
    created_at: datetime
    patient: Optional[PatientResponse] = None
    doctor: Optional[DoctorResponse] = None

    class Config:
        from_attributes = True


# ---------- Dashboard Schemas ----------
class DashboardStats(BaseModel):
    total_patients: int
    total_doctors: int
    total_appointments: int
    pending_appointments: int
