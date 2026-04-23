from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from database import get_db
from models import User, Patient, UserRole
from schemas import PatientResponse, PatientUpdate
from auth import get_current_user, require_admin_or_doctor, require_admin

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.get("/", response_model=List[PatientResponse])
async def list_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_doctor)
):
    """List all patients (Admin/Doctor only)."""
    patients = db.query(Patient).options(joinedload(Patient.user)).all()
    return patients


@router.get("/me", response_model=PatientResponse)
async def get_my_patient_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's patient profile."""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can access this endpoint"
        )
    
    patient = db.query(Patient).options(joinedload(Patient.user)).filter(
        Patient.user_id == current_user.id
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    return patient


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific patient by ID."""
    patient = db.query(Patient).options(joinedload(Patient.user)).filter(
        Patient.id == patient_id
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Patients can only view their own profile
    if current_user.role == UserRole.PATIENT and patient.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a patient's profile."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Only the patient themselves or admin can update
    if current_user.role == UserRole.PATIENT and patient.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update fields
    update_data = patient_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)
    
    db.commit()
    db.refresh(patient)
    
    # Reload with user relationship
    patient = db.query(Patient).options(joinedload(Patient.user)).filter(
        Patient.id == patient_id
    ).first()
    
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete a patient (Admin only)."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Delete associated user as well
    user = db.query(User).filter(User.id == patient.user_id).first()
    
    db.delete(patient)
    if user:
        db.delete(user)
    db.commit()
    
    return None
