// ── SHARED AUTHENTICATION & ADVERT MANAGEMENT FOR CAMPUS EVENTS GHANA ──

const AUTH_STORAGE_KEY = 'campus_events_user_session';

function getCurrentUser() {
    try {
        const data = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!data) return null;
        const parsed = JSON.parse(data);
        return parsed.user || null;
    } catch (e) {
        return null;
    }
}

function setCurrentUser(user, token) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token, loggedInAt: Date.now() }));
}

function logoutUser() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    renderAuthNav();
    if (typeof onAuthChange === 'function') onAuthChange(null);
    showToast('Logged out successfully', 'info');
}

// Render Navigation Auth Elements
function renderAuthNav() {
    const navContainer = document.getElementById('navAuthContainer');
    if (!navContainer) return;

    const user = getCurrentUser();
    if (user) {
        const initials = (user.full_name || user.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        navContainer.innerHTML = `
            <button class="nav-advert-btn" onclick="openAdvertModal()">
                <i class="fa-solid fa-bullhorn"></i> Request Advert
            </button>
            <div class="user-profile-badge" onclick="toggleUserDropdown(event)">
                <div class="user-avatar-circle">${initials}</div>
                <span style="font-weight: 700; font-size: 13px;">${user.full_name.split(' ')[0]}</span>
                <i class="fa-solid fa-chevron-down" style="font-size: 10px; color: var(--text-medium);"></i>
                <div class="user-dropdown-menu" id="userDropdownMenu">
                    <div style="padding: 6px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 4px;">
                        <div style="font-size: 12px; font-weight: 800; color: #fff;">${user.full_name}</div>
                        <div style="font-size: 10px; color: var(--text-medium);">${user.university} · ${user.email}</div>
                    </div>
                    <a href="tickets.html" class="user-dropdown-item"><i class="fa-solid fa-wallet"></i> My Tickets</a>
                    <a href="javascript:void(0)" class="user-dropdown-item" onclick="openAdvertModal()"><i class="fa-solid fa-bullhorn"></i> Promote Event</a>
                    <a href="javascript:void(0)" class="user-dropdown-item" style="color: var(--error);" onclick="logoutUser()"><i class="fa-solid fa-right-from-bracket"></i> Log Out</a>
                </div>
            </div>
        `;
    } else {
        navContainer.innerHTML = `
            <button class="nav-advert-btn" onclick="openAdvertModal()">
                <i class="fa-solid fa-bullhorn"></i> Request Advert
            </button>
            <button class="nav-auth-btn" onclick="openAuthModal('LOGIN')">
                <i class="fa-solid fa-arrow-right-to-bracket"></i> Log In / Sign Up
            </button>
        `;
    }
}

function toggleUserDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('userDropdownMenu');
    if (dropdown) dropdown.classList.toggle('show');
}

document.addEventListener('click', () => {
    const dropdown = document.getElementById('userDropdownMenu');
    if (dropdown && dropdown.classList.contains('show')) dropdown.classList.remove('show');
});

// Toast notification helper
function showToast(msg, type = 'info') {
    const existing = document.getElementById('campusToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'campusToast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.zIndex = '99999';
    toast.style.padding = '14px 20px';
    toast.style.borderRadius = '12px';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '700';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    toast.style.transition = 'all 0.3s ease';

    if (type === 'success') {
        toast.style.background = 'rgba(0, 230, 118, 0.95)';
        toast.style.color = '#000';
        toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${msg}`;
    } else if (type === 'error') {
        toast.style.background = 'rgba(207, 102, 121, 0.95)';
        toast.style.color = '#fff';
        toast.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
    } else {
        toast.style.background = 'rgba(98, 0, 238, 0.95)';
        toast.style.color = '#fff';
        toast.innerHTML = `<i class="fa-solid fa-info-circle"></i> ${msg}`;
    }

    document.body.appendChild(toast);
    setTimeout(() => { if (toast) toast.remove(); }, 4000);
}

// ── AUTH MODAL LOGIC ──
function openAuthModal(initialTab = 'LOGIN') {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    switchAuthTab(initialTab);
    document.getElementById('authStatusMsg').innerHTML = '';
    modal.style.display = 'flex';
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

function switchAuthTab(tab) {
    const loginTab = document.getElementById('authTabLogin');
    const signupTab = document.getElementById('authTabSignup');
    const loginForm = document.getElementById('loginFormContent');
    const signupForm = document.getElementById('signupFormContent');

    if (tab === 'LOGIN') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    } else {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.style.display = 'block';
        loginForm.style.display = 'none';
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const status = document.getElementById('authStatusMsg');

    status.innerHTML = '<span style="color: var(--secondary);"><i class="fa-solid fa-spinner fa-spin"></i> Signing in...</span>';

    try {
        const res = await fetch('/.netlify/functions/campus-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'LOGIN', email, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            setCurrentUser(data.user, data.token);
            closeAuthModal();
            renderAuthNav();
            showToast(`Welcome back, ${data.user.full_name}!`, 'success');
            if (typeof onAuthChange === 'function') onAuthChange(data.user);
        } else {
            throw new Error(data.error || 'Login failed');
        }
    } catch (err) {
        status.innerHTML = `<span style="color: var(--error);"><i class="fa-solid fa-triangle-exclamation"></i> ${err.message}</span>`;
    }
}

async function handleSignupSubmit(e) {
    e.preventDefault();
    const full_name = document.getElementById('signupFullName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const university = document.getElementById('signupUniversity').value;
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const status = document.getElementById('authStatusMsg');

    if (!university) return alert('Please select your campus / university.');

    status.innerHTML = '<span style="color: var(--secondary);"><i class="fa-solid fa-spinner fa-spin"></i> Creating account...</span>';

    try {
        const res = await fetch('/.netlify/functions/campus-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'REGISTER', full_name, email, university, phone, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            setCurrentUser(data.user, data.token);
            closeAuthModal();
            renderAuthNav();
            showToast(`Account created! Welcome, ${data.user.full_name}!`, 'success');
            if (typeof onAuthChange === 'function') onAuthChange(data.user);
        } else {
            throw new Error(data.error || 'Registration failed');
        }
    } catch (err) {
        status.innerHTML = `<span style="color: var(--error);"><i class="fa-solid fa-triangle-exclamation"></i> ${err.message}</span>`;
    }
}

// ── ADVERT REQUEST MODAL LOGIC ──
let selectedAdvertPkg = 'VIP Campus Blast (GHS 350)';

function openAdvertModal() {
    const modal = document.getElementById('advertModal');
    if (!modal) return;

    // Pre-fill if user logged in
    const user = getCurrentUser();
    if (user) {
        const nameField = document.getElementById('advOrganizerName');
        const emailField = document.getElementById('advOrganizerEmail');
        const phoneField = document.getElementById('advOrganizerPhone');
        const uniField = document.getElementById('advUniversity');

        if (nameField && !nameField.value) nameField.value = user.full_name;
        if (emailField && !emailField.value) emailField.value = user.email;
        if (phoneField && !phoneField.value && user.phone) phoneField.value = user.phone;
        if (uniField && user.university) uniField.value = user.university;
    }

    document.getElementById('advertStatusMsg').innerHTML = '';
    modal.style.display = 'flex';
}

function closeAdvertModal() {
    const modal = document.getElementById('advertModal');
    if (modal) modal.style.display = 'none';
}

function selectAdvertPackage(cardEl, pkgName) {
    document.querySelectorAll('.advert-pkg-card').forEach(c => c.classList.remove('selected'));
    cardEl.classList.add('selected');
    selectedAdvertPkg = pkgName;
}

async function handleAdvertSubmit(e) {
    e.preventDefault();
    const status = document.getElementById('advertStatusMsg');
    const submitBtn = document.getElementById('advSubmitBtn');

    const payload = {
        organizerName: document.getElementById('advOrganizerName').value.trim(),
        organizationName: document.getElementById('advOrgName').value.trim(),
        organizerEmail: document.getElementById('advOrganizerEmail').value.trim(),
        organizerPhone: document.getElementById('advOrganizerPhone').value.trim(),
        university: document.getElementById('advUniversity').value,
        eventTitle: document.getElementById('advEventTitle').value.trim(),
        eventCategory: document.getElementById('advCategory').value,
        expectedAttendance: document.getElementById('advAttendance').value,
        eventDate: document.getElementById('advDate').value,
        venue: document.getElementById('advVenue').value.trim(),
        advertPackage: selectedAdvertPkg,
        posterUrl: document.getElementById('advPosterUrl').value.trim(),
        description: document.getElementById('advDescription').value.trim()
    };

    if (!payload.university) return alert('Please select the university where the event is taking place.');

    status.innerHTML = '<span style="color: var(--secondary);"><i class="fa-solid fa-spinner fa-spin"></i> Submitting your advert request...</span>';
    submitBtn.disabled = true;

    try {
        const res = await fetch('/.netlify/functions/campus-advert-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok && data.success) {
            status.innerHTML = `
                <div style="background: rgba(0, 230, 118, 0.15); border: 1px solid var(--success); border-radius: 12px; padding: 16px; margin-top: 10px; color: #fff;">
                    <div style="font-weight: 900; font-size: 16px; color: var(--success); margin-bottom: 6px;"><i class="fa-solid fa-circle-check"></i> Advert Request Submitted!</div>
                    <p style="font-size: 13px; margin-bottom: 8px;">Reference Code: <strong style="color: var(--gold); font-family: var(--font-mono);">${data.refCode}</strong></p>
                    <p style="font-size: 12px; color: var(--text-medium);">Our campus marketing team will contact you on WhatsApp at <strong>${payload.organizerPhone}</strong> to launch your campaign.</p>
                </div>
            `;
            submitBtn.style.display = 'none';
            showToast(`Advert submitted! Ref: ${data.refCode}`, 'success');
        } else {
            throw new Error(data.error || 'Submission failed');
        }
    } catch (err) {
        submitBtn.disabled = false;
        status.innerHTML = `<span style="color: var(--error);"><i class="fa-solid fa-triangle-exclamation"></i> ${err.message}</span>`;
    }
}

// Append HTML modals dynamically if not present
function ensureModals() {
    if (!document.getElementById('authModal')) {
        const authModalHtml = `
        <div id="authModal" class="modal-overlay" style="display: none;">
            <div class="modal-card" style="max-width: 420px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="brand-icon" style="width: 32px; height: 32px; font-size: 14px;"><i class="fa-solid fa-user-graduate"></i></div>
                        <h3 style="font-size: 18px; font-weight: 900;">Student Account</h3>
                    </div>
                    <button onclick="closeAuthModal()" style="background: none; border: none; color: var(--text-medium); font-size: 20px; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                </div>

                <div class="modal-tabs-header">
                    <button id="authTabLogin" class="modal-tab-btn active" onclick="switchAuthTab('LOGIN')"><i class="fa-solid fa-right-to-bracket"></i> Log In</button>
                    <button id="authTabSignup" class="modal-tab-btn" onclick="switchAuthTab('SIGNUP')"><i class="fa-solid fa-user-plus"></i> Create Account</button>
                </div>

                <!-- Login Form -->
                <form id="loginFormContent" onsubmit="handleLoginSubmit(event)">
                    <div class="form-group" style="margin-bottom: 14px;">
                        <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Student Email</label>
                        <input type="email" id="loginEmail" placeholder="e.g. kofi@st.ug.edu.gh" class="form-control" style="width: 100%; padding: 11px 14px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; margin-top: 4px; outline: none;" required>
                    </div>
                    <div class="form-group" style="margin-bottom: 18px;">
                        <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Password</label>
                        <input type="password" id="loginPassword" placeholder="••••••••" class="form-control" style="width: 100%; padding: 11px 14px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; margin-top: 4px; outline: none;" required>
                    </div>
                    <button type="submit" class="btn-primary" style="width: 100%; padding: 13px; font-size: 15px; border-radius: 12px;">
                        <i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to My Account
                    </button>
                </form>

                <!-- Signup Form -->
                <form id="signupFormContent" style="display: none;" onsubmit="handleSignupSubmit(event)">
                    <div class="form-group" style="margin-bottom: 12px;">
                        <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Full Name</label>
                        <input type="text" id="signupFullName" placeholder="e.g. Kwame Mensah" class="form-control" style="width: 100%; padding: 10px 14px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; margin-top: 4px; outline: none;" required>
                    </div>
                    <div class="form-group" style="margin-bottom: 12px;">
                        <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Student Email</label>
                        <input type="email" id="signupEmail" placeholder="student@st.ug.edu.gh" class="form-control" style="width: 100%; padding: 10px 14px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; margin-top: 4px; outline: none;" required>
                    </div>
                    <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 10px; margin-bottom: 12px;">
                        <div class="form-group">
                            <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Campus / University</label>
                            <select id="signupUniversity" class="form-control" style="width: 100%; padding: 10px 12px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; margin-top: 4px; outline: none;" required>
                                <option value="">Select Campus</option>
                                <option value="UG Legon">UG Legon</option>
                                <option value="KNUST">KNUST</option>
                                <option value="UCC">UCC</option>
                                <option value="UPSA">UPSA</option>
                                <option value="Ashesi">Ashesi</option>
                                <option value="GIMPA">GIMPA</option>
                                <option value="Academic City">Academic City</option>
                                <option value="Central University">Central University</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Phone / MoMo</label>
                            <input type="tel" id="signupPhone" placeholder="0244123456" class="form-control" style="width: 100%; padding: 10px 12px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; margin-top: 4px; outline: none;">
                        </div>
                    </div>
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Create Password</label>
                        <input type="password" id="signupPassword" placeholder="Minimum 6 characters" minlength="6" class="form-control" style="width: 100%; padding: 10px 14px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; margin-top: 4px; outline: none;" required>
                    </div>
                    <button type="submit" class="btn-primary" style="width: 100%; padding: 13px; font-size: 15px; border-radius: 12px;">
                        <i class="fa-solid fa-user-check"></i> Complete Registration
                    </button>
                </form>

                <div id="authStatusMsg" style="margin-top: 12px; font-size: 13px; text-align: center; font-family: var(--font-mono);"></div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', authModalHtml);
    }

    if (!document.getElementById('advertModal')) {
        const advertModalHtml = `
        <div id="advertModal" class="modal-overlay" style="display: none;">
            <div class="modal-card" style="max-width: 520px; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="brand-icon" style="background: linear-gradient(135deg, var(--gold), #FF5722); width: 34px; height: 34px; font-size: 15px;"><i class="fa-solid fa-bullhorn"></i></div>
                        <div>
                            <h3 style="font-size: 18px; font-weight: 900;">Request Ticket Advert</h3>
                            <p style="font-size: 11px; color: var(--text-medium);">Promote your event to 50,000+ students across Ghana</p>
                        </div>
                    </div>
                    <button onclick="closeAdvertModal()" style="background: none; border: none; color: var(--text-medium); font-size: 20px; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                </div>

                <form onsubmit="handleAdvertSubmit(event)">
                    <!-- Package Selection -->
                    <div style="margin-bottom: 16px;">
                        <label style="font-size: 11px; color: var(--gold); text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">1. Select Advert & Ticketing Package</label>
                        <div class="advert-package-grid">
                            <div class="advert-pkg-card" onclick="selectAdvertPackage(this, 'Standard Banner (GHS 150)')">
                                <div class="advert-pkg-title">📢 Standard Banner</div>
                                <div class="advert-pkg-price">GHS 150</div>
                                <div style="font-size: 10px; color: var(--text-medium); margin-top: 2px;">Homepage Banner (7 Days)</div>
                            </div>
                            <div class="advert-pkg-card selected" onclick="selectAdvertPackage(this, 'VIP Campus Blast (GHS 350)')">
                                <div class="advert-pkg-title">⚡ VIP Campus Blast</div>
                                <div class="advert-pkg-price">GHS 350</div>
                                <div style="font-size: 10px; color: var(--text-medium); margin-top: 2px;">Top Sticky + WhatsApp Blast</div>
                            </div>
                            <div class="advert-pkg-card" onclick="selectAdvertPackage(this, 'Platinum 360 Campaign (GHS 750)')">
                                <div class="advert-pkg-title">👑 Platinum 360</div>
                                <div class="advert-pkg-price">GHS 750</div>
                                <div style="font-size: 10px; color: var(--text-medium); margin-top: 2px;">All-Campus Promo + QR Scanner</div>
                            </div>
                        </div>
                    </div>

                    <!-- Organizer Details -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        <div class="form-group">
                            <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Organizer / Committee Name</label>
                            <input type="text" id="advOrganizerName" placeholder="e.g. Kwame Mensah" class="form-control" style="width: 100%; padding: 10px 12px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin-top: 4px; outline: none; font-size: 13px;" required>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Organization / Hall</label>
                            <input type="text" id="advOrgName" placeholder="e.g. Legon Hall Week" class="form-control" style="width: 100%; padding: 10px 12px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin-top: 4px; outline: none; font-size: 13px;">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        <div class="form-group">
                            <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Contact Email</label>
                            <input type="email" id="advOrganizerEmail" placeholder="organizer@gmail.com" class="form-control" style="width: 100%; padding: 10px 12px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin-top: 4px; outline: none; font-size: 13px;" required>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">WhatsApp / Phone</label>
                            <input type="tel" id="advOrganizerPhone" placeholder="0244123456" class="form-control" style="width: 100%; padding: 10px 12px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin-top: 4px; outline: none; font-size: 13px;" required>
                        </div>
                    </div>

                    <!-- Event Details -->
                    <div class="form-group" style="margin-bottom: 12px;">
                        <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Event Title</label>
                        <input type="text" id="advEventTitle" placeholder="e.g. Euphoria Neon Party 2026" class="form-control" style="width: 100%; padding: 10px 12px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin-top: 4px; outline: none; font-size: 13px;" required>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        <div class="form-group">
                            <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Campus / University</label>
                            <select id="advUniversity" class="form-control" style="width: 100%; padding: 10px 12px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin-top: 4px; outline: none; font-size: 13px;" required>
                                <option value="">Select Campus</option>
                                <option value="UG Legon">UG Legon</option>
                                <option value="KNUST">KNUST</option>
                                <option value="UCC">UCC</option>
                                <option value="UPSA">UPSA</option>
                                <option value="Ashesi">Ashesi</option>
                                <option value="GIMPA">GIMPA</option>
                                <option value="Academic City">Academic City</option>
                                <option value="Central University">Central University</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Event Category</label>
                            <select id="advCategory" class="form-control" style="width: 100%; padding: 10px 12px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin-top: 4px; outline: none; font-size: 13px;">
                                <option value="CONCERT">🎵 Concert / Music</option>
                                <option value="PARTY">🎉 Party / Rave</option>
                                <option value="SEMINAR">💡 Seminar / Tech</option>
                                <option value="SPORTS">🏆 Sports & Gaming</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        <div class="form-group">
                            <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Event Date & Time</label>
                            <input type="datetime-local" id="advDate" class="form-control" style="width: 100%; padding: 10px 12px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin-top: 4px; outline: none; font-size: 13px;">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Expected Attendance</label>
                            <input type="number" id="advAttendance" placeholder="e.g. 500" value="300" class="form-control" style="width: 100%; padding: 10px 12px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin-top: 4px; outline: none; font-size: 13px;">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        <div class="form-group">
                            <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Event Venue</label>
                            <input type="text" id="advVenue" placeholder="e.g. Great Hall Grounds" class="form-control" style="width: 100%; padding: 10px 12px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin-top: 4px; outline: none; font-size: 13px;">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Event Poster Image URL</label>
                            <input type="url" id="advPosterUrl" placeholder="https://..." class="form-control" style="width: 100%; padding: 10px 12px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin-top: 4px; outline: none; font-size: 13px;">
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 16px;">
                        <label style="font-size: 11px; color: var(--text-medium); text-transform: uppercase; font-weight: 700;">Event Description & Special Requests</label>
                        <textarea id="advDescription" rows="2" placeholder="Tell us about your event, ticket pricing, artists performing, etc." class="form-control" style="width: 100%; padding: 10px 12px; background: var(--surface-elevated); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin-top: 4px; outline: none; font-size: 13px; resize: vertical;"></textarea>
                    </div>

                    <button type="submit" id="advSubmitBtn" class="btn-primary" style="width: 100%; padding: 14px; font-size: 15px; border-radius: 12px; background: linear-gradient(135deg, var(--gold), #FF5722); color: #000; font-weight: 900;">
                        <i class="fa-solid fa-paper-plane"></i> Submit Ticket Advert Request
                    </button>
                </form>

                <div id="advertStatusMsg" style="margin-top: 12px; font-size: 13px;"></div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', advertModalHtml);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    ensureModals();
    renderAuthNav();
});
