document.addEventListener("DOMContentLoaded", () => {
    fetchLatestData();

    // Basic interaction for UI elements
    const sliders = document.querySelectorAll('.neon-slider');
    
    sliders.forEach((slider, index) => {
        slider.addEventListener('change', (e) => {
            // When user releases the slider, send data to database
            submitDataToDatabase();
        });

        slider.addEventListener('input', (e) => {
            // Update labels dynamically while dragging
            let label = e.target.previousElementSibling;
            let val = e.target.value;
            if(label.innerText.includes('Sleep Duration')) {
                label.innerHTML = `<i class="ph-fill ph-moon"></i> Sleep Duration (${val} hrs)`;
            } else if(label.innerText.includes('Sleep Quality')) {
                label.innerHTML = `<i class="ph-fill ph-bed"></i> Sleep Quality (${val}/10)`;
            } else if(label.innerText.includes('Energy Level')) {
                label.innerHTML = `<i class="ph-fill ph-lightning"></i> Energy Level (${val}/10)`;
            }
            
            // Give instant visual feedback before DB verifies
            calculateDemoBurnout();
        });
    });
});

function calculateDemoBurnout() {
    const sliders = document.querySelectorAll('.neon-slider');
    let sleepDur = parseFloat(sliders[0].value);
    let sleepQual = parseFloat(sliders[1].value);
    let energy = parseFloat(sliders[2].value);
    let burnoutScore = 100 - ((sleepDur/12)*40 + (sleepQual/10)*30 + (energy/10)*30);
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
    } else if (score > 40) {
        statusPill.className = 'status-pill';
        statusPill.style.border = '1px solid rgba(245, 166, 35, 0.4)';
        statusPill.style.background = 'rgba(245, 166, 35, 0.1)';
        statusPill.style.color = '#F5A623';
        statusPill.innerHTML = '<i class="ph-bold ph-warning"></i> MEDIUM BURNOUT';
        gaugeFill.style.stroke = '#F5A623';
        gaugeFill.style.filter = 'drop-shadow(0px 0px 8px rgba(245, 166, 35, 0.6))';
    } else {
        statusPill.className = 'status-pill safe';
        statusPill.style.border = '1px solid rgba(46, 209, 95, 0.4)';
        statusPill.style.background = 'rgba(46, 209, 95, 0.1)';
        statusPill.style.color = 'var(--brand-green)';
        statusPill.innerHTML = '<i class="ph-bold ph-check-circle"></i> LOW BURNOUT';
        gaugeFill.style.stroke = 'var(--brand-green-light)';
        gaugeFill.style.filter = 'drop-shadow(0px 0px 8px rgba(180, 244, 88, 0.6))';
    }
}

// ==========================================
// BACKEND & DATABASE CONNECTION LOGIC
// ==========================================
const getAPIURL = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') {
        return 'http://localhost:3000';
    }
    // Update this to your exact render URL once deployed!
    return 'https://soulsync-wzb6.onrender.com';
};

function submitDataToDatabase() {
    const sliders = document.querySelectorAll('.neon-slider');
    let slp = parseFloat(sliders[0].value) || 7;
    let wrk = 8; // default work value
    let str = 10 - (parseFloat(sliders[2].value) || 8); // Reverse energy scale for stress

    // Show syncing status
    const statusPill = document.querySelector('.status-pill');
    let originalHtml = statusPill.innerHTML;
    statusPill.innerHTML = '<i class="ph ph-spinner ph-spin"></i> SYNCING DB...';

    fetch(`${getAPIURL()}/api/burnout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleep: slp, work: wrk, stress: str })
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
        setTimeout(() => statusPill.innerHTML = originalHtml, 2000);
    });
}

function fetchLatestData() {
    fetch(`${getAPIURL()}/api/records`)
        .then(res => res.json())
        .then(data => {
            if (data && data.record) {
                // Initialize the sliders to reflect the database!
                const sliders = document.querySelectorAll('.neon-slider');
                if (sliders.length > 0 && data.record.sleep) {
                    sliders[0].value = data.record.sleep;
                    sliders[0].dispatchEvent(new Event('input')); // To trigger label update
                }
                updateBurnoutUI(data.record.score);
            }
        })
        .catch(err => console.error("Could not fetch old records from DB:", err));
}