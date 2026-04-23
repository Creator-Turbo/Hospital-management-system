/**
 * Appointments Page Logic
 */

let appointmentsData = [];
let doctorsData = [];
let patientsData = [];
let currentUser = null;
let updateAppointmentId = null;

// Initialize page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initPage(initAppointments);
});

/**
 * Initialize appointments page
 * @param {object} user - Current user
 */
async function initAppointments(user) {
    currentUser = user;
    
    // Setup status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterAppointments);
    }
    
    // Load data
    await Promise.all([
        loadAppointments(),
        loadDoctors(),
        loadPatientsIfNeeded()
    ]);
    
    // Check URL parameters for pre-selection
    checkUrlParameters();
    
    // Auto-open new appointment modal if action=new
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'new') {
        openNewAppointmentModal();
    }
}

/**
 * Load appointments from API
 */
async function loadAppointments() {
    const tableBody = document.getElementById('appointmentsTable');
    
    try {
        appointmentsData = await api.get('/api/appointments');
        renderAppointments(appointmentsData);
    } catch (error) {
        console.error('Failed to load appointments:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">Failed to load appointments</td>
            </tr>
        `;
        showToast('Failed to load appointments', 'error');
    }
}

/**
 * Load doctors for the dropdown
 */
async function loadDoctors() {
    try {
        doctorsData = await api.get('/api/doctors');
        populateDoctorSelect();
    } catch (error) {
        console.error('Failed to load doctors:', error);
    }
}

/**
 * Load patients if user is admin or doctor
 */
async function loadPatientsIfNeeded() {
    if (currentUser.role === 'patient') {
        // Hide patient select for patients
        const patientGroup = document.getElementById('patientSelectGroup');
        if (patientGroup) patientGroup.style.display = 'none';
        return;
    }
    
    try {
        patientsData = await api.get('/api/patients');
        populatePatientSelect();
    } catch (error) {
        console.error('Failed to load patients:', error);
    }
}

/**
 * Populate doctor select dropdown
 */
function populateDoctorSelect() {
    const select = document.getElementById('appointmentDoctor');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select doctor</option>' + 
        doctorsData.map(doctor => `
            <option value="${doctor.id}">
                Dr. ${doctor.user?.full_name || 'Unknown'} - ${doctor.specialization}
            </option>
        `).join('');
}

/**
 * Populate patient select dropdown
 */
function populatePatientSelect() {
    const select = document.getElementById('appointmentPatient');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select patient</option>' + 
        patientsData.map(patient => `
            <option value="${patient.id}">
                ${patient.user?.full_name || 'Unknown'} (${patient.user?.email || ''})
            </option>
        `).join('');
}

/**
 * Check URL parameters for pre-selection
 */
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    const doctorId = urlParams.get('doctor');
    if (doctorId) {
        const select = document.getElementById('appointmentDoctor');
        if (select) select.value = doctorId;
    }
}

/**
 * Render appointments table
 * @param {array} appointments - Appointments array
 */
function renderAppointments(appointments) {
    const tableBody = document.getElementById('appointmentsTable');
    
    if (appointments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">No appointments found</td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = appointments.map(appointment => `
        <tr>
            <td>${formatDateTime(appointment.date_time)}</td>
            <td>${appointment.patient?.user?.full_name || 'Unknown'}</td>
            <td>Dr. ${appointment.doctor?.user?.full_name || 'Unknown'}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(appointment.status)}">
                    ${appointment.status}
                </span>
            </td>
            <td>${appointment.notes || '-'}</td>
            <td>
                <div class="table-actions">
                    ${getActionButtons(appointment)}
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Get action buttons based on appointment status and user role
 * @param {object} appointment - Appointment object
 * @returns {string} HTML for action buttons
 */
function getActionButtons(appointment) {
    const buttons = [];
    
    // Update button for scheduled appointments
    if (appointment.status === 'scheduled') {
        if (currentUser.role === 'patient') {
            buttons.push(`
                <button class="btn btn-sm btn-danger" onclick="cancelAppointment(${appointment.id})">
                    Cancel
                </button>
            `);
        } else {
            buttons.push(`
                <button class="btn btn-sm btn-secondary" onclick="openUpdateModal(${appointment.id})">
                    Update
                </button>
            `);
        }
    }
    
    return buttons.join('');
}

/**
 * Filter appointments by status
 */
function filterAppointments() {
    const statusFilter = document.getElementById('statusFilter').value;
    
    if (!statusFilter) {
        renderAppointments(appointmentsData);
        return;
    }
    
    const filtered = appointmentsData.filter(a => a.status === statusFilter);
    renderAppointments(filtered);
}

/**
 * Open new appointment modal
 */
function openNewAppointmentModal() {
    // Reset form
    document.getElementById('newAppointmentForm').reset();
    document.getElementById('newAppointmentError').style.display = 'none';
    
    // Set minimum date to today
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }
    
    // Re-check URL parameters for doctor pre-selection
    checkUrlParameters();
    
    // Show modal
    document.getElementById('newAppointmentModal').classList.add('active');
}

/**
 * Close new appointment modal
 */
function closeNewAppointmentModal() {
    document.getElementById('newAppointmentModal').classList.remove('active');
}

/**
 * Book new appointment
 */
async function bookAppointment() {
    const btn = document.getElementById('bookAppointmentBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const errorDiv = document.getElementById('newAppointmentError');
    
    // Show loading state
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    btn.disabled = true;
    errorDiv.style.display = 'none';
    
    try {
        const date = document.getElementById('appointmentDate').value;
        const time = document.getElementById('appointmentTime').value;
        const dateTime = new Date(`${date}T${time}`).toISOString();
        
        let patientId;
        if (currentUser.role === 'patient') {
            // Get patient ID for current user
            const myProfile = await api.get('/api/patients/me');
            patientId = myProfile.id;
        } else {
            patientId = document.getElementById('appointmentPatient').value;
            if (!patientId) {
                throw new Error('Please select a patient');
            }
        }
        
        const doctorId = document.getElementById('appointmentDoctor').value;
        if (!doctorId) {
            throw new Error('Please select a doctor');
        }
        
        const data = {
            patient_id: parseInt(patientId),
            doctor_id: parseInt(doctorId),
            date_time: dateTime,
            notes: document.getElementById('appointmentNotes').value || null
        };
        
        await api.post('/api/appointments', data);
        
        showToast('Appointment booked successfully', 'success');
        closeNewAppointmentModal();
        await loadAppointments();
    } catch (error) {
        errorDiv.textContent = error.message || 'Failed to book appointment';
        errorDiv.style.display = 'block';
    } finally {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btn.disabled = false;
    }
}

/**
 * Open update appointment modal
 * @param {number} appointmentId - Appointment ID
 */
function openUpdateModal(appointmentId) {
    const appointment = appointmentsData.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    updateAppointmentId = appointmentId;
    
    document.getElementById('updateAppointmentId').value = appointmentId;
    document.getElementById('updateStatus').value = appointment.status;
    document.getElementById('updateNotes').value = appointment.notes || '';
    document.getElementById('updateAppointmentError').style.display = 'none';
    
    document.getElementById('updateAppointmentModal').classList.add('active');
}

/**
 * Close update modal
 */
function closeUpdateModal() {
    document.getElementById('updateAppointmentModal').classList.remove('active');
    updateAppointmentId = null;
}

/**
 * Save appointment update
 */
async function saveAppointmentUpdate() {
    const btn = document.getElementById('saveUpdateBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const errorDiv = document.getElementById('updateAppointmentError');
    
    // Show loading state
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    btn.disabled = true;
    errorDiv.style.display = 'none';
    
    try {
        const data = {
            status: document.getElementById('updateStatus').value,
            notes: document.getElementById('updateNotes').value || null
        };
        
        await api.put(`/api/appointments/${updateAppointmentId}`, data);
        
        showToast('Appointment updated successfully', 'success');
        closeUpdateModal();
        await loadAppointments();
    } catch (error) {
        errorDiv.textContent = error.message || 'Failed to update appointment';
        errorDiv.style.display = 'block';
    } finally {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btn.disabled = false;
    }
}

/**
 * Cancel appointment (for patients)
 * @param {number} appointmentId - Appointment ID
 */
async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }
    
    try {
        await api.put(`/api/appointments/${appointmentId}`, {
            status: 'cancelled'
        });
        
        showToast('Appointment cancelled', 'success');
        await loadAppointments();
    } catch (error) {
        showToast(error.message || 'Failed to cancel appointment', 'error');
    }
}
