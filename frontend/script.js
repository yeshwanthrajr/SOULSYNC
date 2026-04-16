document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("mindsentinel_user")) {
        document.getElementById("auth-overlay").classList.remove("hidden");
    } else {
        refreshDashboard();
    }
});

function login() {
    let btn = document.getElementById("login-btn");
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Authenticating...';
    btn.style.opacity = '0.8';
    setTimeout(() => {
        btn.innerHTML = 'Authorized';
        setTimeout(() => {
            document.getElementById("auth-overlay").classList.add("fade-out-hidden");
            localStorage.setItem("mindsentinel_user", "true");
            refreshDashboard();
            setTimeout(() => { document.getElementById("auth-overlay").style.display = "none"; }, 300);
        }, 300);
    }, 600);
}

function switchView(viewId, navElement) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active-view'));
    document.getElementById('view-' + viewId).classList.add('active-view');
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
    navElement.classList.add('active');
    if (viewId === 'simulation') runSim();
}

// --- 🚀 NEW FEATURE: FOCUS TIMER LOGIC ---
let timerInterval = null;
let timeRemaining = 25 * 60; // 25 minutes default

function updateTimerDisplay() {
    let m = Math.floor(timeRemaining / 60);
    let s = timeRemaining % 60;
    document.getElementById("timer-display").innerText = 
        `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function toggleTimer() {
    let btn = document.getElementById("btn-start");
    
    // If it's already running, Pause it.
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        btn.innerText = "Resume Flow";
        btn.style.backgroundColor = "var(--primary)";
        btn.style.color = "var(--primary-inv)";
        btn.style.borderColor = "transparent";
    } else {
        // Start or Resume
        btn.innerText = "Pause Flow";
        btn.style.backgroundColor = "transparent";
        btn.style.borderColor = "var(--border)";
        btn.style.color = "var(--text-primary)";
        
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            
            if(timeRemaining <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                alert("Deep Work Completed. Initializing 5-minute Neural Reset.");
                btn.innerText = "Start Rest Protocol";
                timeRemaining = 5 * 60; // Set to 5 min break
                updateTimerDisplay();
                btn.style.backgroundColor = "var(--success)"; // Green highlight for break
                btn.style.color = "#000";
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timeRemaining = 25 * 60;
    updateTimerDisplay();
    let btn = document.getElementById("btn-start");
    btn.innerText = "Start Focus";
    btn.style.backgroundColor = "var(--primary)";
    btn.style.color = "var(--primary-inv)";
    btn.style.borderColor = "transparent";
}

// --- Dynamic Value Binding ---
document.getElementById("daily-work").addEventListener("input", function() {
    document.getElementById("work-val-disp").innerText = this.value + " / 10";
});
document.getElementById("daily-stress").addEventListener("input", function() {
    document.getElementById("stress-val-disp").innerText = this.value + " / 10";
});

// --- Metric Math ---
function calculateBurnout(sleep, work, stress) {
    let sPen = Math.max(0, (8 - sleep) * 10);
    let wPen = Math.max(0, (work - 5) * 6);
    let strPen = (stress - 3) * 4;
    return Math.min(100, Math.max(0, sPen + wPen + strPen));
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 4); 
        obj.innerHTML = Math.floor(ease * (end - start) + start);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function submitData() {
    let btn = document.getElementById("save-btn");
    let msg = document.getElementById("save-msg");
    let slp = parseFloat(document.getElementById("daily-sleep").value) || 7;
    let wrk = parseFloat(document.getElementById("daily-work").value) || 5;
    let str = parseFloat(document.getElementById("daily-stress").value) || 4;

    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Processing...';
    msg.style.opacity = "0";

    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

    fetch(`${API_URL}/api/burnout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleep: slp, work: wrk, stress: str })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            localStorage.setItem("ms_score", data.score);
            btn.innerHTML = 'Data Committed';
            
            setTimeout(() => {
                btn.innerHTML = 'Submit Report';
                refreshDashboard();
                document.querySelector('.nav-links li:first-child').click();
            }, 600);
        } else {
            console.error("Backend error:", data);
            btn.innerHTML = 'Error';
            setTimeout(() => { btn.innerHTML = 'Submit Report'; }, 2000);
        }
    })
    .catch(err => {
        console.error("Network error:", err);
        btn.innerHTML = 'Error saving';
        setTimeout(() => { btn.innerHTML = 'Submit Report'; }, 2000);
    });
}

function refreshDashboard() {
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

    fetch(`${API_URL}/api/records`)
        .then(res => res.json())
        .then(data => {
            let rawScore = 12;
            if (data && data.record) {
                rawScore = data.record.score;
                localStorage.setItem("ms_score", rawScore);
            } else {
                rawScore = parseInt(localStorage.getItem("ms_score")) || 12;
            }
            updateDashboardUI(rawScore);
        })
        .catch(err => {
            let rawScore = parseInt(localStorage.getItem("ms_score")) || 12;
            updateDashboardUI(rawScore);
        });
}

function updateDashboardUI(rawScore) {
    let scoreObj = document.getElementById("dash-score");
    let currentScore = parseInt(scoreObj.innerText) || 0;
    animateValue(scoreObj, currentScore, rawScore, 800);

    let gauge = document.getElementById("gauge-ui");
    let riskText = document.getElementById("dash-risk");
    let alertBox = document.getElementById("dash-alert");

    if (rawScore > 75) {
        gauge.style.borderColor = "var(--alert)";
        riskText.innerText = "Status: Critical";
        riskText.style.color = "var(--alert)";
        alertBox.classList.remove("hidden");
    } else if (rawScore > 40) {
        gauge.style.borderColor = "var(--accent)";
        riskText.innerText = "Status: Marginal Decline";
        riskText.style.color = "var(--accent)";
        alertBox.classList.add("hidden");
    } else {
        gauge.style.borderColor = "var(--success)";
        riskText.innerText = "Status: Optimal Output";
        riskText.style.color = "var(--success)";
        alertBox.classList.add("hidden");
    }
}

function runSim() {
    let slp = parseFloat(document.getElementById("sim-sleep").value);
    let wrk = parseFloat(document.getElementById("sim-work").value);
    document.getElementById("sim-slp-val").innerText = slp;
    document.getElementById("sim-wrk-val").innerText = wrk;

    let simScore = Math.round(calculateBurnout(slp, wrk, 5));
    document.getElementById("sim-score").innerText = simScore;

    let gauge = document.getElementById("sim-gauge");
    let msg = document.getElementById("sim-ai-msg");

    if (simScore > 75) {
        gauge.style.borderColor = "var(--alert)";
        msg.innerText = "Threshold exceeded. Decreasing operational load or sleeping more is mandatory to avoid failure.";
    } else if (simScore > 40) {
        gauge.style.borderColor = "var(--accent)";
        msg.innerText = "Marginal fatigue accumulation. Structured breaks recommended.";
    } else {
        gauge.style.borderColor = "var(--success)";
        msg.innerText = "Nominal configuration. Proceed safely.";
    }
}