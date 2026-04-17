document.addEventListener('DOMContentLoaded', () => {
    // Handle Accordion Toggling
    const headers = document.querySelectorAll('.accordion-header');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const body = header.nextElementSibling;
            const icon = header.querySelector('.ph-caret-down');
            
            // Toggle visibility
            const isHidden = body.style.display === 'none';
            body.style.display = isHidden ? 'block' : 'none';
            
            // Rotate icon
            if (icon) {
                icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
                icon.style.transition = '0.3s';
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

            if(labelText.includes('Sleep Duration')) {
                labelElement.innerHTML = `<i class="ph-fill ph-moon"></i> Sleep Duration (${val} hrs)`;
            } else if(labelText.includes('Sleep Quality')) {
                labelElement.innerHTML = `<i class="ph-fill ph-bed"></i> Sleep Quality (${val}/10)`;
            } else if(labelText.includes('Energy Level')) {
                labelElement.innerHTML = `<i class="ph-fill ph-lightning"></i> Energy Level (${val}/10)`;
            } else if(labelText.includes('General Mood')) {
                labelElement.innerHTML = `<i class="ph-fill ph-smiley"></i> General Mood (${val}/10)`;
            } else if(labelText.includes('Mental Clarity')) {
                labelElement.innerHTML = `<i class="ph-fill ph-pawn"></i> Mental Clarity (${val}/10)`;
            } else if(labelText.includes('Work Hours')) {
                labelElement.innerHTML = `<i class="ph-fill ph-clock"></i> Work Hours (${val} hrs)`;
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
            
            // Update page title dynamically
            const pageTitle = document.querySelector('.page-title h2');
            if (pageTitle) pageTitle.innerText = item.innerText.trim();
        });
    });

    // Logout logic
    const logoutBtn = document.querySelector('.nav-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to logout?")) {
                window.location.href = 'index.html'; // Redirect to home/login
            }
        });
    }

    // AI Assistant Button Click
    const aiBtn = document.querySelector('.ai-button');
    if (aiBtn) {
        aiBtn.addEventListener('click', () => {
            const currentScore = document.querySelector('.percentage')?.innerText || "0%";
            const msg = `Cognitive AI: "Your current burnout risk is ${currentScore}. I recommend ${currentScore.slice(0,-1) > 40 ? 'scheduling a break immediately' : 'continuing your deep-work flow'}. How else can I help?"`;
            alert(msg);
        });
    }

    // INITIAL LOAD
    fetchLatestData();
});

function calculateDemoBurnout() {
    const sleepDur = parseFloat(document.getElementById('sleep-dur-slider')?.value || 7);
    const sleepQual = parseFloat(document.getElementById('sleep-qual-slider')?.value || 8);
    const energy = parseFloat(document.getElementById('energy-slider')?.value || 8);
    const mood = parseFloat(document.getElementById('mood-slider')?.value || 8);
    const work = parseFloat(document.getElementById('work-slider')?.value || 8);
    
    // Improved demo formula
    let burnoutScore = 100 - ((sleepDur/12)*25 + (sleepQual/10)*20 + (energy/10)*20 + (mood/10)*20 + (1 - (work/16))*15);
    updateBurnoutUI(Math.round(burnoutScore));
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
        statusPill.className = 'status-pill';
        statusPill.style.border = '1px solid rgba(229, 72, 77, 0.4)';
        statusPill.style.background = 'rgba(229, 72, 77, 0.1)';
        statusPill.style.color = '#E5484D';
        statusPill.innerHTML = '<i class="ph-bold ph-warning-circle"></i> CRITICAL BURNOUT';
        gaugeFill.style.stroke = '#E5484D';
        gaugeFill.style.filter = 'drop-shadow(0px 0px 8px rgba(229, 72, 77, 0.6))';
        updateAISuggestions('high');
    } else if (score > 40) {
        statusPill.className = 'status-pill';
        statusPill.style.border = '1px solid rgba(245, 166, 35, 0.4)';
        statusPill.style.background = 'rgba(245, 166, 35, 0.1)';
        statusPill.style.color = '#F5A623';
        statusPill.innerHTML = '<i class="ph-bold ph-warning"></i> MEDIUM BURNOUT';
        gaugeFill.style.stroke = '#F5A623';
        gaugeFill.style.filter = 'drop-shadow(0px 0px 8px rgba(245, 166, 35, 0.6))';
        updateAISuggestions('medium');
    } else {
        statusPill.className = 'status-pill safe';
        statusPill.style.border = '1px solid rgba(46, 209, 95, 0.4)';
        statusPill.style.background = 'rgba(46, 209, 95, 0.1)';
        statusPill.style.color = 'var(--brand-green)';
        statusPill.innerHTML = '<i class="ph-bold ph-check-circle"></i> LOW BURNOUT';
        gaugeFill.style.stroke = 'var(--brand-green-light)';
        gaugeFill.style.filter = 'drop-shadow(0px 0px 8px rgba(180, 244, 88, 0.6))';
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

    fetch(`${getAPIURL()}/api/burnout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            sleep: slp, 
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
    fetch(`${getAPIURL()}/api/records`)
        .then(res => res.json())
        .then(data => {
            if (data && data.record) {
                // Initialize the sliders to reflect the database!
                const sleepDur = document.getElementById('sleep-dur-slider');
                const sleepQual = document.getElementById('sleep-qual-slider');
                const energy = document.getElementById('energy-slider');
                const mood = document.getElementById('mood-slider');
                const clarity = document.getElementById('clarity-slider');
                const work = document.getElementById('work-slider');
                const eating = document.querySelector('.custom-select');

                if (sleepDur && data.record.sleep !== undefined) sleepDur.value = data.record.sleep;
                if (mood && data.record.mood !== undefined) mood.value = data.record.mood;
                if (clarity && data.record.clarity !== undefined) clarity.value = data.record.clarity;
                if (work && data.record.work !== undefined) work.value = data.record.work;
                if (eating && data.record.eating !== undefined) eating.value = data.record.eating;
                
                // Trigger input events to update labels
                [sleepDur, sleepQual, energy, mood, clarity, work].forEach(s => {
                    if (s) s.dispatchEvent(new Event('input'));
                });

                updateBurnoutUI(data.record.score);
            }
        })
        .catch(err => console.error("Could not fetch old records from DB:", err));
}