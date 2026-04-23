/**
 * Dashboard Page Logic
 */

// Initialize page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initPage(initDashboard);
});

/**
 * Initialize dashboard
 * @param {object} user - Current user
 */
async function initDashboard(user) {
    await Promise.all([
        loadDashboardStats(),
        loadRecentAppointments()
    ]);
}

/**
 * Load dashboard statistics
 */
async function loadDashboardStats() {
    try {
        const stats = await api.get('/api/appointments/dashboard/stats');
        
        document.getElementById('totalPatients').textContent = stats.total_patients || 0;
        document.getElementById('totalDoctors').textContent = stats.total_doctors || 0;
        document.getElementById('totalAppointments').textContent = stats.total_appointments || 0;
        document.getElementById('pendingAppointments').textContent = stats.pending_appointments || 0;
    } catch (error) {
        console.error('Failed to load stats:', error);
        showToast('Failed to load dashboard statistics', 'error');
    }
}

/**
 * Load recent appointments
 */
async function loadRecentAppointments() {
    const tableBody = document.getElementById('recentAppointments');
    
    try {
        const appointments = await api.get('/api/appointments');
        
        if (appointments.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">No appointments found</td>
                </tr>
            `;
            return;
        }
        
        // Show only the 5 most recent appointments
        const recentAppointments = appointments.slice(0, 5);
        
        tableBody.innerHTML = recentAppointments.map(appointment => `
            <tr>
                <td>${formatDateTime(appointment.date_time)}</td>
                <td>${appointment.patient?.user?.full_name || 'Unknown'}</td>
                <td>${appointment.doctor?.user?.full_name || 'Unknown'}</td>
                <td>
                    <span class="badge ${getStatusBadgeClass(appointment.status)}">
                        ${appointment.status}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load appointments:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">Failed to load appointments</td>
            </tr>
        `;
    }
}
