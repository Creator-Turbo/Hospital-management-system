/**
 * Authentication Utilities
 */

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

/**
 * Check if user is authenticated
 * @returns {boolean} True if token exists
 */
function isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
}

/**
 * Set authentication token
 * @param {string} token - JWT token
 */
function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Get authentication token
 * @returns {string|null} JWT token
 */
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Clear authentication data and redirect to login
 */
function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = 'login.html';
}

/**
 * Get current user from storage
 * @returns {object|null} User object
 */
function getCurrentUser() {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
}

/**
 * Set current user in storage
 * @param {object} user - User object
 */
function setCurrentUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Fetch and store current user data
 * @returns {Promise<object>} User object
 */
async function fetchCurrentUser() {
    try {
        const user = await api.get('/api/auth/me');
        setCurrentUser(user);
        return user;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        logout();
        return null;
    }
}

/**
 * Check if user has required role
 * @param {string|string[]} roles - Required role(s)
 * @returns {boolean} True if user has role
 */
function hasRole(roles) {
    const user = getCurrentUser();
    if (!user) return false;
    
    if (Array.isArray(roles)) {
        return roles.includes(user.role);
    }
    return user.role === roles;
}

/**
 * Require authentication for a page
 * Redirects to login if not authenticated
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

/**
 * Initialize page with auth check and UI setup
 * @param {function} callback - Callback after auth check
 */
async function initPage(callback) {
    if (!requireAuth()) return;
    
    // Fetch user if not in storage
    let user = getCurrentUser();
    if (!user) {
        user = await fetchCurrentUser();
        if (!user) return;
    }
    
    // Update UI with user info
    updateUserUI(user);
    
    // Setup sidebar toggle
    setupSidebar();
    
    // Setup logout button
    setupLogout();
    
    // Apply role-based visibility
    applyRoleVisibility(user.role);
    
    // Call page-specific initialization
    if (callback) {
        callback(user);
    }
}

/**
 * Update UI elements with user information
 * @param {object} user - User object
 */
function updateUserUI(user) {
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    
    if (userNameEl) {
        userNameEl.textContent = user.full_name;
    }
    
    if (userRoleEl) {
        userRoleEl.textContent = user.role;
    }
}

/**
 * Apply role-based visibility to elements
 * Elements with data-role attribute will be shown/hidden based on user role
 * @param {string} userRole - Current user's role
 */
function applyRoleVisibility(userRole) {
    const roleElements = document.querySelectorAll('[data-role]');
    
    roleElements.forEach(el => {
        const allowedRoles = el.dataset.role.split(',').map(r => r.trim());
        
        if (!allowedRoles.includes(userRole)) {
            el.style.display = 'none';
        } else {
            el.style.display = '';
        }
    });
}

/**
 * Setup sidebar toggle for mobile
 */
function setupSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }
}

/**
 * Setup logout button
 */
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}
