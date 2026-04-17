document.addEventListener('DOMContentLoaded', () => {
    // AUTH CHECK
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Update UI with User Name
    const welcomeName = document.querySelector('.user-info strong');
    if (welcomeName) welcomeName.innerText = user.name;
    const avatarCircle = document.querySelector('.avatar-circle');
    if (avatarCircle) avatarCircle.innerText = user.name.charAt(0).toUpperCase();

    // Handle Accordion Toggling (Support both standard headers and the physical health gradient button)
    const headers = document.querySelectorAll('.accordion-header, .physical-health-btn');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const body = header.nextElementSibling;
            const icon = header.querySelector('.ph-caret-down, .ph-caret-up');
            
            // Toggle visibility using class or computed style
            const isVisible = body.classList.contains('active') || window.getComputedStyle(body).display !== 'none';
            
            if (isVisible) {
                body.style.display = 'none';
                body.classList.remove('active');
                if (icon) icon.className = icon.className.includes('down') ? 'ph ph-caret-down' : 'ph ph-caret-up';
                if (icon) icon.style.transform = 'rotate(180deg)';
            } else {
                body.style.display = 'block';
                body.classList.add('active');
                if (icon) icon.className = icon.className.includes('down') ? 'ph ph-caret-down' : 'ph ph-caret-up';
                if (icon) icon.style.transform = 'rotate(0deg)';
            }
        });
    });

    // Basic interaction for UI elements
    const sliders = document.querySelectorAll('.neon-slider');
    
    sliders.forEach((slider) => {
        slider.addEventListener('change', (e) => {
            // When user releases the slider, send data to database
            submitDataToDatabase();
        });

        slider.addEventListener('input', (e) => {
            // Update labels dynamically while dragging
            let labelElement = e.target.previousElementSibling;
            let val = e.target.value;
            let labelText = labelElement.innerText;

            if(labelText.includes('SLEEP')) {
                labelElement.innerHTML = `SLEEP (${val}H)`;
            } else if(labelText.includes('QUALITY')) {
                labelElement.innerHTML = `QUALITY (${val}/10)`;
            } else if(labelText.includes('ENERGY')) {
                labelElement.innerHTML = `ENERGY (${val}/10)`;
            } else if(labelText.includes('GENERAL MOOD')) {
                labelElement.innerHTML = `GENERAL MOOD (${val}/10)`;
            } else if(labelText.includes('MENTAL CLARITY')) {
                labelElement.innerHTML = `MENTAL CLARITY (${val}/10)`;
            } else if(labelText.includes('WORK HOURS')) {
                labelElement.innerHTML = `WORK HOURS (${val} hrs)`;
            }
            
            calculateDemoBurnout();
        });
    });

    // Handle Dropdown changes
    const eatingSelect = document.querySelector('.custom-select');
    if (eatingSelect) {
        eatingSelect.addEventListener('change', () => submitDataToDatabase());
    }

    // Sidebar Navigation logic
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const label = item.innerText.trim();
            const dashboardGrid = document.querySelector('.dashboard-grid');
            const settingsView = document.getElementById('settings-view');

            if (label === 'Settings' || label === 'Profile / Settings') {
                dashboardGrid.style.display = 'none';
                settingsView.style.display = 'block';
            } else {
                dashboardGrid.style.display = 'grid';
                if (settingsView) settingsView.style.display = 'none';
            }

            // Update page title dynamically
            const pageTitle = document.querySelector('.page-title h2');
            if (pageTitle) pageTitle.innerText = label;
        });
    });

    // Logout logic
    const logoutBtn = document.querySelector('.nav-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to logout?")) {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                window.location.href = 'login.html'; 
            }
        });
    }

    // Change Password logic (for Settings tab)
    const changePassBtn = document.getElementById('change-pass-btn');
    if (changePassBtn) {
        changePassBtn.addEventListener('click', async () => {
            const oldPass = document.getElementById('old-pass').value;
            const newPass = document.getElementById('new-pass').value;
            const user = JSON.parse(localStorage.getItem('user'));

            if (!oldPass || !newPass) return alert("Fill all fields");

            const res = await fetch(`${getAPIURL()}/api/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, oldPassword: oldPass, newPassword: newPass })
            });
            const data = await res.json();
            if (data.success) {
                alert("Password Updated!");
                document.getElementById('old-pass').value = '';
                document.getElementById('new-pass').value = '';
            } else {
                alert(data.error);
            }
        });
    }

    // AI Assistant Button Click
    const aiBtn = document.querySelector('.ai-button-new');
    if (aiBtn) {
        aiBtn.addEventListener('click', () => {
            const currentScore = document.querySelector('.percentage')?.innerText || "0%";
            const msg = `Cognitive AI: "Your Load Index is ${currentScore}. I recommend ${currentScore.slice(0,-1) > 40 ? 'scheduling a break immediately' : 'continuing your deep-work flow'}. How else can I help?"`;
            alert(msg);
        });
    }

    // INITIAL LOAD
    fetchLatestData();
});

function calculateDemoBurnout() {
    const s = parseFloat(document.getElementById('sleep-dur-slider')?.value || 7);
    const q = parseFloat(document.getElementById('sleep-qual-slider')?.value || 8);
    const e = parseFloat(document.getElementById('energy-slider')?.value || 8);
    const m = parseFloat(document.getElementById('mood-slider')?.value || 8);
    const c = parseFloat(document.getElementById('clarity-slider')?.value || 7);
    const w = parseFloat(document.getElementById('work-slider')?.value || 8);
    const eating = document.querySelector('.custom-select')?.value || 'Regular';
    
    // Sycned with Backend Algorithm
    let sleepFactor = (s / 12) * 20 + (q / 10) * 15;
    let mentalFactor = (m / 10) * 15 + (c / 10) * 15 + (e / 10) * 15;
    let workPenalty = Math.max(0, (w - 8) * 10);
    let dietPenalty = (eating === 'Skipping Meals' ? 15 : (eating === 'Irregular' ? 8 : 0));

    let healthIndex = sleepFactor + mentalFactor;
    let burnoutScore = Math.min(100, Math.max(0, Math.round(100 - healthIndex + workPenalty + dietPenalty)));
    
    updateBurnoutUI(burnoutScore);
}

function updateBurnoutUI(score) {
    const percentageText = document.querySelector('.gauge-text .percentage');
    const gaugeFill = document.querySelector('.gauge-fill');
    const statusPill = document.querySelector('.status-pill');
    
    if(!percentageText) return;

    if (score === undefined || isNaN(score)) score = 20;

    percentageText.innerText = `${score}%`;
    let offset = 125 - (score / 100 * 125);
    gaugeFill.style.strokeDashoffset = offset;
    
    if (score > 70) {
        statusPill.style.background = 'rgba(247, 37, 133, 0.1)';
        statusPill.style.border = '1px solid rgba(247, 37, 133, 0.3)';
        statusPill.style.color = '#F72585';
        statusPill.innerHTML = '<i class="ph-fill ph-warning-circle"></i> HIGH RISK';
        gaugeFill.style.stroke = '#F72585';
        updateAISuggestions('high');
    } else if (score > 40) {
        statusPill.style.background = 'rgba(255, 159, 28, 0.1)';
        statusPill.style.border = '1px solid rgba(255, 159, 28, 0.3)';
        statusPill.style.color = '#FF9F1C';
        statusPill.innerHTML = '<i class="ph-fill ph-warning"></i> MODERATE RISK';
        gaugeFill.style.stroke = '#FF9F1C';
        updateAISuggestions('medium');
    } else {
        statusPill.style.background = 'rgba(0, 230, 118, 0.1)';
        statusPill.style.border = '1px solid rgba(0, 230, 118, 0.3)';
        statusPill.style.color = '#00E676';
        statusPill.innerHTML = '<i class="ph-fill ph-check-circle"></i> LOW BURNOUT';
        gaugeFill.style.stroke = '#00E676';
        updateAISuggestions('low');
    }
}

function updateAISuggestions(risk) {
    const list = document.querySelector('.recommendations-list');
    if(!list) return;

    let recs = [];
    if(risk === 'high') {
        recs = [
            { text: "Take an emergency 30min rest now", icon: "ph-warning-circle", color: "text-red" },
            { text: "Disconnect from all digital screens", icon: "ph-monitor-off", color: "text-blue" },
            { text: "Hydrate and practice box breathing", icon: "ph-wind", color: "text-purple" }
        ];
    } else if(risk === 'medium') {
        recs = [
            { text: "Schedule a 15-minute walk", icon: "ph-sketch-logo", color: "text-yellow" },
            { text: "Prioritize pending deep-work tasks", icon: "ph-list-checks", color: "text-blue" },
            { text: "Aim for 8 hours of sleep tonight", icon: "ph-moon", color: "text-purple" }
        ];
    } else {
        recs = [
            { text: "Keep up the excellent routine!", icon: "ph-trend-up", color: "text-green" },
            { text: "Your mind is well-protected", icon: "ph-heart", color: "text-blue" },
            { text: "Stay consistent with habits", icon: "ph-lightning", color: "text-yellow" }
        ];
    }

    list.innerHTML = recs.map(r => `
        <div class="rec-card">
            <div class="rec-icon ${r.color}"><i class="ph-bold ${r.icon}"></i></div>
            <div class="rec-text">${r.text}</div>
        </div>
    `).join('');
}

// ==========================================
// BACKEND & DATABASE CONNECTION LOGIC
// ==========================================
const getAPIURL = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') {
        return 'http://localhost:3000';
    }
    // This will dynamically use the base URL of your deployed site!
    return window.location.origin;
};

function submitDataToDatabase() {
    const slp = parseFloat(document.getElementById('sleep-dur-slider')?.value) || 7;
    const mood = parseFloat(document.getElementById('mood-slider')?.value || 8);
    const clarity = parseFloat(document.getElementById('clarity-slider')?.value || 7);
    const wrk = parseFloat(document.getElementById('work-slider')?.value || 8);
    const eating = document.querySelector('.custom-select')?.value || 'Regular';
    const energy = parseFloat(document.getElementById('energy-slider')?.value || 8);
    const str = 10 - energy; 

    // Show syncing status
    const statusPill = document.querySelector('.status-pill');
    if (!statusPill) return;
    
    let originalHtml = statusPill.innerHTML;
    statusPill.innerHTML = '<i class="ph ph-spinner ph-spin"></i> SYNCING DB...';

    const user = JSON.parse(localStorage.getItem('user'));
    
    fetch(`${getAPIURL()}/api/burnout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userId: user?._id || null,
            sleep: slp,
            quality: parseFloat(document.getElementById('sleep-qual-slider')?.value || 8),
            energy: energy,
            work: wrk, 
            mood: mood, 
            stress: str, 
            clarity: clarity, 
            eating: eating 
        })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            updateBurnoutUI(data.score); // Update UI with OFFICIAL database calculated score
            fetchLatestData(); // Refresh history
        } else {
            statusPill.innerHTML = originalHtml;
        }
    })
    .catch(err => {
        console.error("Database connection error:", err);
        statusPill.innerHTML = '<i class="ph ph-warning"></i> DB ERROR';
        setTimeout(() => {
            if (statusPill) statusPill.innerHTML = originalHtml;
        }, 2000);
    });
}

function fetchLatestData() {
    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user?._id || '';

    fetch(`${getAPIURL()}/api/records?userId=${userId}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.records && data.records.length > 0) {
                const latest = data.records[0];
                
                // Initialize the sliders (only on first load or if not recently touched)
                // For now, let's just update the history and the main UI if it's the first time
                const isInitial = !document.body.classList.contains('initialized');
                if (isInitial) {
                    const sleepDur = document.getElementById('sleep-dur-slider');
                    const sleepQual = document.getElementById('sleep-qual-slider');
                    const energy = document.getElementById('energy-slider');
                    const mood = document.getElementById('mood-slider');
                    const clarity = document.getElementById('clarity-slider');
                    const work = document.getElementById('work-slider');
                    const eating = document.querySelector('.custom-select');

                    if (sleepDur && latest.sleep !== undefined) sleepDur.value = latest.sleep;
                    if (sleepQual && latest.quality !== undefined) sleepQual.value = latest.quality;
                    if (energy && latest.energy !== undefined) energy.value = latest.energy;
                    if (mood && latest.mood !== undefined) mood.value = latest.mood;
                    if (clarity && latest.clarity !== undefined) clarity.value = latest.clarity;
                    if (work && latest.work !== undefined) work.value = latest.work;
                    if (eating && latest.eating !== undefined) eating.value = latest.eating;
                    
                    document.body.classList.add('initialized');
                    
                    // Trigger input events to update labels
                    [sleepDur, sleepQual, energy, mood, clarity, work].forEach(s => {
                        if (s) s.dispatchEvent(new Event('input'));
                    });
                    
                    updateBurnoutUI(latest.score);
                }

                // Update History List
                const historyContainer = document.getElementById('recent-logs-container');
                if (historyContainer) {
                    historyContainer.innerHTML = data.records.map(r => `
                        <div class="history-item">
                            <div class="history-date">${new Date(r.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            <div class="history-score ${r.riskLevel}">${r.score}%</div>
                            <div class="history-label">${r.riskLevel.toUpperCase()}</div>
                        </div>
                    `).join('');
                }
            }
        })
        .catch(err => console.error("Could not fetch records from DB:", err));
}