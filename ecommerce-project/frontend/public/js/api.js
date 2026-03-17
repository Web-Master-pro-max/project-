// ==================== SEARCH FUNCTIONALITY ====================

function performSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = `/products?search=${encodeURIComponent(query)}`;
        }
    }
}

// Search on Enter key
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
});

// ==================== UTILITY & API FUNCTIONS ====================

const API_BASE_URL = '/api';

// ==================== API CALLS ====================
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        // Handle rate limiting explicitly so we can show a clear message
        if (response.status === 429) {
            throw new Error('Too many requests. Please try again in a moment.');
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            // Non-JSON response (could be HTML error page)
            const text = await response.text();
            result = { 
                error: `Server error: ${response.status}`,
                statusCode: response.status
            };
        }

        if (!response.ok) {
            // Handle authentication errors
            if (response.status === 401) {
                localStorage.removeItem('user');
                window.location.href = '/login';
                throw new Error('Session expired. Please login again.');
            }
            
            // Handle validation errors from express-validator
            if (result.errors && Array.isArray(result.errors)) {
                const errorMessage = result.errors.map(err => err.msg).join(', ');
                throw new Error(errorMessage);
            }
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }

        return result;
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

// Products API
const productsAPI = {
    getAll: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiCall(`/products?${queryString}`);
    },
    getById: (id) => apiCall(`/products/${id}`),
    create: (data) => apiCall('/products', 'POST', data),
    update: (id, data) => apiCall(`/products/${id}`, 'PUT', data),
    delete: (id) => apiCall(`/products/${id}`, 'DELETE'),
    getCategories: () => apiCall('/products/categories/all'),
    uploadImage: (file) => {
        const formData = new FormData();
        formData.append('image', file);
        
        return fetch(`${API_BASE_URL}/products/upload-image`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.status === 401) {
                localStorage.removeItem('user');
                window.location.href = '/login';
                throw new Error('Session expired. Please login again.');
            }
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                throw new Error('Server error: Invalid response format');
            }
        })
        .then(result => {
            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }
            return result;
        });
    }
};

// Cart API
const cartAPI = {
    getCart: () => apiCall('/cart'),
    addItem: (productId, quantity = 1) => 
        apiCall('/cart', 'POST', { product_id: productId, quantity }),
    updateItem: (productId, quantity) => 
        apiCall(`/cart/${productId}`, 'PUT', { quantity }),
    removeItem: (productId) => 
        apiCall(`/cart/${productId}`, 'DELETE'),
    clearCart: () => apiCall('/cart', 'DELETE')
};

// Orders API
const ordersAPI = {
    getAll: () => apiCall('/orders'),
    getById: (id) => apiCall(`/orders/${id}`),
    create: (data) => apiCall('/orders', 'POST', data),
    updateStatus: (id, status) => 
        apiCall(`/orders/${id}`, 'PUT', { status })
};

// Auth API
const authAPI = {
    register: async (data) => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            result = { error: `Server error: ${response.status}` };
        }
        
        if (!response.ok) {
            if (result.errors && Array.isArray(result.errors)) {
                const errorMessage = result.errors.map(err => err.msg).join(', ');
                throw new Error(errorMessage);
            }
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }
        
        return result;
    },
    login: async (data) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            result = { error: `Server error: ${response.status}` };
        }
        
        if (!response.ok) {
            if (result.errors && Array.isArray(result.errors)) {
                const errorMessage = result.errors.map(err => err.msg).join(', ');
                throw new Error(errorMessage);
            }
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }
        
        return result;
    },
    logout: async () => {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            result = { success: true };
        }
        
        return result;
    },
    checkAuth: async () => {
        const response = await fetch(`${API_BASE_URL}/auth/check`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            result = { authenticated: false };
        }
        
        return result;
    }
};

// Users API
const usersAPI = {
    getProfile: () => apiCall('/users/profile'),
    updateProfile: (data) => apiCall('/users/profile', 'PUT', data),
    getAll: () => apiCall('/users')
};

// ==================== DOM UTILITIES ====================

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function createElement(tag, attributes = {}, html = '') {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'class') {
            element.className = value;
        } else if (key === 'style') {
            Object.assign(element.style, value);
        } else {
            element.setAttribute(key, value);
        }
    });

    if (html) {
        element.innerHTML = html;
    }

    return element;
}

// ==================== ALERTS & NOTIFICATIONS ====================

function showAlert(message, type = 'success', duration = 5000) {
    const alertsContainer = $('#alerts-container') || createAlertsContainer();
    
    const alert = createElement('div', {
        class: `alert alert-${type}`
    }, `
        <span>${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
    `);

    alertsContainer.appendChild(alert);

    if (duration) {
        setTimeout(() => alert.remove(), duration);
    }

    return alert;
}

function createAlertsContainer() {
    const container = createElement('div', {
        id: 'alerts-container',
        class: 'alerts-container',
        style: {
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: '999',
            width: '300px'
        }
    });
    document.body.appendChild(container);
    return container;
}

// ==================== LOADING STATE ====================

function showLoading(message = 'Loading...') {
    const loading = createElement('div', {
        id: 'loading-overlay',
        class: 'loading-overlay',
        style: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '9999'
        }
    }, `
        <div style="background: white; padding: 2rem; border-radius: 8px; text-align: center;">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `);

    document.body.appendChild(loading);
    return loading;
}

function hideLoading() {
    const loading = $('#loading-overlay');
    if (loading) {
        loading.remove();
    }
}

// ==================== MODAL FUNCTIONS ====================

function createModal(title, content, actions = []) {
    const existingModal = $('#custom-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = createElement('div', {
        id: 'custom-modal',
        class: 'modal active'
    }, `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">${title}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">${content}</div>
            <div class="modal-footer" id="modal-footer"></div>
        </div>
    `);

    document.body.appendChild(modal);

    const footer = $('#modal-footer');
    actions.forEach(action => {
        const btn = createElement('button', {
            class: `btn btn-${action.style || 'secondary'}`,
            onclick: action.onclick
        }, action.label);
        footer.appendChild(btn);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    return modal;
}

function closeModal() {
    const modal = $('#custom-modal');
    if (modal) {
        modal.remove();
    }
}

// ==================== STORAGE UTILITIES ====================

const storage = {
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Storage error:', error);
        }
    },
    getItem: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Storage error:', error);
            return null;
        }
    },
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Storage error:', error);
        }
    },
    clear: () => {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Storage error:', error);
        }
    }
};

// ==================== NUMBER FORMATTING ====================

function formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(price);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

// ==================== VALIDATION ====================

const validators = {
    email: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    password: (password) => {
        return password.length >= 6;
    },
    name: (name) => {
        return name.trim().length >= 2;
    },
    phone: (phone) => {
        const re = /^[0-9]{10}$/;
        return re.test(phone);
    },
    address: (address) => {
        return address.trim().length >= 5;
    }
};

// ==================== SESSION & AUTH ====================

async function checkUserSession() {
    try {
        const response = await fetch('/api/auth/check', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Important for cookies/sessions
        });
        
        // Handle authentication state even on non-ok responses
        if (response.status === 401) {
            localStorage.removeItem('user');
            stopSessionRefresh();
            return null;
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Invalid response format from auth check');
            return null;
        }
        
        const data = await response.json();
        
        // Store user session data if authenticated
        if (data.authenticated && data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            return data.user;
        } else {
            localStorage.removeItem('user');
            stopSessionRefresh();
            return null;
        }
    } catch (error) {
        console.error('Session check error:', error);
        localStorage.removeItem('user');
        stopSessionRefresh();
        return null;
    }
}

function updateNavBar(user) {
    const authButtons = $('#auth-buttons');
    if (!authButtons) return;

    if (user) {
        authButtons.innerHTML = `
            <div class="nav-links" style="gap: 1rem;">
                <span>${user.name}</span>
                ${user.role === 'admin' ? '<a href="/dashboard">Dashboard</a>' : ''}
                <a href="#" onclick="logout(event)">Logout</a>
            </div>
        `;
    } else {
        authButtons.innerHTML = `
            <div class="nav-links" style="gap: 1rem;">
                <a href="/login" class="btn btn-primary" style="margin: 0;">Login</a>
                <a href="/register" class="btn btn-outline" style="margin: 0;">Register</a>
            </div>
        `;
    }
}

async function logout(event) {
    if (event) event.preventDefault();
    try {
        showLoading('Logging out...');
        stopSessionRefresh();
        await authAPI.logout();
        localStorage.removeItem('user');
        hideLoading();
        showAlert('Logged out successfully', 'success', 2000);
        setTimeout(() => {
            window.location.href = '/';
        }, 500);
    } catch (error) {
        hideLoading();
        stopSessionRefresh();
        localStorage.removeItem('user');
        showAlert('Logged out (with error)', 'info', 2000);
        setTimeout(() => {
            window.location.href = '/';
        }, 500);
    }
}

// ==================== IMAGE UPLOAD FUNCTIONS ====================

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const preview = document.getElementById('file-preview');
    const fileInput = document.getElementById('image-input');
    const previewImg = document.getElementById('preview-img');
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        preview.classList.add('active');
    };
    reader.readAsDataURL(file);
}

async function uploadProductImage() {
    const fileInput = document.getElementById('image-input');
    const file = fileInput?.files[0];
    const uploadMessage = document.getElementById('upload-message');
    const progressBar = document.getElementById('upload-progress');
    
    if (!file) {
        alert('Please select an image file');
        return;
    }
    
    try {
        uploadMessage.className = 'upload-message active';
        uploadMessage.textContent = 'Uploading...';
        progressBar.classList.add('active');
        
        const result = await productsAPI.uploadImage(file);
        
        uploadMessage.className = 'upload-message success active';
        uploadMessage.innerHTML = `<strong>✓ Success!</strong> Image uploaded: ${result.imageUrl}`;
        
        // Store the image URL for use
        window.lastUploadedImageUrl = result.imageUrl;
        
        // Clear input after successful upload
        fileInput.value = '';
        document.getElementById('file-preview').classList.remove('active');
        
        // Auto-close message after 3 seconds
        setTimeout(() => {
            uploadMessage.classList.remove('active');
        }, 3000);
        
    } catch (error) {
        uploadMessage.className = 'upload-message error active';
        uploadMessage.innerHTML = `<strong>✗ Error:</strong> ${error.message}`;
    } finally {
        progressBar.classList.remove('active');
    }
}

// Drag and drop upload
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('image-input');
    const uploadArea = document.querySelector('.upload-form');
    
    if (uploadArea && fileInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.style.borderColor = '#1a4d8c';
                uploadArea.style.background = 'linear-gradient(135deg, #e0f0ff, #d0e8ff)';
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.style.borderColor = '#2874f0';
                uploadArea.style.background = 'linear-gradient(135deg, #f8f9fa, #e8f4f8)';
            });
        });
        
        uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            fileInput.files = files;
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        });
    }
});

// ==================== CART UTILITY ====================

async function updateCartCount() {
    try {
        const response = await fetch('/api/cart');
        if (response.ok) {
            const data = await response.json();
            const count = data.items ? data.items.length : 0;
            const cartCount = $('#cart-count');
            if (cartCount) {
                cartCount.textContent = count;
                cartCount.style.display = count > 0 ? 'flex' : 'none';
            }
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

// ==================== INITIALIZATION ====================

// Session refresh interval
let sessionRefreshInterval = null;
let activityRefreshTimeout = null;
let lastActivityTime = Date.now();
const ACTIVITY_TIMEOUT = 60 * 1000; // 1 minute
const SESSION_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

function startSessionRefresh() {
    // Refresh session every 5 minutes
    if (sessionRefreshInterval) clearInterval(sessionRefreshInterval);
    
    sessionRefreshInterval = setInterval(async () => {
        try {
            const user = await checkUserSession();
            if (!user) {
                console.warn('Session expired, user is logged out');
                stopSessionRefresh();
            }
        } catch (error) {
            console.error('Session refresh failed:', error);
        }
    }, SESSION_REFRESH_INTERVAL);
}

function stopSessionRefresh() {
    if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
        sessionRefreshInterval = null;
    }
    if (activityRefreshTimeout) {
        clearTimeout(activityRefreshTimeout);
        activityRefreshTimeout = null;
    }
}

// Enhanced activity-based session refresh
function setupActivityBasedRefresh() {
    const refreshSessionOnActivity = async () => {
        const now = Date.now();
        if (now - lastActivityTime > ACTIVITY_TIMEOUT) {
            lastActivityTime = now;
            try {
                await checkUserSession();
            } catch (error) {
                console.error('Activity-based session refresh failed:', error);
            }
        }
    };

    ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(event => {
        document.addEventListener(event, async () => {
            lastActivityTime = Date.now();
            await refreshSessionOnActivity();
        }, { passive: true });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Clean up any corrupted localStorage data
    try {
        const authData = localStorage.getItem('user');
        if (authData) {
            JSON.parse(authData); // Test if valid JSON
        }
    } catch (e) {
        console.warn('Clearing corrupted auth localStorage');
        localStorage.removeItem('user');
    }

    // Update cart count on page load
    updateCartCount();

    // Check and update user session
    checkUserSession().then(user => {
        updateNavBar(user);
        // Start periodic session refresh if user is authenticated
        if (user) {
            startSessionRefresh();
            setupActivityBasedRefresh();
        }
    });
});
