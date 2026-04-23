from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from database import get_db
from models import User, Doctor, UserRole
from schemas import DoctorResponse, DoctorCreate, DoctorUpdate, UserCreate
from auth import get_current_user, require_admin, get_password_hash

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])


@router.get("/", response_model=List[DoctorResponse])
async def list_doctors(
    specialization: str = None,
    db: Session = Depends(get_db)
):
    """List all doctors, optionally filtered by specialization."""
    query = db.query(Doctor).options(joinedload(Doctor.user))
    
    if specialization:
        query = query.filter(Doctor.specialization.ilike(f"%{specialization}%"))
    
    doctors = query.all()
    return doctors


@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(
    doctor_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific doctor by ID."""
    doctor = db.query(Doctor).options(joinedload(Doctor.user)).filter(
        Doctor.id == doctor_id
    ).first()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    return doctor


@router.post("/", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def create_doctor(
    doctor_data: DoctorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new doctor profile for an existing user (Admin only)."""
    # Check if user exists and is a doctor role
    user = db.query(User).filter(User.id == doctor_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must have doctor role"
        )
    
    # Check if doctor profile already exists
    existing_doctor = db.query(Doctor).filter(Doctor.user_id == doctor_data.user_id).first()
    if existing_doctor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doctor profile already exists for this user"
        )
    
    # Check if license number is unique
    existing_license = db.query(Doctor).filter(
        Doctor.license_number == doctor_data.license_number
    ).first()
    if existing_license:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="License number already registered"
        )
    
    # Create doctor profile
    new_doctor = Doctor(
        user_id=doctor_data.user_id,
        specialization=doctor_data.specialization,
        license_number=doctor_data.license_number,
        phone=doctor_data.phone,
        available_days=doctor_data.available_days
    )
    db.add(new_doctor)
    db.commit()
    db.refresh(new_doctor)
    
    # Reload with user relationship
    doctor = db.query(Doctor).options(joinedload(Doctor.user)).filter(
        Doctor.id == new_doctor.id
    ).first()
    
    return doctor


@router.post("/register", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def register_doctor(
    email: str,
    password: str,
    full_name: str,
    specialization: str,
    license_number: str,
    phone: str = None,
    available_days: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Register a new doctor with user account (Admin only)."""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if license number is unique
    existing_license = db.query(Doctor).filter(
        Doctor.license_number == license_number
    ).first()
    if existing_license:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="License number already registered"
        )
    
    # Create user with doctor role
    hashed_password = get_password_hash(password)
    new_user = User(
        email=email,
        password_hash=hashed_password,
        full_name=full_name,
        role=UserRole.DOCTOR
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create doctor profile
    new_doctor = Doctor(
        user_id=new_user.id,
        specialization=specialization,
        license_number=license_number,
        phone=phone,
        available_days=available_days
    )
    db.add(new_doctor)
    db.commit()
    db.refresh(new_doctor)
    
    # Reload with user relationship
    doctor = db.query(Doctor).options(joinedload(Doctor.user)).filter(
        Doctor.id == new_doctor.id
    ).first()
    
    return doctor


@router.put("/{doctor_id}", response_model=DoctorResponse)
async def update_doctor(
    doctor_id: int,
    doctor_data: DoctorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a doctor's profile."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    # Only the doctor themselves or admin can update
    if current_user.role != UserRole.ADMIN and doctor.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update fields
    update_data = doctor_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(doctor, field, value)
    
    db.commit()
    db.refresh(doctor)
    
    # Reload with user relationship
    doctor = db.query(Doctor).options(joinedload(Doctor.user)).filter(
        Doctor.id == doctor_id
    ).first()
    
    return doctor
