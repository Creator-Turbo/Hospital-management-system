/**
 * Doctors Page Logic
 */

let doctorsData = [];
let currentDoctorId = null;

// Initialize page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initPage(initDoctors);
});

/**
 * Initialize doctors page
 * @param {object} user - Current user
 */
async function initDoctors(user) {
    // Show add doctor button for admins
    if (user.role === 'admin') {
        const addBtn = document.getElementById('addDoctorBtn');
        if (addBtn) addBtn.style.display = 'flex';
    }
    
    // Setup search and filter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterDoctors, 300));
    }
    
    const specFilter = document.getElementById('specializationFilter');
    if (specFilter) {
        specFilter.addEventListener('change', filterDoctors);
    }
    
    // Load doctors
    await loadDoctors();
}

/**
 * Load doctors from API
 */
async function loadDoctors() {
    const grid = document.getElementById('doctorsGrid');
    
    try {
        doctorsData = await api.get('/api/doctors');
        renderDoctors(doctorsData);
    } catch (error) {
        console.error('Failed to load doctors:', error);
        grid.innerHTML = `<div class="loading-state">Failed to load doctors</div>`;
        showToast('Failed to load doctors', 'error');
    }
}

/**
 * Render doctors grid
 * @param {array} doctors - Doctors array
 */
function renderDoctors(doctors) {
    const grid = document.getElementById('doctorsGrid');
    
    if (doctors.length === 0) {
        grid.innerHTML = `<div class="loading-state">No doctors found</div>`;
        return;
    }
    
    grid.innerHTML = doctors.map(doctor => `
        <div class="doctor-card">
            <div class="doctor-card-header">
                <div class="doctor-avatar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                        <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                        <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                        <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                        <path d="M9 9h.01"></path>
                        <path d="M15 9h.01"></path>
                    </svg>
                </div>
                <div class="doctor-card-info">
                    <h3>Dr. ${doctor.user?.full_name || 'Unknown'}</h3>
                    <p class="specialization">${doctor.specialization}</p>
                </div>
            </div>
            <div class="doctor-card-details">
                <span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    ${doctor.phone || 'Not provided'}
                </span>
                <span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M8 2v4"></path>
                        <path d="M16 2v4"></path>
                        <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                        <path d="M3 10h18"></path>
                    </svg>
                    ${doctor.available_days || 'Schedule not set'}
                </span>
            </div>
            <div class="doctor-card-actions">
                <button class="btn btn-sm btn-secondary" onclick="viewDoctor(${doctor.id})" style="flex: 1;">
                    View Details
                </button>
                <a href="appointments.html?doctor=${doctor.id}" class="btn btn-sm btn-primary" style="flex: 1;">
                    Book Now
                </a>
            </div>
        </div>
    `).join('');
}

/**
 * Filter doctors based on search and specialization
 */
function filterDoctors() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const specFilter = document.getElementById('specializationFilter').value;
    
    const filtered = doctorsData.filter(doctor => {
        const name = doctor.user?.full_name?.toLowerCase() || '';
        const specialization = doctor.specialization?.toLowerCase() || '';
        
        const matchesSearch = name.includes(searchTerm) || specialization.includes(searchTerm);
        const matchesSpec = !specFilter || doctor.specialization === specFilter;
        
        return matchesSearch && matchesSpec;
    });
    
    renderDoctors(filtered);
}

/**
 * View doctor details
 * @param {number} doctorId - Doctor ID
 */
function viewDoctor(doctorId) {
    const doctor = doctorsData.find(d => d.id === doctorId);
    if (!doctor) return;
    
    currentDoctorId = doctorId;
    
    // Populate modal fields
    document.getElementById('doctorName').textContent = `Dr. ${doctor.user?.full_name || 'Unknown'}`;
    document.getElementById('doctorSpecialization').textContent = doctor.specialization;
    document.getElementById('doctorEmail').textContent = doctor.user?.email || '-';
    document.getElementById('doctorPhone').textContent = doctor.phone || '-';
    document.getElementById('doctorLicense').textContent = doctor.license_number || '-';
    document.getElementById('doctorAvailableDays').textContent = doctor.available_days || 'Not specified';
    
    // Update book appointment link
    document.getElementById('bookWithDoctorBtn').href = `appointments.html?doctor=${doctor.id}`;
    
    // Show modal
    document.getElementById('doctorModal').classList.add('active');
}

/**
 * Close doctor modal
 */
function closeModal() {
    document.getElementById('doctorModal').classList.remove('active');
    currentDoctorId = null;
}

/**
 * Open add doctor modal (Admin only)
 */
function openAddDoctorModal() {
    document.getElementById('addDoctorForm').reset();
    document.getElementById('addDoctorError').style.display = 'none';
    document.getElementById('addDoctorModal').classList.add('active');
}

/**
 * Close add doctor modal
 */
function closeAddDoctorModal() {
    document.getElementById('addDoctorModal').classList.remove('active');
}

/**
 * Save new doctor
 */
async function saveNewDoctor() {
    const btn = document.getElementById('saveDoctorBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const errorDiv = document.getElementById('addDoctorError');
    
    // Show loading state
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    btn.disabled = true;
    errorDiv.style.display = 'none';
    
    try {
        // First, register the user with doctor role
        const userData = {
            full_name: document.getElementById('newDoctorName').value,
            email: document.getElementById('newDoctorEmail').value,
            password: document.getElementById('newDoctorPassword').value,
            role: 'doctor'
        };
        
        const newUser = await api.post('/api/auth/register', userData);
        
        // Then create doctor profile
        const doctorData = {
            user_id: newUser.id,
            specialization: document.getElementById('newDoctorSpecialization').value,
            license_number: document.getElementById('newDoctorLicense').value,
            phone: document.getElementById('newDoctorPhone').value || null,
            available_days: document.getElementById('newDoctorAvailableDays').value || null
        };
        
        await api.post('/api/doctors', doctorData);
        
        showToast('Doctor added successfully', 'success');
        closeAddDoctorModal();
        await loadDoctors();
    } catch (error) {
        errorDiv.textContent = error.message || 'Failed to add doctor';
        errorDiv.style.display = 'block';
    } finally {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btn.disabled = false;
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
