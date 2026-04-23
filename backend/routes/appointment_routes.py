from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime, timedelta

from database import get_db
from models import User, Patient, Doctor, Appointment, UserRole, AppointmentStatus
from schemas import AppointmentResponse, AppointmentCreate, AppointmentUpdate, DashboardStats
from auth import get_current_user, require_admin_or_doctor

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


@router.get("/", response_model=List[AppointmentResponse])
async def list_appointments(
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List appointments based on user role."""
    query = db.query(Appointment).options(
        joinedload(Appointment.patient).joinedload(Patient.user),
        joinedload(Appointment.doctor).joinedload(Doctor.user)
    )
    
    # Filter by role
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if patient:
            query = query.filter(Appointment.patient_id == patient.id)
        else:
            return []
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if doctor:
            query = query.filter(Appointment.doctor_id == doctor.id)
        else:
            return []
    # Admin sees all appointments
    
    # Optional status filter
    if status_filter:
        try:
            status_enum = AppointmentStatus(status_filter)
            query = query.filter(Appointment.status == status_enum)
        except ValueError:
            pass
    
    appointments = query.order_by(Appointment.date_time.desc()).all()
    return appointments


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific appointment by ID."""
    appointment = db.query(Appointment).options(
        joinedload(Appointment.patient).joinedload(Patient.user),
        joinedload(Appointment.doctor).joinedload(Doctor.user)
    ).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check access permissions
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or appointment.patient_id != patient.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or appointment.doctor_id != doctor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    return appointment


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    appointment_data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new appointment with double-booking prevention."""
    # Verify patient exists
    patient = db.query(Patient).filter(Patient.id == appointment_data.patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Verify doctor exists
    doctor = db.query(Doctor).filter(Doctor.id == appointment_data.doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    # Patients can only book for themselves
    if current_user.role == UserRole.PATIENT:
        user_patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not user_patient or user_patient.id != appointment_data.patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patients can only book appointments for themselves"
            )
    
    # Double-booking prevention: Check if doctor has appointment within 30 minutes
    appointment_time = appointment_data.date_time
    time_window_start = appointment_time - timedelta(minutes=30)
    time_window_end = appointment_time + timedelta(minutes=30)
    
    existing_appointment = db.query(Appointment).filter(
        Appointment.doctor_id == appointment_data.doctor_id,
        Appointment.date_time >= time_window_start,
        Appointment.date_time <= time_window_end,
        Appointment.status != AppointmentStatus.CANCELLED
    ).first()
    
    if existing_appointment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Doctor already has an appointment within this time slot"
        )
    
    # Create appointment
    new_appointment = Appointment(
        patient_id=appointment_data.patient_id,
        doctor_id=appointment_data.doctor_id,
        date_time=appointment_data.date_time,
        notes=appointment_data.notes,
        status=AppointmentStatus.SCHEDULED
    )
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    
    # Reload with relationships
    appointment = db.query(Appointment).options(
        joinedload(Appointment.patient).joinedload(Patient.user),
        joinedload(Appointment.doctor).joinedload(Doctor.user)
    ).filter(Appointment.id == new_appointment.id).first()
    
    return appointment


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    appointment_data: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an appointment's status or details."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check access permissions
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or appointment.patient_id != patient.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        # Patients can only cancel their appointments
        if appointment_data.status and appointment_data.status != AppointmentStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patients can only cancel appointments"
            )
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or appointment.doctor_id != doctor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    # If changing date_time, check for conflicts
    if appointment_data.date_time:
        time_window_start = appointment_data.date_time - timedelta(minutes=30)
        time_window_end = appointment_data.date_time + timedelta(minutes=30)
        
        existing_appointment = db.query(Appointment).filter(
            Appointment.doctor_id == appointment.doctor_id,
            Appointment.id != appointment_id,
            Appointment.date_time >= time_window_start,
            Appointment.date_time <= time_window_end,
            Appointment.status != AppointmentStatus.CANCELLED
        ).first()
        
        if existing_appointment:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Doctor already has an appointment within this time slot"
            )
    
    # Update fields
    update_data = appointment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(appointment, field, value)
    
    db.commit()
    db.refresh(appointment)
    
    # Reload with relationships
    appointment = db.query(Appointment).options(
        joinedload(Appointment.patient).joinedload(Patient.user),
        joinedload(Appointment.doctor).joinedload(Doctor.user)
    ).filter(Appointment.id == appointment_id).first()
    
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_doctor)
):
    """Delete an appointment (Admin/Doctor only)."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Doctors can only delete their own appointments
    if current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or appointment.doctor_id != doctor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    db.delete(appointment)
    db.commit()
    
    return None


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard statistics."""
    total_patients = db.query(Patient).count()
    total_doctors = db.query(Doctor).count()
    total_appointments = db.query(Appointment).count()
    pending_appointments = db.query(Appointment).filter(
        Appointment.status == AppointmentStatus.SCHEDULED
    ).count()
    
    return DashboardStats(
        total_patients=total_patients,
        total_doctors=total_doctors,
        total_appointments=total_appointments,
        pending_appointments=pending_appointments
    )
