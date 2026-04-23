/**
 * Patients Page Logic
 */

let patientsData = [];
let currentPatientId = null;
let deletePatientId = null;

// Initialize page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initPage(initPatients);
});

/**
 * Initialize patients page
 * @param {object} user - Current user
 */
async function initPatients(user) {
    // Check if user has permission
    if (!hasRole(['admin', 'doctor'])) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Setup search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterPatients, 300));
    }
    
    // Load patients
    await loadPatients();
}

/**
 * Load patients from API
 */
async function loadPatients() {
    const tableBody = document.getElementById('patientsTable');
    
    try {
        patientsData = await api.get('/api/patients');
        renderPatients(patientsData);
    } catch (error) {
        console.error('Failed to load patients:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">Failed to load patients</td>
            </tr>
        `;
        showToast('Failed to load patients', 'error');
    }
}

/**
 * Render patients table
 * @param {array} patients - Patients array
 */
function renderPatients(patients) {
    const tableBody = document.getElementById('patientsTable');
    const user = getCurrentUser();
    const isAdmin = user?.role === 'admin';
    
    if (patients.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">No patients found</td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = patients.map(patient => `
        <tr>
            <td>${patient.user?.full_name || 'Unknown'}</td>
            <td>${patient.user?.email || '-'}</td>
            <td>${patient.phone || '-'}</td>
            <td>${patient.gender || '-'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-secondary" onclick="viewPatient(${patient.id})">
                        View
                    </button>
                    ${isAdmin ? `
                        <button class="btn btn-sm btn-danger" onclick="deletePatient(${patient.id})">
                            Delete
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Filter patients based on search input
 */
function filterPatients() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    const filtered = patientsData.filter(patient => {
        const name = patient.user?.full_name?.toLowerCase() || '';
        const email = patient.user?.email?.toLowerCase() || '';
        const phone = patient.phone?.toLowerCase() || '';
        
        return name.includes(searchTerm) || 
               email.includes(searchTerm) || 
               phone.includes(searchTerm);
    });
    
    renderPatients(filtered);
}

/**
 * View patient details
 * @param {number} patientId - Patient ID
 */
function viewPatient(patientId) {
    const patient = patientsData.find(p => p.id === patientId);
    if (!patient) return;
    
    currentPatientId = patientId;
    
    // Populate modal fields
    document.getElementById('patientId').value = patient.id;
    document.getElementById('patientName').value = patient.user?.full_name || '';
    document.getElementById('patientEmail').value = patient.user?.email || '';
    document.getElementById('patientPhone').value = patient.phone || '';
    document.getElementById('patientGender').value = patient.gender || '';
    document.getElementById('patientDob').value = formatDateForInput(patient.date_of_birth);
    document.getElementById('patientAddress').value = patient.address || '';
    document.getElementById('patientMedicalHistory').value = patient.medical_history || '';
    
    // Clear error message
    document.getElementById('modalError').style.display = 'none';
    
    // Show modal
    document.getElementById('patientModal').classList.add('active');
}

/**
 * Close patient modal
 */
function closeModal() {
    document.getElementById('patientModal').classList.remove('active');
    currentPatientId = null;
}

/**
 * Save patient changes
 */
async function savePatient() {
    const btn = document.getElementById('savePatientBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const errorDiv = document.getElementById('modalError');
    
    // Show loading state
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    btn.disabled = true;
    errorDiv.style.display = 'none';
    
    try {
        const patientId = document.getElementById('patientId').value;
        const dobValue = document.getElementById('patientDob').value;
        
        const data = {
            phone: document.getElementById('patientPhone').value || null,
            gender: document.getElementById('patientGender').value || null,
            date_of_birth: dobValue ? new Date(dobValue).toISOString() : null,
            address: document.getElementById('patientAddress').value || null,
            medical_history: document.getElementById('patientMedicalHistory').value || null,
        };
        
        await api.put(`/api/patients/${patientId}`, data);
        
        showToast('Patient updated successfully', 'success');
        closeModal();
        await loadPatients();
    } catch (error) {
        errorDiv.textContent = error.message || 'Failed to update patient';
        errorDiv.style.display = 'block';
    } finally {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btn.disabled = false;
    }
}

/**
 * Open delete confirmation modal
 * @param {number} patientId - Patient ID
 */
function deletePatient(patientId) {
    deletePatientId = patientId;
    document.getElementById('deleteModal').classList.add('active');
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    deletePatientId = null;
}

/**
 * Confirm and execute delete
 */
async function confirmDelete() {
    if (!deletePatientId) return;
    
    try {
        await api.delete(`/api/patients/${deletePatientId}`);
        
        showToast('Patient deleted successfully', 'success');
        closeDeleteModal();
        await loadPatients();
    } catch (error) {
        showToast(error.message || 'Failed to delete patient', 'error');
        closeDeleteModal();
    }
}

/**
 * Debounce helper function
 * @param {function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
