/* ============================================
   MORTGAGE TOOLS - JAVASCRIPT
   ============================================ */

// Utility Functions
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

const formatCurrencyDecimal = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

const formatPercent = (value, decimals = 1) => {
    return value.toFixed(decimals) + '%';
};

const calculateMonthlyPayment = (principal, annualRate, years) => {
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;
    if (monthlyRate === 0) return principal / numPayments;
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
           (Math.pow(1 + monthlyRate, numPayments) - 1);
};

// Chart instances storage
const charts = {};

// ============================================
// TOOL CARD EXPAND/COLLAPSE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Tool card expand/collapse
    document.querySelectorAll('.tool-card-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.closest('.tool-expand-btn') || e.target.closest('.tool-card-header')) {
                const card = header.closest('.tool-card');
                card.classList.toggle('expanded');
            }
        });
    });

    // Tool navigation filtering
    document.querySelectorAll('.tool-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.dataset.category;
            document.querySelectorAll('.tool-card').forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // Amortization table view toggle
    document.querySelectorAll('.table-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.table-view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (document.getElementById('amort-results').style.display !== 'none') {
                calculateAmortization();
            }
        });
    });

    // ARM scenario buttons
    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // TCO year buttons
    document.querySelectorAll('.tco-year-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tco-year-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (document.getElementById('tco-results').style.display !== 'none') {
                updateTCODisplay(parseInt(btn.dataset.year));
            }
        });
    });

    // Rent vs Buy years slider
    const rbYearsSlider = document.getElementById('rb-years');
    if (rbYearsSlider) {
        rbYearsSlider.addEventListener('input', () => {
            document.getElementById('rb-years-display').textContent = rbYearsSlider.value + ' years';
        });
    }

    // What-If Simulator sliders
    setupWhatIfSimulator();

    // Initialize current payment for refi calculator
    updateRefiCurrentPayment();
    document.getElementById('refi-current-balance')?.addEventListener('input', updateRefiCurrentPayment);
    document.getElementById('refi-current-rate')?.addEventListener('input', updateRefiCurrentPayment);
    document.getElementById('refi-current-term')?.addEventListener('input', updateRefiCurrentPayment);
});

// ============================================
// DTI CALCULATOR
// ============================================
function calculateDTI() {
    const income = parseFloat(document.getElementById('dti-income').value) || 0;
    const coIncome = parseFloat(document.getElementById('dti-co-income').value) || 0;
    const totalIncome = income + coIncome;

    // Housing expenses
    const mortgage = parseFloat(document.getElementById('dti-mortgage').value) || 0;
    const taxes = parseFloat(document.getElementById('dti-taxes').value) || 0;
    const insurance = parseFloat(document.getElementById('dti-insurance').value) || 0;
    const hoa = parseFloat(document.getElementById('dti-hoa').value) || 0;
    const pmi = parseFloat(document.getElementById('dti-pmi').value) || 0;
    const housingTotal = mortgage + taxes + insurance + hoa + pmi;

    // Other debts
    const car = parseFloat(document.getElementById('dti-car').value) || 0;
    const student = parseFloat(document.getElementById('dti-student').value) || 0;
    const credit = parseFloat(document.getElementById('dti-credit').value) || 0;
    const other = parseFloat(document.getElementById('dti-other').value) || 0;
    const otherDebts = car + student + credit + other;

    const totalDebts = housingTotal + otherDebts;

    // Calculate ratios
    const frontEndDTI = totalIncome > 0 ? (housingTotal / totalIncome) * 100 : 0;
    const backEndDTI = totalIncome > 0 ? (totalDebts / totalIncome) * 100 : 0;

    // Update display
    document.getElementById('dti-front-value').textContent = frontEndDTI.toFixed(1) + '%';
    document.getElementById('dti-back-value').textContent = backEndDTI.toFixed(1) + '%';

    // Update gauges
    updateDTIGauge('dti-front-fill', frontEndDTI, 28);
    updateDTIGauge('dti-back-fill', backEndDTI, 36);

    // Update eligibility
    updateDTIEligibility(frontEndDTI, backEndDTI);

    document.getElementById('dti-results').style.display = 'block';
}

function updateDTIGauge(elementId, value, target) {
    const gauge = document.getElementById(elementId);
    const maxValue = 60; // Max DTI to show on gauge
    const percentage = Math.min(value / maxValue, 1);
    const dashOffset = 126 * (1 - percentage);

    gauge.style.strokeDashoffset = dashOffset;

    // Update color based on value
    gauge.classList.remove('warning', 'danger');
    if (value > target * 1.2) {
        gauge.classList.add('danger');
    } else if (value > target) {
        gauge.classList.add('warning');
    }
}

function updateDTIEligibility(frontEnd, backEnd) {
    const eligibilityDiv = document.getElementById('dti-eligibility');

    const programs = [
        { name: 'Conventional', frontMax: 28, backMax: 36 },
        { name: 'FHA', frontMax: 31, backMax: 43 },
        { name: 'VA', frontMax: 41, backMax: 41 },
        { name: 'USDA', frontMax: 29, backMax: 41 }
    ];

    let html = '<h4>Loan Program Eligibility</h4><div class="eligibility-items">';

    programs.forEach(prog => {
        let status = 'eligible';
        let icon = '✓';

        if (frontEnd > prog.frontMax || backEnd > prog.backMax) {
            if (frontEnd > prog.frontMax * 1.15 || backEnd > prog.backMax * 1.15) {
                status = 'ineligible';
                icon = '✗';
            } else {
                status = 'marginal';
                icon = '⚠';
            }
        }

        html += `<span class="eligibility-item ${status}">${icon} ${prog.name}</span>`;
    });

    html += '</div>';
    eligibilityDiv.innerHTML = html;
}

// ============================================
// RENT VS BUY CALCULATOR
// ============================================
function calculateRentVsBuy() {
    const years = parseInt(document.getElementById('rb-years').value);

    // Renting inputs
    const monthlyRent = parseFloat(document.getElementById('rb-rent').value) || 0;
    const rentIncrease = parseFloat(document.getElementById('rb-rent-increase').value) / 100 || 0.03;
    const rentersIns = parseFloat(document.getElementById('rb-renters-ins').value) || 0;
    const securityDeposit = parseFloat(document.getElementById('rb-security').value) || 0;

    // Buying inputs
    const homePrice = parseFloat(document.getElementById('rb-home-price').value) || 0;
    const downPct = parseFloat(document.getElementById('rb-down-pct').value) / 100 || 0.2;
    const rate = parseFloat(document.getElementById('rb-rate').value) || 6.5;
    const term = parseInt(document.getElementById('rb-term').value) || 30;
    const propTaxRate = parseFloat(document.getElementById('rb-prop-tax').value) / 100 || 0.012;
    const appreciation = parseFloat(document.getElementById('rb-appreciation').value) / 100 || 0.03;

    const downPayment = homePrice * downPct;
    const loanAmount = homePrice - downPayment;
    const monthlyMortgage = calculateMonthlyPayment(loanAmount, rate, term);

    // Calculate rent costs over time
    let totalRentCost = securityDeposit;
    let currentRent = monthlyRent;
    const rentData = [];

    for (let y = 1; y <= years; y++) {
        const yearlyRent = currentRent * 12 + rentersIns * 12;
        totalRentCost += yearlyRent;
        rentData.push(totalRentCost);
        currentRent *= (1 + rentIncrease);
    }

    // Calculate buy costs over time
    const closingCosts = homePrice * 0.03; // 3% closing costs
    let totalBuyCost = downPayment + closingCosts;
    let loanBalance = loanAmount;
    const monthlyRate = rate / 100 / 12;
    const buyData = [];
    const equityData = [];
    let currentHomeValue = homePrice;

    for (let y = 1; y <= years; y++) {
        // Yearly costs
        const yearlyMortgage = monthlyMortgage * 12;
        const yearlyTaxes = currentHomeValue * propTaxRate;
        const yearlyInsurance = currentHomeValue * 0.005; // 0.5% home insurance
        const yearlyMaintenance = currentHomeValue * 0.01; // 1% maintenance

        totalBuyCost += yearlyMortgage + yearlyTaxes + yearlyInsurance + yearlyMaintenance;

        // Update loan balance (simplified)
        for (let m = 0; m < 12; m++) {
            const interest = loanBalance * monthlyRate;
            const principal = monthlyMortgage - interest;
            loanBalance -= principal;
        }

        // Home appreciation
        currentHomeValue *= (1 + appreciation);

        // Equity = Home Value - Remaining Loan
        const equity = currentHomeValue - Math.max(0, loanBalance);
        equityData.push(equity);

        // Net cost = Total paid - Equity built
        buyData.push(totalBuyCost - equity);
    }

    // Final values
    const finalRentCost = totalRentCost;
    const finalBuyNetCost = buyData[years - 1];
    const finalEquity = equityData[years - 1];

    // Update display
    document.getElementById('rb-rent-total').textContent = formatCurrency(finalRentCost);
    document.getElementById('rb-rent-details').innerHTML = `
        Rent paid: ${formatCurrency(totalRentCost - securityDeposit)}<br>
        Security deposit: ${formatCurrency(securityDeposit)}
    `;

    document.getElementById('rb-buy-total').textContent = formatCurrency(finalBuyNetCost);
    document.getElementById('rb-buy-details').innerHTML = `
        Total costs: ${formatCurrency(totalBuyCost)}<br>
        Equity built: ${formatCurrency(finalEquity)}
    `;

    // Recommendation
    const difference = finalRentCost - finalBuyNetCost;
    const recDiv = document.getElementById('rb-recommendation');
    if (difference > 0) {
        recDiv.className = 'rb-recommendation buy-wins';
        recDiv.innerHTML = `<h4>Buying saves you ${formatCurrency(difference)} over ${years} years</h4>
            <p>Based on your inputs, buying appears to be the better financial choice.</p>`;
    } else {
        recDiv.className = 'rb-recommendation rent-wins';
        recDiv.innerHTML = `<h4>Renting saves you ${formatCurrency(-difference)} over ${years} years</h4>
            <p>Based on your inputs, renting appears to be the better financial choice for this time horizon.</p>`;
    }

    // Chart
    const ctx = document.getElementById('rentBuyChart')?.getContext('2d');
    if (ctx) {
        if (charts.rentBuy) charts.rentBuy.destroy();

        const labels = Array.from({length: years}, (_, i) => `Year ${i + 1}`);

        charts.rentBuy = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Rent (Cumulative Cost)',
                        data: rentData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Buy (Net Cost After Equity)',
                        data: buyData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    document.getElementById('rent-buy-results').style.display = 'block';
}

// ============================================
// LOAN PROGRAM ELIGIBILITY
// ============================================
function checkEligibility() {
    const credit = parseInt(document.getElementById('elig-credit').value);
    const down = parseFloat(document.getElementById('elig-down').value);
    const military = document.getElementById('elig-military').value;
    const location = document.getElementById('elig-location').value;
    const income = document.getElementById('elig-income').value;
    const firstTime = document.getElementById('elig-first-time').value === 'yes';
    const age = parseInt(document.getElementById('elig-age').value);
    const dti = parseFloat(document.getElementById('elig-dti').value);

    const programs = [
        {
            name: 'Conventional',
            check: () => {
                if (credit >= 620 && down >= 3 && dti <= 45) return 'eligible';
                if (credit >= 580 && down >= 5 && dti <= 50) return 'marginal';
                return 'ineligible';
            },
            requirements: [
                `Credit: 620+ (yours: ${credit})`,
                `Down Payment: 3%+ (yours: ${down}%)`,
                `DTI: ≤45% (yours: ${dti}%)`
            ]
        },
        {
            name: 'FHA',
            check: () => {
                if (credit >= 580 && down >= 3.5 && dti <= 43) return 'eligible';
                if (credit >= 500 && down >= 10 && dti <= 50) return 'marginal';
                return 'ineligible';
            },
            requirements: [
                `Credit: 580+ with 3.5% down, or 500+ with 10% down`,
                `Down Payment: ${down}%`,
                `DTI: ≤43% (yours: ${dti}%)`
            ]
        },
        {
            name: 'VA',
            check: () => {
                if (military === 'none') return 'ineligible';
                if (dti <= 41) return 'eligible';
                if (dti <= 50) return 'marginal';
                return 'ineligible';
            },
            requirements: [
                `Military Service: Required (${military === 'none' ? 'Not eligible' : 'Eligible'})`,
                `Down Payment: 0% required`,
                `DTI: ≤41% preferred (yours: ${dti}%)`
            ]
        },
        {
            name: 'USDA',
            check: () => {
                if (location !== 'rural') return 'ineligible';
                if (income === 'high') return 'ineligible';
                if (credit >= 640 && dti <= 41) return 'eligible';
                if (credit >= 580 && dti <= 44) return 'marginal';
                return 'ineligible';
            },
            requirements: [
                `Location: Rural area required (${location === 'rural' ? '✓' : '✗'})`,
                `Income: ≤115% of area median (${income === 'high' ? '✗' : '✓'})`,
                `Credit: 640+ (yours: ${credit})`,
                `Down Payment: 0% required`
            ]
        },
        {
            name: 'HECM (Reverse)',
            check: () => {
                if (age < 62) return 'ineligible';
                return 'eligible';
            },
            requirements: [
                `Age: 62+ required (yours: ${age})`,
                `Primary residence required`,
                `Sufficient equity required`
            ]
        },
        {
            name: 'Jumbo',
            check: () => {
                if (credit >= 700 && down >= 20 && dti <= 43) return 'eligible';
                if (credit >= 680 && down >= 10 && dti <= 45) return 'marginal';
                return 'ineligible';
            },
            requirements: [
                `Credit: 700+ preferred (yours: ${credit})`,
                `Down Payment: 20%+ preferred (yours: ${down}%)`,
                `DTI: ≤43% (yours: ${dti}%)`
            ]
        }
    ];

    const grid = document.getElementById('eligibility-grid');
    grid.innerHTML = programs.map(prog => {
        const status = prog.check();
        const statusText = status === 'eligible' ? '✓ Likely Eligible' :
                          status === 'marginal' ? '⚠ May Qualify' : '✗ Not Eligible';

        return `
            <div class="eligibility-card ${status}">
                <div class="eligibility-card-header">
                    <h4>${prog.name}</h4>
                    <span class="eligibility-status ${status}">${statusText}</span>
                </div>
                <div class="eligibility-requirements">
                    <ul>
                        ${prog.requirements.map(req => `<li>${req}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('eligibility-results').style.display = 'block';
}

// ============================================
// AMORTIZATION SCHEDULE
// ============================================
function calculateAmortization() {
    const loanAmount = parseFloat(document.getElementById('amort-amount').value) || 0;
    const rate = parseFloat(document.getElementById('amort-rate').value) || 0;
    const term = parseInt(document.getElementById('amort-term').value) || 30;
    const startDate = document.getElementById('amort-start').value;
    const extraMonthly = parseFloat(document.getElementById('amort-extra-monthly').value) || 0;
    const extraOnetime = parseFloat(document.getElementById('amort-extra-onetime').value) || 0;
    const extraWhen = parseInt(document.getElementById('amort-extra-when').value) || 5;

    const monthlyRate = rate / 100 / 12;
    const numPayments = term * 12;
    const basePayment = calculateMonthlyPayment(loanAmount, rate, term);

    // Calculate standard amortization
    let balance = loanAmount;
    let totalInterest = 0;
    let totalInterestWithExtra = 0;
    let balanceWithExtra = loanAmount;
    const schedule = [];
    const scheduleWithExtra = [];
    let payoffMonth = numPayments;
    let payoffMonthWithExtra = numPayments;

    // Track yearly totals
    let yearlyPrincipal = 0;
    let yearlyInterest = 0;
    let yearlyPrincipalExtra = 0;
    let yearlyInterestExtra = 0;

    for (let month = 1; month <= numPayments; month++) {
        // Standard payment
        if (balance > 0) {
            const interest = balance * monthlyRate;
            const principal = Math.min(basePayment - interest, balance);
            balance -= principal;
            totalInterest += interest;
            yearlyPrincipal += principal;
            yearlyInterest += interest;
        }

        // With extra payments
        if (balanceWithExtra > 0) {
            const interestExtra = balanceWithExtra * monthlyRate;
            let principalExtra = basePayment - interestExtra + extraMonthly;

            // One-time extra payment
            if (month === extraWhen * 12 && extraOnetime > 0) {
                principalExtra += extraOnetime;
            }

            principalExtra = Math.min(principalExtra, balanceWithExtra);
            balanceWithExtra -= principalExtra;
            totalInterestWithExtra += interestExtra;
            yearlyPrincipalExtra += principalExtra;
            yearlyInterestExtra += interestExtra;

            if (balanceWithExtra <= 0 && payoffMonthWithExtra === numPayments) {
                payoffMonthWithExtra = month;
            }
        }

        // Store yearly data
        if (month % 12 === 0 || month === numPayments) {
            const year = Math.ceil(month / 12);
            schedule.push({
                period: `Year ${year}`,
                payment: basePayment * 12,
                principal: yearlyPrincipal,
                interest: yearlyInterest,
                balance: Math.max(0, balance)
            });

            if (extraMonthly > 0 || extraOnetime > 0) {
                scheduleWithExtra.push({
                    period: `Year ${year}`,
                    payment: (basePayment + extraMonthly) * 12 + (year === extraWhen ? extraOnetime : 0),
                    principal: yearlyPrincipalExtra,
                    interest: yearlyInterestExtra,
                    balance: Math.max(0, balanceWithExtra)
                });
            }

            yearlyPrincipal = 0;
            yearlyInterest = 0;
            yearlyPrincipalExtra = 0;
            yearlyInterestExtra = 0;
        }
    }

    // Update summary
    document.getElementById('amort-payment').textContent = formatCurrencyDecimal(basePayment);
    document.getElementById('amort-total-interest').textContent = formatCurrency(totalInterest);
    document.getElementById('amort-total-cost').textContent = formatCurrency(loanAmount + totalInterest);

    // Show savings if extra payments
    if (extraMonthly > 0 || extraOnetime > 0) {
        const interestSaved = totalInterest - totalInterestWithExtra;
        const timeSaved = numPayments - payoffMonthWithExtra;

        document.getElementById('amort-savings').textContent = formatCurrency(interestSaved);
        document.getElementById('amort-time-saved').textContent = `${Math.floor(timeSaved / 12)} yrs ${timeSaved % 12} mo`;
        document.getElementById('amort-savings-stat').style.display = '';
        document.getElementById('amort-time-stat').style.display = '';
    } else {
        document.getElementById('amort-savings-stat').style.display = 'none';
        document.getElementById('amort-time-stat').style.display = 'none';
    }

    // Update table
    const isYearly = document.querySelector('.table-view-btn.active')?.dataset.view === 'yearly';
    const tbody = document.getElementById('amort-table-body');
    tbody.innerHTML = schedule.map((row, i) => `
        <tr>
            <td>${row.period}</td>
            <td>${formatCurrency(row.payment)}</td>
            <td>${formatCurrency(row.principal)}</td>
            <td>${formatCurrency(row.interest)}</td>
            <td>${formatCurrency(row.balance)}</td>
        </tr>
    `).join('');

    // Chart
    const ctx = document.getElementById('amortChart')?.getContext('2d');
    if (ctx) {
        if (charts.amort) charts.amort.destroy();

        const labels = schedule.map(s => s.period);
        const principalData = [];
        const interestData = [];
        let cumPrincipal = 0;
        let cumInterest = 0;

        schedule.forEach(s => {
            cumPrincipal += s.principal;
            cumInterest += s.interest;
            principalData.push(cumPrincipal);
            interestData.push(cumInterest);
        });

        charts.amort = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Principal Paid',
                        data: schedule.map(s => s.principal),
                        backgroundColor: '#3b82f6',
                        stack: 'stack1'
                    },
                    {
                        label: 'Interest Paid',
                        data: schedule.map(s => s.interest),
                        backgroundColor: '#ef4444',
                        stack: 'stack1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: { stacked: true },
                    y: {
                        stacked: true,
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    document.getElementById('amort-results').style.display = 'block';
}

// ============================================
// ARM VS FIXED COMPARISON
// ============================================
function calculateARMvsFixed() {
    const loanAmount = parseFloat(document.getElementById('arm-amount').value) || 0;
    const term = parseInt(document.getElementById('arm-term').value) || 30;
    const fixedRate = parseFloat(document.getElementById('arm-fixed-rate').value) || 0;
    const armType = document.getElementById('arm-type').value;
    const armInitialRate = parseFloat(document.getElementById('arm-initial-rate').value) || 0;
    const armCap = parseFloat(document.getElementById('arm-cap').value) || 2;
    const armLifetimeCap = parseFloat(document.getElementById('arm-lifetime-cap').value) || 5;
    const scenario = document.querySelector('.scenario-btn.active')?.dataset.scenario || 'stable';

    const fixedPeriod = parseInt(armType.split('/')[0]);

    // Fixed rate calculations
    const fixedPayment = calculateMonthlyPayment(loanAmount, fixedRate, term);
    const fixedTotalInterest = (fixedPayment * term * 12) - loanAmount;
    const fixed5YrCost = fixedPayment * 60;

    // ARM calculations
    const armInitialPayment = calculateMonthlyPayment(loanAmount, armInitialRate, term);

    // Scenario-based rate changes
    let rateChanges;
    switch(scenario) {
        case 'down':
            rateChanges = [-0.5, -0.25, 0, 0, 0];
            break;
        case 'stable':
            rateChanges = [0.25, 0.25, 0, 0, 0];
            break;
        case 'up':
            rateChanges = [1, 1, 0.5, 0.5, 0];
            break;
        case 'worst':
            rateChanges = [armCap, armCap, armCap, armCap, armCap];
            break;
        default:
            rateChanges = [0.5, 0.5, 0, 0, 0];
    }

    // Calculate ARM over time
    let armTotalInterest = 0;
    let armBalance = loanAmount;
    let currentRate = armInitialRate;
    const monthlyData = [];
    const armPayments = [];
    const fixedPayments = [];

    for (let year = 1; year <= term; year++) {
        if (year > fixedPeriod) {
            const changeIndex = Math.min(year - fixedPeriod - 1, rateChanges.length - 1);
            currentRate = Math.min(
                armInitialRate + armLifetimeCap,
                Math.max(armInitialRate - 2, currentRate + rateChanges[changeIndex])
            );
        }

        const yearlyPayment = calculateMonthlyPayment(armBalance, currentRate, term - year + 1);
        const monthlyRate = currentRate / 100 / 12;

        for (let m = 0; m < 12; m++) {
            const interest = armBalance * monthlyRate;
            const principal = yearlyPayment - interest;
            armBalance -= principal;
            armTotalInterest += interest;
        }

        armPayments.push(yearlyPayment);
        fixedPayments.push(fixedPayment);
    }

    const arm5YrCost = armPayments.slice(0, 5).reduce((sum, p) => sum + p * 12, 0);

    // Update display
    document.getElementById('arm-fixed-display').textContent = fixedRate + '%';
    document.getElementById('arm-fixed-payment').textContent = formatCurrencyDecimal(fixedPayment);
    document.getElementById('arm-fixed-5yr').textContent = formatCurrency(fixed5YrCost);
    document.getElementById('arm-fixed-interest').textContent = formatCurrency(fixedTotalInterest);

    document.getElementById('arm-type-display').textContent = armType + ' ARM';
    document.getElementById('arm-rate-display').textContent = armInitialRate + '%';
    document.getElementById('arm-initial-payment').textContent = formatCurrencyDecimal(armInitialPayment);
    document.getElementById('arm-5yr').textContent = formatCurrency(arm5YrCost);
    document.getElementById('arm-total-interest').textContent = formatCurrency(armTotalInterest);

    // Recommendation
    const recDiv = document.getElementById('arm-recommendation');
    const monthlySavings = fixedPayment - armInitialPayment;
    const yearsSavings = fixedPeriod;

    if (arm5YrCost < fixed5YrCost) {
        recDiv.innerHTML = `<h4>ARM saves ${formatCurrency(fixed5YrCost - arm5YrCost)} in the first 5 years</h4>
            <p>Initial savings of ${formatCurrencyDecimal(monthlySavings)}/month. Best if you plan to move or refinance within ${fixedPeriod} years.</p>`;
    } else {
        recDiv.innerHTML = `<h4>Fixed rate provides more stability</h4>
            <p>While ARM starts lower, the fixed rate may cost less over time under this scenario.</p>`;
    }

    // Chart
    const ctx = document.getElementById('armChart')?.getContext('2d');
    if (ctx) {
        if (charts.arm) charts.arm.destroy();

        const labels = Array.from({length: Math.min(15, term)}, (_, i) => `Year ${i + 1}`);

        charts.arm = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Fixed Rate Payment',
                        data: fixedPayments.slice(0, 15),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: false,
                        tension: 0
                    },
                    {
                        label: 'ARM Payment',
                        data: armPayments.slice(0, 15),
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatCurrencyDecimal(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    document.getElementById('arm-fixed-results').style.display = 'block';
}

// ============================================
// HELOC VS CASH-OUT REFI
// ============================================
function calculateHELOCvsRefi() {
    const homeValue = parseFloat(document.getElementById('heloc-home-value').value) || 0;
    const currentBalance = parseFloat(document.getElementById('heloc-balance').value) || 0;
    const currentRate = parseFloat(document.getElementById('heloc-current-rate').value) || 0;
    const remainingYears = parseInt(document.getElementById('heloc-remaining').value) || 25;
    const cashNeeded = parseFloat(document.getElementById('heloc-cash-needed').value) || 0;

    // HELOC inputs
    const helocRate = parseFloat(document.getElementById('heloc-rate').value) || 8.5;
    const helocDrawYears = parseInt(document.getElementById('heloc-draw').value) || 10;
    const helocRepayYears = parseInt(document.getElementById('heloc-repay').value) || 20;
    const helocClosing = parseFloat(document.getElementById('heloc-closing').value) || 500;

    // Refi inputs
    const refiRate = parseFloat(document.getElementById('refi-rate').value) || 6.75;
    const refiTerm = parseInt(document.getElementById('refi-term').value) || 30;
    const refiClosing = parseFloat(document.getElementById('refi-closing').value) || 8000;

    // Current mortgage payment
    const currentPayment = calculateMonthlyPayment(currentBalance, currentRate, remainingYears);

    // HELOC calculations
    const helocIOPayment = cashNeeded * (helocRate / 100 / 12); // Interest-only during draw
    const combinedPayment = currentPayment + helocIOPayment;

    // HELOC total interest (simplified: interest-only for draw period, then amortize)
    const helocDrawInterest = helocIOPayment * helocDrawYears * 12;
    const helocRepayPayment = calculateMonthlyPayment(cashNeeded, helocRate, helocRepayYears);
    const helocRepayInterest = (helocRepayPayment * helocRepayYears * 12) - cashNeeded;
    const helocTotalInterest = helocDrawInterest + helocRepayInterest;

    // Current mortgage remaining interest
    const currentTotalPaid = currentPayment * remainingYears * 12;
    const currentRemainingInterest = currentTotalPaid - currentBalance;

    // Cash-out refi calculations
    const newLoanAmount = currentBalance + cashNeeded + refiClosing;
    const refiPayment = calculateMonthlyPayment(newLoanAmount, refiRate, refiTerm);
    const refiTotalPaid = refiPayment * refiTerm * 12;
    const refiTotalInterest = refiTotalPaid - newLoanAmount;

    const paymentChange = refiPayment - currentPayment;

    // Update display
    document.getElementById('heloc-current-pmt').textContent = formatCurrencyDecimal(currentPayment) + '/mo';
    document.getElementById('heloc-io-pmt').textContent = formatCurrencyDecimal(helocIOPayment) + '/mo';
    document.getElementById('heloc-combined').textContent = formatCurrencyDecimal(combinedPayment) + '/mo';
    document.getElementById('heloc-total-interest').textContent = formatCurrency(helocTotalInterest + currentRemainingInterest);

    document.getElementById('refi-new-loan').textContent = formatCurrency(newLoanAmount);
    document.getElementById('refi-payment').textContent = formatCurrencyDecimal(refiPayment) + '/mo';
    document.getElementById('refi-change').textContent = (paymentChange >= 0 ? '+' : '') + formatCurrencyDecimal(paymentChange) + '/mo';
    document.getElementById('refi-total-interest').textContent = formatCurrency(refiTotalInterest);

    // Recommendation
    const recDiv = document.getElementById('heloc-recommendation');
    const helocTotal = helocTotalInterest + currentRemainingInterest + helocClosing;
    const refiTotal = refiTotalInterest + refiClosing;

    if (helocTotal < refiTotal) {
        recDiv.innerHTML = `<h4>HELOC may be the better choice</h4>
            <p>Total interest cost is ${formatCurrency(refiTotal - helocTotal)} less with HELOC.
            Best if: you have a low current rate, need flexible access to funds, or plan to pay off quickly.</p>`;
    } else {
        recDiv.innerHTML = `<h4>Cash-out refinance may be the better choice</h4>
            <p>Despite higher closing costs, the lower fixed rate could save ${formatCurrency(helocTotal - refiTotal)} over time.
            Best if: current rate is high, you want payment certainty, or you need a large sum.</p>`;
    }

    document.getElementById('heloc-results').style.display = 'block';
}

// ============================================
// PMI REMOVAL TIMELINE
// ============================================
function calculatePMIRemoval() {
    const homePrice = parseFloat(document.getElementById('pmi-home-price').value) || 0;
    const loanAmount = parseFloat(document.getElementById('pmi-loan-amount').value) || 0;
    const rate = parseFloat(document.getElementById('pmi-rate').value) || 0;
    const term = parseInt(document.getElementById('pmi-term').value) || 30;
    const monthlyPMI = parseFloat(document.getElementById('pmi-monthly').value) || 0;
    const appreciation = parseFloat(document.getElementById('pmi-appreciation').value) / 100 || 0.03;
    const extraPayment = parseFloat(document.getElementById('pmi-extra').value) || 0;
    const startDateStr = document.getElementById('pmi-start').value;

    const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, term);
    const monthlyRate = rate / 100 / 12;

    let balance = loanAmount;
    let currentHomeValue = homePrice;
    let month20Pct = null;
    let month22Pct = null;
    let ltv20Value = null;
    let ltv22Value = null;

    const equityData = [];
    const ltvData = [];
    const targetData = [];

    for (let month = 1; month <= term * 12; month++) {
        // Monthly appreciation
        currentHomeValue *= Math.pow(1 + appreciation, 1/12);

        // Payment
        const interest = balance * monthlyRate;
        const principal = monthlyPayment - interest + extraPayment;
        balance = Math.max(0, balance - principal);

        // LTV
        const ltv = (balance / currentHomeValue) * 100;
        const equity = currentHomeValue - balance;

        if (month % 12 === 0 || month <= 60) {
            equityData.push({ x: month, y: equity });
            ltvData.push({ x: month, y: ltv });
            targetData.push({ x: month, y: 80 });
        }

        // Check milestones
        if (ltv <= 80 && month20Pct === null) {
            month20Pct = month;
            ltv20Value = { homeValue: currentHomeValue, balance, equity };
        }
        if (ltv <= 78 && month22Pct === null) {
            month22Pct = month;
            ltv22Value = { homeValue: currentHomeValue, balance, equity };
        }
    }

    // Calculate dates
    const startDate = new Date(startDateStr + '-01');
    const date20 = new Date(startDate);
    date20.setMonth(date20.getMonth() + (month20Pct || 0));
    const date22 = new Date(startDate);
    date22.setMonth(date22.getMonth() + (month22Pct || 0));

    const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Update display
    document.getElementById('pmi-20-date').textContent = month20Pct ? formatDate(date20) : 'N/A';
    document.getElementById('pmi-20-details').innerHTML = month20Pct ? `
        Month ${month20Pct} (${Math.floor(month20Pct/12)} yrs ${month20Pct%12} mo)<br>
        Est. Home Value: ${formatCurrency(ltv20Value.homeValue)}<br>
        Balance: ${formatCurrency(ltv20Value.balance)}
    ` : '';

    document.getElementById('pmi-22-date').textContent = month22Pct ? formatDate(date22) : 'N/A';
    document.getElementById('pmi-22-details').innerHTML = month22Pct ? `
        Month ${month22Pct} (${Math.floor(month22Pct/12)} yrs ${month22Pct%12} mo)<br>
        Est. Home Value: ${formatCurrency(ltv22Value.homeValue)}<br>
        Balance: ${formatCurrency(ltv22Value.balance)}
    ` : '';

    // PMI costs
    const pmiCostTo20 = month20Pct ? monthlyPMI * month20Pct : monthlyPMI * term * 12;
    const pmiCostTo22 = month22Pct ? monthlyPMI * month22Pct : monthlyPMI * term * 12;
    const earlySavings = pmiCostTo22 - pmiCostTo20;

    document.getElementById('pmi-cost-to-20').textContent = formatCurrency(pmiCostTo20);
    document.getElementById('pmi-cost-to-22').textContent = formatCurrency(pmiCostTo22);
    document.getElementById('pmi-early-savings').textContent = formatCurrency(earlySavings);

    // Chart
    const ctx = document.getElementById('pmiChart')?.getContext('2d');
    if (ctx) {
        if (charts.pmi) charts.pmi.destroy();

        const labels = ltvData.map(d => d.x <= 60 ? `Mo ${d.x}` : `Yr ${d.x/12}`);

        charts.pmi = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'LTV Ratio (%)',
                        data: ltvData.map(d => d.y),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y'
                    },
                    {
                        label: '80% LTV Target',
                        data: targetData.map(d => d.y),
                        borderColor: '#10b981',
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        min: 60,
                        max: 100,
                        ticks: {
                            callback: (value) => value + '%'
                        }
                    }
                }
            }
        });
    }

    document.getElementById('pmi-results').style.display = 'block';
}

// ============================================
// POINTS BREAKEVEN CALCULATOR
// ============================================
function calculatePointsBreakeven() {
    const loanAmount = parseFloat(document.getElementById('points-loan').value) || 0;
    const term = parseInt(document.getElementById('points-term').value) || 30;
    const rateNoPoints = parseFloat(document.getElementById('points-rate-no').value) || 0;
    const rateWithPoints = parseFloat(document.getElementById('points-rate-yes').value) || 0;
    const points = parseFloat(document.getElementById('points-amount').value) || 0;
    const horizon = parseInt(document.getElementById('points-horizon').value) || 7;

    const pointsCost = loanAmount * (points / 100);
    const paymentNoPoints = calculateMonthlyPayment(loanAmount, rateNoPoints, term);
    const paymentWithPoints = calculateMonthlyPayment(loanAmount, rateWithPoints, term);
    const monthlySavings = paymentNoPoints - paymentWithPoints;

    const breakevenMonths = monthlySavings > 0 ? Math.ceil(pointsCost / monthlySavings) : Infinity;

    // Update display
    document.getElementById('points-pmt-no').textContent = formatCurrencyDecimal(paymentNoPoints);
    document.getElementById('points-pmt-yes').textContent = formatCurrencyDecimal(paymentWithPoints);
    document.getElementById('points-cost').textContent = formatCurrency(pointsCost);
    document.getElementById('points-breakeven-months').textContent = breakevenMonths === Infinity ? '∞' : breakevenMonths;

    // Recommendation
    const recDiv = document.getElementById('points-recommendation');
    const horizonMonths = horizon * 12;

    if (breakevenMonths < horizonMonths) {
        recDiv.className = 'points-recommendation good';
        recDiv.innerHTML = `<strong>Paying points is worth it!</strong> You'll break even in ${Math.floor(breakevenMonths/12)} years ${breakevenMonths%12} months,
            then save ${formatCurrencyDecimal(monthlySavings)}/month for the remaining ${horizon - Math.ceil(breakevenMonths/12)} years.`;
    } else {
        recDiv.className = 'points-recommendation bad';
        recDiv.innerHTML = `<strong>Skip the points.</strong> You won't break even within your ${horizon}-year horizon.
            Save the ${formatCurrency(pointsCost)} upfront.`;
    }

    // Savings table
    const timeframes = [3, 5, 7, 10, 15, 30].filter(y => y <= term);
    const tbody = document.getElementById('points-savings-body');
    tbody.innerHTML = timeframes.map(years => {
        const months = years * 12;
        const totalSavings = monthlySavings * months;
        const netBenefit = totalSavings - pointsCost;
        const netClass = netBenefit >= 0 ? 'positive' : 'negative';

        return `
            <tr>
                <td>${years} years</td>
                <td>${formatCurrencyDecimal(monthlySavings)}</td>
                <td>${formatCurrency(totalSavings)}</td>
                <td class="${netClass}">${netBenefit >= 0 ? '+' : ''}${formatCurrency(netBenefit)}</td>
            </tr>
        `;
    }).join('');

    document.getElementById('points-results').style.display = 'block';
}

// ============================================
// REFINANCE BREAKEVEN
// ============================================
function updateRefiCurrentPayment() {
    const balance = parseFloat(document.getElementById('refi-current-balance')?.value) || 0;
    const rate = parseFloat(document.getElementById('refi-current-rate')?.value) || 0;
    const term = parseInt(document.getElementById('refi-current-term')?.value) || 28;

    const payment = calculateMonthlyPayment(balance, rate, term);
    const input = document.getElementById('refi-current-pmt');
    if (input) input.value = Math.round(payment);
}

function calculateRefiBreakeven() {
    const currentBalance = parseFloat(document.getElementById('refi-current-balance').value) || 0;
    const currentRate = parseFloat(document.getElementById('refi-current-rate').value) || 0;
    const currentTerm = parseInt(document.getElementById('refi-current-term').value) || 28;
    const currentPayment = calculateMonthlyPayment(currentBalance, currentRate, currentTerm);

    const newRate = parseFloat(document.getElementById('refi-new-rate').value) || 0;
    const newTerm = parseInt(document.getElementById('refi-new-term').value) || 30;
    const closingCosts = parseFloat(document.getElementById('refi-closing-costs').value) || 0;
    const rollCosts = document.getElementById('refi-roll-costs').value === 'yes';

    const newLoanAmount = rollCosts ? currentBalance + closingCosts : currentBalance;
    const newPayment = calculateMonthlyPayment(newLoanAmount, newRate, newTerm);
    const monthlySavings = currentPayment - newPayment;

    const effectiveCosts = rollCosts ? 0 : closingCosts;
    const breakevenMonths = monthlySavings > 0 ? Math.ceil(effectiveCosts / monthlySavings) : Infinity;

    // Update display
    document.getElementById('refi-new-pmt').textContent = formatCurrencyDecimal(newPayment);
    document.getElementById('refi-monthly-savings').textContent = formatCurrencyDecimal(Math.abs(monthlySavings));
    document.getElementById('refi-costs-display').textContent = formatCurrency(closingCosts);
    document.getElementById('refi-breakeven-months').textContent = monthlySavings <= 0 ? 'N/A' : breakevenMonths;

    const breakevenDate = new Date();
    breakevenDate.setMonth(breakevenDate.getMonth() + breakevenMonths);
    document.getElementById('refi-breakeven-date').textContent = monthlySavings > 0 ?
        `(${breakevenDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})` : '';

    // Recommendation
    const recDiv = document.getElementById('refi-recommendation');
    if (monthlySavings <= 0) {
        recDiv.className = 'points-recommendation bad';
        recDiv.innerHTML = `<strong>Refinancing would increase your payment.</strong>
            Your current rate is already competitive, or the new term is too long.`;
    } else if (breakevenMonths <= 24) {
        recDiv.className = 'points-recommendation good';
        recDiv.innerHTML = `<strong>Great refinance opportunity!</strong>
            You'll break even in just ${breakevenMonths} months and save ${formatCurrency(monthlySavings * (newTerm * 12 - breakevenMonths))} over the life of the loan.`;
    } else if (breakevenMonths <= 48) {
        recDiv.className = 'points-recommendation';
        recDiv.style.background = 'rgba(245, 158, 11, 0.1)';
        recDiv.style.borderColor = 'rgba(245, 158, 11, 0.2)';
        recDiv.innerHTML = `<strong>Consider carefully.</strong>
            Break-even in ${Math.floor(breakevenMonths/12)} years ${breakevenMonths%12} months. Worth it if you'll stay in the home long-term.`;
    } else {
        recDiv.className = 'points-recommendation bad';
        recDiv.innerHTML = `<strong>Long break-even period.</strong>
            It will take ${Math.floor(breakevenMonths/12)}+ years to recoup costs. May not be worth it unless you plan to stay long-term.`;
    }

    // Chart
    const ctx = document.getElementById('refiChart')?.getContext('2d');
    if (ctx && monthlySavings > 0) {
        if (charts.refi) charts.refi.destroy();

        const months = Math.min(60, newTerm * 12);
        const labels = Array.from({length: months/6}, (_, i) => `Month ${(i+1)*6}`);

        const currentCosts = [];
        const refiCosts = [];
        let cumCurrent = 0;
        let cumRefi = effectiveCosts;

        for (let m = 6; m <= months; m += 6) {
            cumCurrent += currentPayment * 6;
            cumRefi += newPayment * 6;
            currentCosts.push(cumCurrent);
            refiCosts.push(cumRefi);
        }

        charts.refi = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Keep Current Loan',
                        data: currentCosts,
                        borderColor: '#ef4444',
                        fill: false,
                        tension: 0
                    },
                    {
                        label: 'Refinance',
                        data: refiCosts,
                        borderColor: '#10b981',
                        fill: false,
                        tension: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    document.getElementById('refi-breakeven-results').style.display = 'block';
}

// ============================================
// TOTAL COST OF OWNERSHIP
// ============================================
let tcoData = {};

function calculateTCO() {
    const homePrice = parseFloat(document.getElementById('tco-price').value) || 0;
    const downPct = parseFloat(document.getElementById('tco-down').value) / 100 || 0.2;
    const rate = parseFloat(document.getElementById('tco-rate').value) || 0;
    const term = parseInt(document.getElementById('tco-term').value) || 30;
    const taxRate = parseFloat(document.getElementById('tco-tax-rate').value) / 100 || 0.012;
    const annualInsurance = parseFloat(document.getElementById('tco-insurance').value) || 0;
    const maintenanceRate = parseFloat(document.getElementById('tco-maintenance').value) / 100 || 0.01;
    const monthlyHOA = parseFloat(document.getElementById('tco-hoa').value) || 0;
    const closingCosts = parseFloat(document.getElementById('tco-closing').value) || 0;
    const appreciation = parseFloat(document.getElementById('tco-appreciation').value) / 100 || 0.03;

    const downPayment = homePrice * downPct;
    const loanAmount = homePrice - downPayment;
    const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, term);

    // Calculate for each year
    tcoData = { yearly: [] };
    let balance = loanAmount;
    let totalPaid = downPayment + closingCosts;
    let currentHomeValue = homePrice;
    const monthlyRate = rate / 100 / 12;

    for (let year = 1; year <= term; year++) {
        // Yearly costs
        const yearlyMortgage = monthlyPayment * 12;
        const yearlyTaxes = currentHomeValue * taxRate;
        const yearlyMaintenance = currentHomeValue * maintenanceRate;
        const yearlyHOA = monthlyHOA * 12;

        totalPaid += yearlyMortgage + yearlyTaxes + annualInsurance + yearlyMaintenance + yearlyHOA;

        // Update balance
        for (let m = 0; m < 12; m++) {
            const interest = balance * monthlyRate;
            const principal = monthlyPayment - interest;
            balance = Math.max(0, balance - principal);
        }

        // Home appreciation
        currentHomeValue *= (1 + appreciation);

        const equity = currentHomeValue - balance;
        const netCost = totalPaid - equity;

        tcoData.yearly.push({
            year,
            totalPaid,
            homeValue: currentHomeValue,
            equity,
            netCost,
            breakdown: {
                downPayment: year === 1 ? downPayment : 0,
                closingCosts: year === 1 ? closingCosts : 0,
                mortgage: yearlyMortgage,
                taxes: yearlyTaxes,
                insurance: annualInsurance,
                maintenance: yearlyMaintenance,
                hoa: yearlyHOA
            }
        });
    }

    const activeYear = parseInt(document.querySelector('.tco-year-btn.active')?.dataset.year) || 10;
    updateTCODisplay(activeYear);

    document.getElementById('tco-results').style.display = 'block';
}

function updateTCODisplay(year) {
    if (!tcoData.yearly || tcoData.yearly.length === 0) return;

    const yearIndex = Math.min(year - 1, tcoData.yearly.length - 1);
    const data = tcoData.yearly[yearIndex];

    document.getElementById('tco-total-paid').textContent = formatCurrency(data.totalPaid);
    document.getElementById('tco-equity').textContent = formatCurrency(data.equity);
    document.getElementById('tco-home-value').textContent = `Home Value: ${formatCurrency(data.homeValue)}`;
    document.getElementById('tco-net-cost').textContent = formatCurrency(data.netCost);

    // Breakdown - cumulative
    let cumMortgage = 0, cumTaxes = 0, cumInsurance = 0, cumMaint = 0, cumHOA = 0;
    for (let i = 0; i <= yearIndex; i++) {
        cumMortgage += tcoData.yearly[i].breakdown.mortgage;
        cumTaxes += tcoData.yearly[i].breakdown.taxes;
        cumInsurance += tcoData.yearly[i].breakdown.insurance;
        cumMaint += tcoData.yearly[i].breakdown.maintenance;
        cumHOA += tcoData.yearly[i].breakdown.hoa;
    }

    document.getElementById('tco-breakdown').innerHTML = `
        Down + Closing: ${formatCurrency(tcoData.yearly[0].breakdown.downPayment + tcoData.yearly[0].breakdown.closingCosts)}<br>
        Mortgage: ${formatCurrency(cumMortgage)}<br>
        Taxes: ${formatCurrency(cumTaxes)}<br>
        Insurance: ${formatCurrency(cumInsurance)}<br>
        Maintenance: ${formatCurrency(cumMaint)}
        ${cumHOA > 0 ? `<br>HOA: ${formatCurrency(cumHOA)}` : ''}
    `;

    // Chart
    const ctx = document.getElementById('tcoChart')?.getContext('2d');
    if (ctx) {
        if (charts.tco) charts.tco.destroy();

        const labels = tcoData.yearly.slice(0, Math.min(year, 30)).map(d => `Yr ${d.year}`);

        charts.tco = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Paid',
                        data: tcoData.yearly.slice(0, year).map(d => d.totalPaid),
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Home Equity',
                        data: tcoData.yearly.slice(0, year).map(d => d.equity),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Net Cost',
                        data: tcoData.yearly.slice(0, year).map(d => d.netCost),
                        borderColor: '#8b5cf6',
                        fill: false,
                        tension: 0.3,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }
}

// ============================================
// BUYDOWN CALCULATOR
// ============================================
function calculateBuydown() {
    const loanAmount = parseFloat(document.getElementById('buydown-loan').value) || 0;
    const noteRate = parseFloat(document.getElementById('buydown-rate').value) || 0;
    const term = parseInt(document.getElementById('buydown-term').value) || 30;
    const buydownType = document.getElementById('buydown-type').value;

    // Define buydown structure
    const buydowns = {
        '3-2-1': [3, 2, 1],
        '2-1': [2, 1],
        '1-1': [1, 1],
        '1-0': [1]
    };

    const reductions = buydowns[buydownType];
    const fullPayment = calculateMonthlyPayment(loanAmount, noteRate, term);

    let totalBuydownCost = 0;
    const schedule = [];
    const savings = [];

    reductions.forEach((reduction, index) => {
        const reducedRate = noteRate - reduction;
        const reducedPayment = calculateMonthlyPayment(loanAmount, reducedRate, term);
        const yearlySavings = (fullPayment - reducedPayment) * 12;
        totalBuydownCost += yearlySavings;

        schedule.push({
            year: index + 1,
            rate: reducedRate,
            payment: reducedPayment,
            savings: yearlySavings
        });

        savings.push({
            label: `Year ${index + 1} Savings`,
            value: yearlySavings
        });
    });

    // Add full rate years
    schedule.push({
        year: `${reductions.length + 1}-${term}`,
        rate: noteRate,
        payment: fullPayment,
        savings: 0
    });

    // Update display
    document.getElementById('buydown-total-cost').textContent = formatCurrency(totalBuydownCost);

    document.getElementById('buydown-schedule').innerHTML = schedule.map((s, i) => `
        <div class="buydown-year ${i < reductions.length ? 'active' : ''}">
            <div class="year-label">Year ${s.year}</div>
            <div class="year-rate">${s.rate.toFixed(2)}%</div>
            <div class="year-payment">${formatCurrencyDecimal(s.payment)}/mo</div>
        </div>
    `).join('');

    document.getElementById('buydown-savings').innerHTML = `
        ${savings.map(s => `
            <div class="buydown-saving">
                <span class="label">${s.label}</span>
                <span class="value">${formatCurrency(s.value)}</span>
            </div>
        `).join('')}
        <div class="buydown-saving">
            <span class="label">Total Buydown Cost</span>
            <span class="value">${formatCurrency(totalBuydownCost)}</span>
        </div>
    `;

    document.getElementById('buydown-results').style.display = 'block';
}

// ============================================
// WHAT-IF SIMULATOR
// ============================================
function setupWhatIfSimulator() {
    const rateSlider = document.getElementById('whatif-rate');
    const downSlider = document.getElementById('whatif-down');
    const extraSlider = document.getElementById('whatif-extra');
    const priceInput = document.getElementById('whatif-price');
    const termSelect = document.getElementById('whatif-term');

    const update = () => {
        const homePrice = parseFloat(priceInput?.value) || 450000;
        const rate = parseFloat(rateSlider?.value) || 6.5;
        const downPct = parseFloat(downSlider?.value) || 20;
        const extra = parseFloat(extraSlider?.value) || 0;
        const term = parseInt(termSelect?.value) || 30;

        const downPayment = homePrice * (downPct / 100);
        const loanAmount = homePrice - downPayment;
        const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, term);

        // Update slider displays
        document.getElementById('whatif-rate-display').textContent = rate + '%';
        document.getElementById('whatif-down-display').textContent = `${downPct}% (${formatCurrency(downPayment)})`;
        document.getElementById('whatif-extra-display').textContent = formatCurrency(extra);

        // Update slider background
        updateSliderBackground(rateSlider, 4, 10);
        updateSliderBackground(downSlider, 3, 30);
        updateSliderBackground(extraSlider, 0, 1000);

        // Calculate with extra payments
        let balance = loanAmount;
        let totalInterest = 0;
        let totalInterestBase = 0;
        const monthlyRate = rate / 100 / 12;
        let monthsToPayoff = term * 12;

        for (let month = 1; month <= term * 12; month++) {
            if (balance > 0) {
                const interest = balance * monthlyRate;
                const principal = Math.min(monthlyPayment - interest + extra, balance);
                balance -= principal;
                totalInterest += interest;

                if (balance <= 0 && monthsToPayoff === term * 12) {
                    monthsToPayoff = month;
                }
            }

            // Base calculation (no extra)
            if (month <= term * 12) {
                totalInterestBase += (loanAmount - (monthlyPayment - loanAmount * monthlyRate / 12) * month) * monthlyRate;
            }
        }

        // Recalculate base interest properly
        let baseBalance = loanAmount;
        totalInterestBase = 0;
        for (let month = 1; month <= term * 12; month++) {
            const interest = baseBalance * monthlyRate;
            const principal = monthlyPayment - interest;
            baseBalance -= principal;
            totalInterestBase += interest;
            if (baseBalance <= 0) break;
        }

        const interestSaved = extra > 0 ? totalInterestBase - totalInterest : 0;
        const yearsToPayoff = Math.floor(monthsToPayoff / 12);
        const monthsRemaining = monthsToPayoff % 12;

        // Update display
        document.getElementById('whatif-monthly').textContent = formatCurrencyDecimal(monthlyPayment);
        document.getElementById('whatif-loan-amt').textContent = formatCurrency(loanAmount);
        document.getElementById('whatif-total-int').textContent = formatCurrency(totalInterest);
        document.getElementById('whatif-payoff').textContent = `${yearsToPayoff} yrs ${monthsRemaining} mo`;

        if (extra > 0) {
            document.getElementById('whatif-savings-stat').style.display = '';
            document.getElementById('whatif-saved').textContent = formatCurrency(interestSaved);
        } else {
            document.getElementById('whatif-savings-stat').style.display = 'none';
        }

        // PMI warning
        document.getElementById('whatif-pmi-warning').style.display = downPct < 20 ? '' : 'none';

        // Update chart
        updateWhatIfChart(loanAmount, rate, term, extra);
    };

    // Add event listeners
    [rateSlider, downSlider, extraSlider].forEach(slider => {
        slider?.addEventListener('input', update);
    });

    [priceInput, termSelect].forEach(el => {
        el?.addEventListener('change', update);
    });

    // Initial calculation
    update();
}

function updateSliderBackground(slider, min, max) {
    if (!slider) return;
    const value = parseFloat(slider.value);
    const percentage = ((value - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--navy-blue) 0%, var(--navy-blue) ${percentage}%, var(--border-color) ${percentage}%, var(--border-color) 100%)`;
}

function updateWhatIfChart(loanAmount, rate, term, extra) {
    const ctx = document.getElementById('whatifChart')?.getContext('2d');
    if (!ctx) return;

    if (charts.whatif) charts.whatif.destroy();

    const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, term);
    const monthlyRate = rate / 100 / 12;

    const principalData = [];
    const interestData = [];
    let balance = loanAmount;

    for (let year = 1; year <= term; year++) {
        let yearPrincipal = 0;
        let yearInterest = 0;

        for (let m = 0; m < 12; m++) {
            if (balance > 0) {
                const interest = balance * monthlyRate;
                const principal = Math.min(monthlyPayment - interest + extra, balance);
                balance -= principal;
                yearPrincipal += principal;
                yearInterest += interest;
            }
        }

        principalData.push(yearPrincipal);
        interestData.push(yearInterest);

        if (balance <= 0) break;
    }

    const labels = Array.from({length: principalData.length}, (_, i) => `Yr ${i + 1}`);

    charts.whatif = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Principal',
                    data: principalData,
                    backgroundColor: '#3b82f6',
                    stack: 'stack1'
                },
                {
                    label: 'Interest',
                    data: interestData,
                    backgroundColor: '#ef4444',
                    stack: 'stack1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

// ============================================
// LIFE EVENTS TIMELINE CALCULATOR
// ============================================
function calculateLifeEvents() {
    const loanAmount = parseFloat(document.getElementById('le-loan-amount').value) || 0;
    const rate = parseFloat(document.getElementById('le-rate').value) || 0;
    const term = parseInt(document.getElementById('le-term').value) || 30;
    const currentAge = parseInt(document.getElementById('le-current-age').value) || 35;

    const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, term);
    const currentYear = new Date().getFullYear();

    // Gather life events
    const events = [];

    // Mortgage start (always included)
    events.push({
        year: currentYear,
        age: currentAge,
        type: 'mortgage',
        title: 'Mortgage Begins',
        detail: `${formatCurrency(monthlyPayment)}/month for ${term} years`
    });

    // Mortgage payoff
    events.push({
        year: currentYear + term,
        age: currentAge + term,
        type: 'mortgage',
        title: 'Mortgage Paid Off',
        detail: `Total paid: ${formatCurrency(monthlyPayment * term * 12)}`
    });

    // Retirement
    if (document.getElementById('le-retirement').checked) {
        const retirementAge = parseInt(document.getElementById('le-retirement-age').value) || 65;
        const yearsToRetirement = retirementAge - currentAge;
        events.push({
            year: currentYear + yearsToRetirement,
            age: retirementAge,
            type: 'retirement',
            title: 'Retirement',
            detail: calculateRetirementDetail(yearsToRetirement, term, monthlyPayment, loanAmount, rate)
        });
    }

    // College
    if (document.getElementById('le-college').checked) {
        const collegeYears = parseInt(document.getElementById('le-college-years').value) || 10;
        events.push({
            year: currentYear + collegeYears,
            age: currentAge + collegeYears,
            type: 'college',
            title: "Child's College Begins",
            detail: calculateCollegeDetail(collegeYears, monthlyPayment, loanAmount, rate)
        });
    }

    // Career change
    if (document.getElementById('le-career-change').checked) {
        const careerYears = parseInt(document.getElementById('le-career-years').value) || 5;
        events.push({
            year: currentYear + careerYears,
            age: currentAge + careerYears,
            type: 'career',
            title: 'Career Change',
            detail: calculateCareerDetail(careerYears, monthlyPayment, loanAmount, rate)
        });
    }

    // Downsize
    if (document.getElementById('le-downsize').checked) {
        const downsizeYears = parseInt(document.getElementById('le-downsize-years').value) || 20;
        events.push({
            year: currentYear + downsizeYears,
            age: currentAge + downsizeYears,
            type: 'downsize',
            title: 'Plan to Downsize',
            detail: calculateDownsizeDetail(downsizeYears, loanAmount, rate, term)
        });
    }

    // Payoff goal
    if (document.getElementById('le-paid-off-goal').checked) {
        const payoffAge = parseInt(document.getElementById('le-payoff-age').value) || 60;
        const yearsToPayoff = payoffAge - currentAge;
        events.push({
            year: currentYear + yearsToPayoff,
            age: payoffAge,
            type: 'payoff',
            title: 'Payoff Goal',
            detail: calculatePayoffGoalDetail(yearsToPayoff, term, monthlyPayment, loanAmount, rate)
        });
    }

    // Sort by year
    events.sort((a, b) => a.year - b.year);

    // Generate timeline HTML
    const timelineDiv = document.getElementById('life-events-timeline');
    timelineDiv.innerHTML = `
        <div class="timeline-container">
            <div class="timeline-line"></div>
            ${events.map(e => `
                <div class="timeline-event">
                    <div class="timeline-marker ${e.type}"></div>
                    <div class="timeline-content ${e.type}">
                        <div class="timeline-year">${e.year} (Age ${e.age})</div>
                        <div class="timeline-title">${e.title}</div>
                        <div class="timeline-detail">${e.detail}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Generate insights
    const insightsDiv = document.getElementById('life-events-insights');
    const insights = generateLifeEventInsights(events, currentAge, term, monthlyPayment, loanAmount, rate);
    insightsDiv.innerHTML = insights.map(i => `
        <div class="insight-card ${i.type}">
            <h5>${i.title}</h5>
            <p>${i.message}</p>
        </div>
    `).join('');

    // Chart
    const ctx = document.getElementById('lifeEventsChart')?.getContext('2d');
    if (ctx) {
        if (charts.lifeEvents) charts.lifeEvents.destroy();

        const years = [];
        const balances = [];
        const equity = [];
        let balance = loanAmount;
        const monthlyRate = rate / 100 / 12;

        for (let y = 0; y <= term; y++) {
            years.push(currentYear + y);
            balances.push(balance);
            equity.push(loanAmount - balance);

            for (let m = 0; m < 12 && balance > 0; m++) {
                const interest = balance * monthlyRate;
                const principal = monthlyPayment - interest;
                balance = Math.max(0, balance - principal);
            }
        }

        charts.lifeEvents = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'Loan Balance',
                        data: balances,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true
                    },
                    {
                        label: 'Equity Built',
                        data: equity,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: { callback: (v) => formatCurrency(v) }
                    }
                }
            }
        });
    }

    document.getElementById('life-events-results').style.display = 'block';

    // Store for export
    window.lifeEventsResults = { events, insights };
}

function calculateRetirementDetail(yearsToRetirement, term, monthlyPayment, loanAmount, rate) {
    if (yearsToRetirement >= term) {
        return `Mortgage will be paid off ${yearsToRetirement - term} years before retirement!`;
    } else {
        const remainingYears = term - yearsToRetirement;
        const balance = calculateRemainingBalance(loanAmount, rate, term, yearsToRetirement);
        return `${formatCurrency(balance)} remaining balance at retirement (${remainingYears} years left)`;
    }
}

function calculateCollegeDetail(collegeYears, monthlyPayment, loanAmount, rate) {
    const balance = calculateRemainingBalance(loanAmount, rate, 30, collegeYears);
    const equityBuilt = loanAmount - balance;
    return `${formatCurrency(equityBuilt)} equity built by this point. Could refinance to free up cash.`;
}

function calculateCareerDetail(careerYears, monthlyPayment, loanAmount, rate) {
    const totalPaid = monthlyPayment * careerYears * 12;
    return `${formatCurrency(totalPaid)} paid by career change. Ensure 6+ months emergency fund.`;
}

function calculateDownsizeDetail(downsizeYears, loanAmount, rate, term) {
    const balance = calculateRemainingBalance(loanAmount, rate, term, downsizeYears);
    const equityBuilt = loanAmount - balance;
    return `${formatCurrency(equityBuilt)} in equity to roll into new home (plus appreciation)`;
}

function calculatePayoffGoalDetail(yearsToPayoff, term, monthlyPayment, loanAmount, rate) {
    if (yearsToPayoff >= term) {
        return `Standard payments will pay off ${term - yearsToPayoff} years early!`;
    } else {
        const balance = calculateRemainingBalance(loanAmount, rate, term, yearsToPayoff);
        const extraNeeded = balance / (yearsToPayoff * 12);
        return `Need extra ${formatCurrency(extraNeeded)}/month to pay off ${term - yearsToPayoff} years early`;
    }
}

function calculateRemainingBalance(loanAmount, rate, term, yearsElapsed) {
    const monthlyRate = rate / 100 / 12;
    const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, term);

    let balance = loanAmount;
    for (let i = 0; i < yearsElapsed * 12 && balance > 0; i++) {
        const interest = balance * monthlyRate;
        const principal = monthlyPayment - interest;
        balance = Math.max(0, balance - principal);
    }
    return balance;
}

function generateLifeEventInsights(events, currentAge, term, monthlyPayment, loanAmount, rate) {
    const insights = [];

    const retirement = events.find(e => e.type === 'retirement');
    const mortgageEnd = events.find(e => e.type === 'mortgage' && e.title.includes('Paid Off'));

    if (retirement && mortgageEnd) {
        if (retirement.year > mortgageEnd.year) {
            insights.push({
                type: 'success',
                title: 'Mortgage-Free Retirement!',
                message: `Your mortgage will be paid off ${retirement.year - mortgageEnd.year} years before retirement. That's ${formatCurrency(monthlyPayment * (retirement.year - mortgageEnd.year) * 12)} you won't need to budget for in retirement.`
            });
        } else {
            const yearsRemaining = mortgageEnd.year - retirement.year;
            insights.push({
                type: 'warning',
                title: 'Mortgage Extends Past Retirement',
                message: `You'll still have ${yearsRemaining} years of payments after retiring. Consider making extra payments or refinancing to a shorter term.`
            });
        }
    }

    const payoff = events.find(e => e.type === 'payoff');
    if (payoff && mortgageEnd && payoff.year < mortgageEnd.year) {
        const yearsEarly = mortgageEnd.year - payoff.year;
        insights.push({
            type: 'info',
            title: 'Early Payoff Strategy',
            message: `To meet your payoff goal ${yearsEarly} years early, increase monthly payments or make periodic lump sum contributions.`
        });
    }

    const college = events.find(e => e.type === 'college');
    if (college) {
        insights.push({
            type: 'info',
            title: 'College Planning Tip',
            message: `When college expenses hit, you may want to pause extra mortgage payments and redirect to education costs. Your home equity can also be tapped via HELOC if needed.`
        });
    }

    return insights;
}

// ============================================
// STRESS TEST CALCULATOR
// ============================================
function calculateStressTest() {
    const homeValue = parseFloat(document.getElementById('st-home-value').value) || 0;
    const loanAmount = parseFloat(document.getElementById('st-loan-amount').value) || 0;
    const rate = parseFloat(document.getElementById('st-rate').value) || 0;
    const term = parseInt(document.getElementById('st-term').value) || 30;
    const monthlyIncome = parseFloat(document.getElementById('st-income').value) || 0;
    const savings = parseFloat(document.getElementById('st-savings').value) || 0;

    const currentPayment = calculateMonthlyPayment(loanAmount, rate, term);
    const currentLTV = (loanAmount / homeValue) * 100;

    const results = [];
    let totalScore = 0;
    let testsRun = 0;

    // Rate Increase Test
    if (document.getElementById('st-rate-increase').checked) {
        const rateIncrease = parseFloat(document.getElementById('st-rate-increase-amt').value) || 2;
        const newRate = rate + rateIncrease;
        const newPayment = calculateMonthlyPayment(loanAmount, newRate, term);
        const paymentIncrease = newPayment - currentPayment;
        const newDTI = (newPayment / monthlyIncome) * 100;

        let status, score;
        if (newDTI <= 36) {
            status = 'pass';
            score = 100;
        } else if (newDTI <= 43) {
            status = 'warning';
            score = 60;
        } else {
            status = 'fail';
            score = 20;
        }

        results.push({
            name: 'Interest Rate Spike',
            status,
            description: `If rates increase ${rateIncrease}%, your payment rises ${formatCurrency(paymentIncrease)}/month`,
            stat: formatCurrency(newPayment),
            statLabel: 'New Payment'
        });
        totalScore += score;
        testsRun++;
    }

    // Income Loss Test
    if (document.getElementById('st-income-loss').checked) {
        const incomeLossPct = parseFloat(document.getElementById('st-income-loss-pct').value) || 50;
        const monthsOfRunway = Math.floor(savings / (currentPayment + 1500));

        let status, score;
        if (monthsOfRunway >= 6) {
            status = 'pass';
            score = 100;
        } else if (monthsOfRunway >= 3) {
            status = 'warning';
            score = 50;
        } else {
            status = 'fail';
            score = 10;
        }

        results.push({
            name: 'Income Disruption',
            status,
            description: `With ${incomeLossPct}% income reduction, your emergency fund covers ${monthsOfRunway} months`,
            stat: `${monthsOfRunway} mo`,
            statLabel: 'Runway'
        });
        totalScore += score;
        testsRun++;
    }

    // Market Drop Test
    if (document.getElementById('st-market-drop').checked) {
        const marketDropPct = parseFloat(document.getElementById('st-market-drop-pct').value) || 20;
        const newHomeValue = homeValue * (1 - marketDropPct / 100);
        const newLTV = (loanAmount / newHomeValue) * 100;
        const equity = newHomeValue - loanAmount;

        let status, score;
        if (newLTV <= 80) {
            status = 'pass';
            score = 100;
        } else if (newLTV <= 100) {
            status = 'warning';
            score = 50;
        } else {
            status = 'fail';
            score = 0;
        }

        results.push({
            name: 'Market Downturn',
            status,
            description: `A ${marketDropPct}% value drop leaves you with ${formatCurrency(equity)} equity (${newLTV.toFixed(1)}% LTV)`,
            stat: equity >= 0 ? formatCurrency(equity) : `-${formatCurrency(Math.abs(equity))}`,
            statLabel: 'Remaining Equity'
        });
        totalScore += score;
        testsRun++;
    }

    // Forced Sale Test
    if (document.getElementById('st-emergency-sell').checked) {
        const sellingCostsPct = parseFloat(document.getElementById('st-selling-costs').value) || 8;
        const sellingCosts = homeValue * (sellingCostsPct / 100);
        const netProceeds = homeValue - loanAmount - sellingCosts;

        let status, score;
        if (netProceeds >= 10000) {
            status = 'pass';
            score = 100;
        } else if (netProceeds >= 0) {
            status = 'warning';
            score = 60;
        } else {
            status = 'fail';
            score = 0;
        }

        results.push({
            name: 'Forced Sale',
            status,
            description: `After ${sellingCostsPct}% selling costs, you'd ${netProceeds >= 0 ? 'walk away with' : 'need to bring'} ${formatCurrency(Math.abs(netProceeds))}`,
            stat: netProceeds >= 0 ? formatCurrency(netProceeds) : `-${formatCurrency(Math.abs(netProceeds))}`,
            statLabel: netProceeds >= 0 ? 'Net Proceeds' : 'Shortfall'
        });
        totalScore += score;
        testsRun++;
    }

    // Calculate overall score
    const overallScore = testsRun > 0 ? Math.round(totalScore / testsRun) : 0;

    let rating, ratingClass;
    if (overallScore >= 80) {
        rating = 'Excellent Resilience';
        ratingClass = 'excellent';
    } else if (overallScore >= 60) {
        rating = 'Good Standing';
        ratingClass = 'good';
    } else if (overallScore >= 40) {
        rating = 'Some Vulnerabilities';
        ratingClass = 'fair';
    } else {
        rating = 'High Risk';
        ratingClass = 'poor';
    }

    // Update score display
    const scoreValue = document.getElementById('stress-score-value');
    const scoreFill = document.getElementById('stress-score-fill');
    const ratingDiv = document.getElementById('stress-rating');

    scoreValue.textContent = overallScore;
    scoreFill.className = `score-fill ${ratingClass}`;
    scoreFill.style.strokeDashoffset = 126 - (126 * overallScore / 100);

    ratingDiv.className = `stress-rating ${ratingClass}`;
    ratingDiv.innerHTML = `
        <h3>${rating}</h3>
        <p>${getRatingDescription(ratingClass)}</p>
    `;

    // Display scenario results
    const resultsDiv = document.getElementById('stress-scenarios-results');
    resultsDiv.innerHTML = results.map(r => `
        <div class="scenario-result">
            <div class="scenario-result-icon ${r.status}">
                ${getResultIcon(r.status)}
            </div>
            <div class="scenario-result-content">
                <h4>${r.name}</h4>
                <p>${r.description}</p>
            </div>
            <div class="scenario-result-stat">
                <div class="value">${r.stat}</div>
                <div class="label">${r.statLabel}</div>
            </div>
        </div>
    `).join('');

    // Generate recommendations
    const recsDiv = document.getElementById('stress-recommendations');
    const recommendations = generateStressRecommendations(results, savings, currentPayment, currentLTV);
    recsDiv.innerHTML = `
        <h4>Recommendations to Improve Resilience</h4>
        <ul>
            ${recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
    `;

    document.getElementById('stress-test-results').style.display = 'block';

    // Store for export
    window.stressTestResults = {
        score: overallScore,
        rating,
        results,
        recommendations
    };
}

function getRatingDescription(ratingClass) {
    const descriptions = {
        excellent: 'Your mortgage situation can handle most financial shocks. You have strong reserves and manageable debt.',
        good: 'You\'re in solid shape for most scenarios, but consider building additional reserves for extra security.',
        fair: 'Some stress scenarios could challenge your finances. Review the results below for areas to strengthen.',
        poor: 'Multiple vulnerabilities detected. Consider building emergency savings and exploring options to reduce risk.'
    };
    return descriptions[ratingClass];
}

function getResultIcon(status) {
    if (status === 'pass') {
        return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (status === 'warning') {
        return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    } else {
        return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    }
}

function generateStressRecommendations(results, savings, currentPayment, currentLTV) {
    const recs = [];

    const failedTests = results.filter(r => r.status === 'fail');
    const warningTests = results.filter(r => r.status === 'warning');

    const monthsOfSavings = savings / (currentPayment + 1500);
    if (monthsOfSavings < 6) {
        recs.push(`Build emergency fund to 6 months of expenses (${formatCurrency((6 - monthsOfSavings) * (currentPayment + 1500))} more needed)`);
    }

    if (currentLTV > 80) {
        recs.push('Consider making extra principal payments to reach 20% equity faster and eliminate PMI');
    }

    if (failedTests.some(t => t.name.includes('Rate'))) {
        recs.push('If you have an ARM, consider refinancing to a fixed-rate mortgage for payment stability');
    }

    if (failedTests.some(t => t.name.includes('Sale')) || warningTests.some(t => t.name.includes('Sale'))) {
        recs.push('Avoid selling in a down market if possible. Build equity cushion with extra payments.');
    }

    if (recs.length === 0) {
        recs.push('Maintain your current financial habits - you\'re well prepared for adversity');
        recs.push('Consider investing extra funds since your emergency reserves are solid');
    }

    return recs;
}

// ============================================
// BUY VS KEEP CALCULATOR
// ============================================
function calculateBuyVsKeep() {
    // Current home inputs
    const keepHomeValue = parseFloat(document.getElementById('keep-home-value').value) || 0;
    const keepMortgageBalance = parseFloat(document.getElementById('keep-mortgage-balance').value) || 0;
    const keepMonthlyPayment = parseFloat(document.getElementById('keep-monthly-payment').value) || 0;
    const keepYearsRemaining = parseInt(document.getElementById('keep-years-remaining').value) || 0;
    const keepMaintenance = parseFloat(document.getElementById('keep-maintenance').value) || 0;

    // New home inputs
    const buyHomePrice = parseFloat(document.getElementById('buy-home-price').value) || 0;
    const buyDownPayment = parseFloat(document.getElementById('buy-down-payment').value) || 0;
    const buyInterestRate = parseFloat(document.getElementById('buy-interest-rate').value) || 0;
    const buyLoanTerm = parseInt(document.getElementById('buy-loan-term').value) || 30;
    const buyClosingCosts = parseFloat(document.getElementById('buy-closing-costs').value) || 0;
    const appreciation = parseFloat(document.getElementById('buy-keep-appreciation').value) / 100 || 0.03;

    // Calculate new home loan
    const newLoanAmount = buyHomePrice - buyDownPayment;
    const newMonthlyPayment = calculateMonthlyPayment(newLoanAmount, buyInterestRate, buyLoanTerm);

    // 5-year projections
    const years = 5;

    // Keep scenario
    let keepTotalCost = 0;
    let keepCurrentValue = keepHomeValue;
    let keepCurrentBalance = keepMortgageBalance;
    const keepMonthlyRate = 0.05 / 12; // Estimated rate for remaining balance calc

    for (let y = 1; y <= years; y++) {
        keepTotalCost += keepMonthlyPayment * 12 + keepMaintenance;
        keepCurrentValue *= (1 + appreciation);
        // Simplified balance reduction
        keepCurrentBalance -= (keepMortgageBalance / (keepYearsRemaining || 25)) * 1;
    }
    keepCurrentBalance = Math.max(0, keepCurrentBalance);
    const keepEquityGain = (keepCurrentValue - keepHomeValue) + (keepMortgageBalance - keepCurrentBalance);
    const keepNetPosition = keepEquityGain - keepTotalCost;

    // Buy scenario
    let buyTotalCost = buyDownPayment + buyClosingCosts;
    let buyCurrentValue = buyHomePrice;
    let buyCurrentBalance = newLoanAmount;
    const buyMonthlyRate = buyInterestRate / 100 / 12;

    // Add selling costs from current home (6% realtor fees typically)
    const sellingCosts = keepHomeValue * 0.06;

    for (let y = 1; y <= years; y++) {
        buyTotalCost += newMonthlyPayment * 12 + (buyHomePrice * 0.01); // 1% maintenance
        buyCurrentValue *= (1 + appreciation);
        // Calculate principal paid
        for (let m = 0; m < 12; m++) {
            const interest = buyCurrentBalance * buyMonthlyRate;
            const principal = newMonthlyPayment - interest;
            buyCurrentBalance = Math.max(0, buyCurrentBalance - principal);
        }
    }

    const buyEquityGain = (buyCurrentValue - buyHomePrice) + (newLoanAmount - buyCurrentBalance);
    // Net position includes equity from selling current home
    const currentHomeEquity = keepHomeValue - keepMortgageBalance - sellingCosts;
    const buyNetPosition = buyEquityGain + currentHomeEquity - buyTotalCost;

    // Update display
    document.getElementById('keep-monthly-cost').textContent = formatCurrency(keepMonthlyPayment + keepMaintenance / 12);
    document.getElementById('keep-5yr-cost').textContent = formatCurrency(keepTotalCost);
    document.getElementById('keep-5yr-equity').textContent = formatCurrency(keepEquityGain);
    document.getElementById('keep-5yr-net').textContent = formatCurrency(keepNetPosition);

    document.getElementById('buy-monthly-cost').textContent = formatCurrency(newMonthlyPayment + (buyHomePrice * 0.01) / 12);
    document.getElementById('buy-5yr-cost').textContent = formatCurrency(buyTotalCost);
    document.getElementById('buy-5yr-equity').textContent = formatCurrency(buyEquityGain);
    document.getElementById('buy-5yr-net').textContent = formatCurrency(buyNetPosition);

    // Recommendation
    const recDiv = document.getElementById('buy-keep-recommendation');
    if (keepNetPosition > buyNetPosition) {
        recDiv.className = 'buy-keep-recommendation';
        recDiv.innerHTML = `<h4>Keeping your current home appears better financially</h4>
            <p>Over ${years} years, staying in your current home results in a net position ${formatCurrency(keepNetPosition - buyNetPosition)} better than buying a new home. Consider the non-financial factors like space needs and location preferences.</p>`;
    } else {
        recDiv.className = 'buy-keep-recommendation new-wins';
        recDiv.innerHTML = `<h4>Buying a new home may be the better choice</h4>
            <p>Over ${years} years, buying a new home results in a net position ${formatCurrency(buyNetPosition - keepNetPosition)} better than keeping your current home. This accounts for selling costs and equity transfer.</p>`;
    }

    // Chart
    const ctx = document.getElementById('buyKeepChart')?.getContext('2d');
    if (ctx) {
        if (charts.buyKeep) charts.buyKeep.destroy();

        const labels = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
        const keepData = [];
        const buyData = [];

        let runningKeepCost = 0;
        let runningBuyCost = buyDownPayment + buyClosingCosts;
        let runningKeepValue = keepHomeValue;
        let runningBuyValue = buyHomePrice;
        let runningKeepBalance = keepMortgageBalance;
        let runningBuyBalance = newLoanAmount;

        for (let y = 1; y <= years; y++) {
            runningKeepCost += keepMonthlyPayment * 12 + keepMaintenance;
            runningBuyCost += newMonthlyPayment * 12 + (buyHomePrice * 0.01);
            runningKeepValue *= (1 + appreciation);
            runningBuyValue *= (1 + appreciation);
            runningKeepBalance -= (keepMortgageBalance / keepYearsRemaining);
            for (let m = 0; m < 12; m++) {
                const interest = runningBuyBalance * buyMonthlyRate;
                runningBuyBalance = Math.max(0, runningBuyBalance - (newMonthlyPayment - interest));
            }

            const keepNet = (runningKeepValue - runningKeepBalance) - runningKeepCost;
            const buyNet = (runningBuyValue - runningBuyBalance) + currentHomeEquity - runningBuyCost;
            keepData.push(keepNet);
            buyData.push(buyNet);
        }

        charts.buyKeep = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Keep Current Home',
                        data: keepData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Buy New Home',
                        data: buyData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    document.getElementById('buy-keep-results').style.display = 'block';

    // Store results for export
    window.buyKeepResults = {
        keep: {
            monthlyPayment: keepMonthlyPayment + keepMaintenance / 12,
            totalCost5yr: keepTotalCost,
            equityGain5yr: keepEquityGain,
            netPosition5yr: keepNetPosition
        },
        buy: {
            monthlyPayment: newMonthlyPayment + (buyHomePrice * 0.01) / 12,
            totalCost5yr: buyTotalCost,
            equityGain5yr: buyEquityGain,
            netPosition5yr: buyNetPosition
        },
        recommendation: keepNetPosition > buyNetPosition ? 'keep' : 'buy'
    };
}

// ============================================
// RENT INCREASE SIMULATOR
// ============================================
function calculateRentSimulator() {
    const currentRent = parseFloat(document.getElementById('rent-sim-current').value) || 0;
    const annualIncrease = parseFloat(document.getElementById('rent-sim-increase').value) / 100 || 0.05;
    const years = parseInt(document.getElementById('rent-sim-years').value) || 10;
    const mortgagePayment = parseFloat(document.getElementById('rent-sim-mortgage').value) || 0;

    let rent = currentRent;
    let totalRent = 0;
    let crossoverYear = null;
    const tableData = [];
    const rentData = [];
    const mortgageData = [];

    for (let y = 1; y <= years; y++) {
        const annualRent = rent * 12;
        totalRent += annualRent;

        const difference = rent - mortgagePayment;
        const differenceClass = difference > 0 ? 'exceeds' : 'below';

        if (rent > mortgagePayment && crossoverYear === null) {
            crossoverYear = y;
        }

        tableData.push({
            year: y,
            monthlyRent: rent,
            annualRent: annualRent,
            cumulativeRent: totalRent,
            vsMortgage: difference,
            differenceClass: differenceClass
        });

        rentData.push(rent);
        mortgageData.push(mortgagePayment);

        // Increase rent for next year
        rent *= (1 + annualIncrease);
    }

    const finalRent = tableData[years - 1].monthlyRent;

    // Update display
    document.getElementById('rent-sim-year1').textContent = formatCurrency(currentRent) + '/mo';
    document.getElementById('rent-sim-final').textContent = formatCurrency(finalRent) + '/mo';
    document.getElementById('rent-sim-total').textContent = formatCurrency(totalRent);
    document.getElementById('rent-sim-crossover').textContent = crossoverYear ? `Year ${crossoverYear}` : 'Never';

    // Build table
    const tbody = document.getElementById('rent-sim-table-body');
    tbody.innerHTML = tableData.map(row => `
        <tr>
            <td>Year ${row.year}</td>
            <td>${formatCurrency(row.monthlyRent)}</td>
            <td>${formatCurrency(row.annualRent)}</td>
            <td>${formatCurrency(row.cumulativeRent)}</td>
            <td class="${row.differenceClass}">${row.vsMortgage >= 0 ? '+' : ''}${formatCurrency(row.vsMortgage)}</td>
        </tr>
    `).join('');

    // Chart
    const ctx = document.getElementById('rentSimChart')?.getContext('2d');
    if (ctx) {
        if (charts.rentSim) charts.rentSim.destroy();

        const labels = tableData.map(d => `Year ${d.year}`);

        charts.rentSim = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Monthly Rent',
                        data: rentData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Fixed Mortgage Payment',
                        data: mortgageData,
                        borderColor: '#10b981',
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    document.getElementById('rent-sim-results').style.display = 'block';

    // Store results for export
    window.rentSimResults = {
        currentRent: currentRent,
        finalRent: finalRent,
        totalRentPaid: totalRent,
        crossoverYear: crossoverYear,
        mortgagePayment: mortgagePayment,
        annualIncrease: annualIncrease * 100,
        years: years
    };
}

// ============================================
// TOOL EXPORT SYSTEM
// ============================================
const toolNames = {
    'dti': 'Debt-to-Income Calculator',
    'rent-buy': 'Rent vs Buy Calculator',
    'eligibility': 'Loan Program Eligibility',
    'amortization': 'Amortization Schedule',
    'arm-fixed': 'ARM vs Fixed Comparison',
    'heloc-refi': 'HELOC vs Cash-Out Refi',
    'pmi': 'PMI Removal Timeline',
    'points': 'Points Breakeven Calculator',
    'refi-breakeven': 'Refinance Breakeven',
    'tco': 'Total Cost of Ownership',
    'buydown': 'Buydown Calculator',
    'whatif': 'What-If Simulator',
    'buy-keep': 'Buy vs Keep Current Home',
    'rent-simulator': 'Rent Increase Simulator',
    'life-events': 'Life Events Timeline',
    'stress-test': 'Mortgage Stress Test'
};

function updateExportFab() {
    const checkboxes = document.querySelectorAll('.tool-export-check:checked');
    const fab = document.getElementById('toolExportFab');
    const countEl = document.getElementById('exportCount');

    if (checkboxes.length > 0) {
        fab.style.display = 'flex';
        countEl.textContent = checkboxes.length;
    } else {
        fab.style.display = 'none';
    }
}

function openToolExportModal() {
    const modal = document.getElementById('toolExportModal');
    const overlay = document.getElementById('toolExportOverlay');
    const toolsList = document.getElementById('export-tools-list');

    // Get selected tools
    const checkboxes = document.querySelectorAll('.tool-export-check:checked');
    const selectedTools = Array.from(checkboxes).map(cb => cb.dataset.tool);

    // Build list of selected tools
    toolsList.innerHTML = selectedTools.map(tool => {
        const toolCard = document.querySelector(`[data-tool="${tool}"]`)?.closest('.tool-card');
        const hasResults = toolCard?.querySelector('.tool-results')?.style.display !== 'none';

        return `
            <div class="export-tool-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                <span class="tool-name">${toolNames[tool] || tool}</span>
                <span class="tool-status">${hasResults ? 'Calculated' : 'Pending'}</span>
            </div>
        `;
    }).join('');

    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
}

function closeToolExportModal() {
    document.getElementById('toolExportModal').classList.add('hidden');
    document.getElementById('toolExportOverlay').classList.add('hidden');
}

function generateToolsReport() {
    const clientName = document.getElementById('export-client-name').value || 'Client';
    const propertyAddress = document.getElementById('export-property-address').value || '';
    const notes = document.getElementById('export-notes').value || '';

    const checkboxes = document.querySelectorAll('.tool-export-check:checked');
    const selectedTools = Array.from(checkboxes).map(cb => cb.dataset.tool);

    // Get LO info
    const loInfo = JSON.parse(localStorage.getItem('loandrUserInfo') || '{}');
    const lenderInfo = JSON.parse(localStorage.getItem('loandrLenderInfo') || '{}');

    let reportHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Mortgage Analysis Report - ${clientName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; padding: 40px; max-width: 900px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #1e3a5f; }
        .header h1 { color: #1e3a5f; font-size: 2rem; margin-bottom: 10px; }
        .header p { color: #666; }
        .client-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .client-info h3 { color: #1e3a5f; margin-bottom: 10px; }
        .client-row { display: flex; gap: 40px; }
        .client-row div { flex: 1; }
        .client-row label { font-size: 0.85rem; color: #666; display: block; }
        .client-row span { font-weight: 600; }
        .tool-section { margin-bottom: 35px; page-break-inside: avoid; }
        .tool-section h2 { color: #1e3a5f; font-size: 1.3rem; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; margin-bottom: 15px; }
        .result-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px; }
        .result-item { background: #f8fafc; padding: 15px; border-radius: 8px; }
        .result-item label { display: block; font-size: 0.85rem; color: #666; margin-bottom: 5px; }
        .result-item .value { font-size: 1.2rem; font-weight: 700; color: #1e3a5f; }
        .recommendation { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 0 8px 8px 0; }
        .recommendation h4 { color: #10b981; margin-bottom: 5px; }
        .recommendation p { font-size: 0.9rem; color: #666; }
        .notes-section { background: #f1f5f9; padding: 20px; border-radius: 8px; margin-top: 30px; }
        .notes-section h3 { color: #1e3a5f; margin-bottom: 10px; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 0.85rem; color: #666; }
        .footer .lo-info { margin-bottom: 15px; }
        .footer .lo-name { font-weight: 600; color: #1e3a5f; font-size: 1rem; }
        .disclaimer { font-size: 0.75rem; color: #999; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
        @media print {
            body { padding: 20px; }
            .tool-section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Mortgage Analysis Report</h1>
        <p>Prepared on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="client-info">
        <h3>Prepared For</h3>
        <div class="client-row">
            <div>
                <label>Client Name</label>
                <span>${clientName}</span>
            </div>
            ${propertyAddress ? `<div><label>Property Address</label><span>${propertyAddress}</span></div>` : ''}
        </div>
    </div>
`;

    // Add each selected tool's results
    selectedTools.forEach(tool => {
        reportHTML += generateToolSection(tool);
    });

    // Add notes if provided
    if (notes) {
        reportHTML += `
    <div class="notes-section">
        <h3>Additional Notes</h3>
        <p>${notes.replace(/\n/g, '<br>')}</p>
    </div>
`;
    }

    // Footer with LO info
    reportHTML += `
    <div class="footer">
        <div class="lo-info">
            ${loInfo.name ? `<div class="lo-name">${loInfo.name}</div>` : ''}
            ${loInfo.company ? `<div>${loInfo.company}</div>` : ''}
            ${loInfo.nmls ? `<div>NMLS# ${loInfo.nmls}</div>` : ''}
            ${loInfo.phone ? `<div>${loInfo.phone}</div>` : ''}
            ${loInfo.email ? `<div>${loInfo.email}</div>` : ''}
        </div>
        <div class="disclaimer">
            This report is for informational purposes only and does not constitute a loan commitment or guarantee of terms.
            Actual rates, payments, and terms may vary based on market conditions and individual qualifications.
            Please consult with a licensed mortgage professional for personalized advice.
        </div>
    </div>
</body>
</html>
`;

    // Open in new window for printing/saving
    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportHTML);
    printWindow.document.close();
}

function generateToolSection(tool) {
    let html = '';

    switch(tool) {
        case 'buy-keep':
            if (window.buyKeepResults) {
                const r = window.buyKeepResults;
                html = `
    <div class="tool-section">
        <h2>Buy vs Keep Current Home Analysis</h2>
        <div class="result-grid">
            <div class="result-item">
                <label>Keep - Monthly Cost</label>
                <div class="value">${formatCurrency(r.keep.monthlyPayment)}</div>
            </div>
            <div class="result-item">
                <label>Buy - Monthly Cost</label>
                <div class="value">${formatCurrency(r.buy.monthlyPayment)}</div>
            </div>
            <div class="result-item">
                <label>Keep - 5-Year Net Position</label>
                <div class="value">${formatCurrency(r.keep.netPosition5yr)}</div>
            </div>
            <div class="result-item">
                <label>Buy - 5-Year Net Position</label>
                <div class="value">${formatCurrency(r.buy.netPosition5yr)}</div>
            </div>
        </div>
        <div class="recommendation">
            <h4>${r.recommendation === 'keep' ? 'Keeping current home recommended' : 'Buying new home may be better'}</h4>
            <p>Based on 5-year projections including equity growth and costs.</p>
        </div>
    </div>
`;
            }
            break;

        case 'rent-simulator':
            if (window.rentSimResults) {
                const r = window.rentSimResults;
                html = `
    <div class="tool-section">
        <h2>Rent Increase Projection</h2>
        <div class="result-grid">
            <div class="result-item">
                <label>Current Monthly Rent</label>
                <div class="value">${formatCurrency(r.currentRent)}</div>
            </div>
            <div class="result-item">
                <label>Rent After ${r.years} Years</label>
                <div class="value">${formatCurrency(r.finalRent)}</div>
            </div>
            <div class="result-item">
                <label>Total Rent Paid (${r.years} years)</label>
                <div class="value">${formatCurrency(r.totalRentPaid)}</div>
            </div>
            <div class="result-item">
                <label>Year Rent Exceeds ${formatCurrency(r.mortgagePayment)} Mortgage</label>
                <div class="value">${r.crossoverYear ? `Year ${r.crossoverYear}` : 'Never'}</div>
            </div>
        </div>
        <div class="recommendation">
            <h4>At ${r.annualIncrease}% annual increase</h4>
            <p>Monthly rent grows from ${formatCurrency(r.currentRent)} to ${formatCurrency(r.finalRent)} over ${r.years} years.</p>
        </div>
    </div>
`;
            }
            break;

        case 'life-events':
            if (window.lifeEventsResults) {
                const r = window.lifeEventsResults;
                html = `
    <div class="tool-section">
        <h2>Life Events Timeline</h2>
        <p>Key milestones mapped against your mortgage:</p>
        <ul style="margin: 15px 0; padding-left: 20px;">
            ${r.events.map(e => `<li><strong>${e.year} (Age ${e.age}):</strong> ${e.title} - ${e.detail}</li>`).join('')}
        </ul>
        ${r.insights.length > 0 ? `
        <div class="recommendation">
            <h4>${r.insights[0].title}</h4>
            <p>${r.insights[0].message}</p>
        </div>
        ` : ''}
    </div>
`;
            }
            break;

        case 'stress-test':
            if (window.stressTestResults) {
                const r = window.stressTestResults;
                html = `
    <div class="tool-section">
        <h2>Mortgage Stress Test</h2>
        <div class="result-grid">
            <div class="result-item" style="grid-column: span 2;">
                <label>Overall Resilience Score</label>
                <div class="value">${r.score}/100 - ${r.rating}</div>
            </div>
        </div>
        <p style="margin: 15px 0;"><strong>Scenario Results:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">
            ${r.results.map(res => `<li><strong>${res.name}:</strong> ${res.status.toUpperCase()} - ${res.description}</li>`).join('')}
        </ul>
        <div class="recommendation">
            <h4>Recommendations</h4>
            <ul style="margin: 0; padding-left: 20px;">
                ${r.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
`;
            }
            break;

        default:
            html = `
    <div class="tool-section">
        <h2>${toolNames[tool] || tool}</h2>
        <p>Calculator results - please run calculation to generate data.</p>
    </div>
`;
    }

    return html;
}

function printToolsReport() {
    generateToolsReport();
}

// Initialize dark mode and user info from localStorage
document.addEventListener('DOMContentLoaded', () => {
    const darkMode = localStorage.getItem('loanComparisonDarkMode') === 'true';
    if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Update dark mode toggle checkbox to match current state
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.checked = darkMode;
    }

    // Load user info for header display
    const loInfo = JSON.parse(localStorage.getItem('loandrUserInfo') || '{}');
    const userName = document.getElementById('userName');
    const userCompany = document.getElementById('userCompany');
    if (userName && loInfo.name) userName.textContent = loInfo.name;
    if (userCompany && loInfo.company) userCompany.textContent = loInfo.company;

    // Setup export checkbox listeners
    document.querySelectorAll('.tool-export-check').forEach(checkbox => {
        checkbox.addEventListener('change', updateExportFab);
        // Prevent click from expanding card
        checkbox.addEventListener('click', (e) => e.stopPropagation());
    });
});

// ============================================
// SETTINGS PANEL
// ============================================
function openSettings() {
    const panel = document.getElementById('settingsPanel');
    const overlay = document.getElementById('settingsOverlay');
    if (panel) panel.classList.remove('hidden');
    if (overlay) overlay.classList.remove('hidden');
    document.body.classList.add('settings-open');

    // Update dark mode toggle to current state
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.checked = localStorage.getItem('loanComparisonDarkMode') === 'true';
    }

    // Load saved settings
    loadSavedSettings();
}

function closeSettings() {
    const panel = document.getElementById('settingsPanel');
    const overlay = document.getElementById('settingsOverlay');
    if (panel) panel.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('settings-open');
}

function loadSavedSettings() {
    // Load LO info (using same localStorage keys as main app)
    const loInfo = JSON.parse(localStorage.getItem('loandrUserInfo') || '{}');
    const loName = document.getElementById('loName');
    const loCompany = document.getElementById('loCompany');
    const loPhone = document.getElementById('loPhone');
    const loEmail = document.getElementById('loEmail');
    const loNMLS = document.getElementById('loNMLS');
    if (loName) loName.value = loInfo.name || '';
    if (loCompany) loCompany.value = loInfo.company || '';
    if (loPhone) loPhone.value = loInfo.phone || '';
    if (loEmail) loEmail.value = loInfo.email || '';
    if (loNMLS) loNMLS.value = loInfo.nmls || '';

    // Update header display
    const userName = document.getElementById('userName');
    const userCompany = document.getElementById('userCompany');
    if (userName && loInfo.name) userName.textContent = loInfo.name;
    if (userCompany && loInfo.company) userCompany.textContent = loInfo.company;

    // Load lender info
    const lenderInfo = JSON.parse(localStorage.getItem('loandrLenderInfo') || '{}');
    const lenderName = document.getElementById('lenderName');
    const lenderNMLS = document.getElementById('lenderNMLS');
    const lenderPhone = document.getElementById('lenderPhone');
    const lenderWebsite = document.getElementById('lenderWebsite');
    if (lenderName) lenderName.value = lenderInfo.name || '';
    if (lenderNMLS) lenderNMLS.value = lenderInfo.nmls || '';
    if (lenderPhone) lenderPhone.value = lenderInfo.phone || '';
    if (lenderWebsite) lenderWebsite.value = lenderInfo.website || '';
}

function saveLOInfo() {
    const loInfo = {
        name: document.getElementById('loName')?.value || '',
        company: document.getElementById('loCompany')?.value || '',
        phone: document.getElementById('loPhone')?.value || '',
        email: document.getElementById('loEmail')?.value || '',
        nmls: document.getElementById('loNMLS')?.value || ''
    };
    localStorage.setItem('loandrUserInfo', JSON.stringify(loInfo));

    // Update header display
    const userName = document.getElementById('userName');
    const userCompany = document.getElementById('userCompany');
    if (userName) userName.textContent = loInfo.name;
    if (userCompany) userCompany.textContent = loInfo.company;

    showSaveConfirmation('Loan Officer info saved!');
}

function saveLenderInfo() {
    const lenderInfo = {
        name: document.getElementById('lenderName')?.value || '',
        nmls: document.getElementById('lenderNMLS')?.value || '',
        phone: document.getElementById('lenderPhone')?.value || '',
        website: document.getElementById('lenderWebsite')?.value || ''
    };
    localStorage.setItem('loandrLenderInfo', JSON.stringify(lenderInfo));
    showSaveConfirmation('Lender info saved!');
}

function showSaveConfirmation(message) {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.className = 'save-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--navy-blue);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Event listeners for settings panel
document.addEventListener('DOMContentLoaded', () => {
    // Settings button click
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettings);
    }

    // Close settings button
    const closeSettingsBtn = document.getElementById('closeSettings');
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettings);
    }

    // Overlay click to close
    const settingsOverlay = document.getElementById('settingsOverlay');
    if (settingsOverlay) {
        settingsOverlay.addEventListener('click', closeSettings);
    }

    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            const isDark = darkModeToggle.checked;
            localStorage.setItem('loanComparisonDarkMode', isDark ? 'true' : 'false');
            if (isDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        });
    }

    // Save LO info button
    const saveLOBtn = document.getElementById('saveLOSettings');
    if (saveLOBtn) {
        saveLOBtn.addEventListener('click', saveLOInfo);
    }

    // Save lender info button
    const saveLenderBtn = document.getElementById('saveLenderSettings');
    if (saveLenderBtn) {
        saveLenderBtn.addEventListener('click', saveLenderInfo);
    }
});
