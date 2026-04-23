# Hospital Management System (HMS)

A full-stack Hospital Management System with Python FastAPI backend and vanilla HTML/CSS/JavaScript frontend.

## Features

- **Authentication**: JWT-based authentication with role-based access control
- **Roles**: Admin, Doctor, Patient
- **Patient Management**: CRUD operations for patient records
- **Doctor Management**: View doctors, add new doctors (Admin)
- **Appointment Booking**: Book, view, update, and cancel appointments
- **Dashboard**: Statistics overview with recent activity
- **Responsive Design**: Mobile-friendly interface

## Project Structure

```
/backend/                   # FastAPI Backend
├── main.py                 # Application entry point
├── database.py             # SQLite/SQLAlchemy setup
├── models.py               # ORM models
├── schemas.py              # Pydantic schemas
├── auth.py                 # JWT authentication
├── requirements.txt        # Python dependencies
└── routes/
    ├── auth_routes.py      # Authentication endpoints
    ├── patient_routes.py   # Patient CRUD
    ├── doctor_routes.py    # Doctor management
    └── appointment_routes.py # Appointment booking

/frontend/                  # Vanilla HTML/CSS/JS Frontend
├── index.html              # Landing/redirect page
├── login.html              # Login page
├── register.html           # Registration page
├── dashboard.html          # Main dashboard
├── patients.html           # Patient management
├── doctors.html            # Doctor listing
├── appointments.html       # Appointment booking
├── css/
│   └── styles.css          # Responsive styles
└── js/
    ├── api.js              # API client
    ├── auth.js             # Authentication utilities
    ├── dashboard.js        # Dashboard logic
    ├── patients.js         # Patient management
    ├── doctors.js          # Doctor listing
    └── appointments.js     # Appointment booking
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Run the server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

The API will be available at `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Serve the static files (choose one):
   ```bash
   # Python 3
   python -m http.server 3000
   
   # Or use any static file server like live-server
   npx live-server --port=3000
   ```

3. Open `http://localhost:3000` in your browser

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user profile

### Patients
- `GET /api/patients` - List all patients (Admin/Doctor)
- `GET /api/patients/me` - Get my patient profile (Patient)
- `GET /api/patients/{id}` - Get patient by ID
- `PUT /api/patients/{id}` - Update patient
- `DELETE /api/patients/{id}` - Delete patient (Admin)

### Doctors
- `GET /api/doctors` - List all doctors
- `GET /api/doctors/{id}` - Get doctor by ID
- `POST /api/doctors` - Create doctor profile (Admin)
- `POST /api/doctors/register` - Register new doctor (Admin)
- `PUT /api/doctors/{id}` - Update doctor

### Appointments
- `GET /api/appointments` - List appointments (filtered by role)
- `GET /api/appointments/{id}` - Get appointment by ID
- `POST /api/appointments` - Book new appointment
- `PUT /api/appointments/{id}` - Update appointment
- `DELETE /api/appointments/{id}` - Delete appointment (Admin/Doctor)
- `GET /api/appointments/dashboard/stats` - Get dashboard statistics

## Role-Based Access

| Feature | Admin | Doctor | Patient |
|---------|-------|--------|---------|
| View Dashboard | Yes | Yes | Yes |
| Manage Patients | Yes | View Only | Own Only |
| Manage Doctors | Yes | No | View Only |
| Book Appointments | Yes | Yes | Yes |
| Update Appointment Status | Yes | Own Only | Cancel Only |
| Delete Patients | Yes | No | No |

## Security Features

- Password hashing with bcrypt
- JWT tokens with 24-hour expiration
- Role-based access control
- Double-booking prevention for appointments
- Input validation with Pydantic schemas

## Default Accounts

After starting the application, you can register accounts with any of these roles:
- **Admin**: Full system access
- **Doctor**: Patient and appointment management
- **Patient**: View doctors, book appointments, manage own profile
