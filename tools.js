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

// Initialize dark mode from localStorage
document.addEventListener('DOMContentLoaded', () => {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Initialize tool selection checkboxes
    setupToolSelection();
});

// ============================================
// SELL VS KEEP & RENT CALCULATOR
// ============================================
function calculateSellVsRent() {
    // Get property details
    const homeValue = parseFloat(document.getElementById('sr-home-value').value) || 0;
    const mortgageBalance = parseFloat(document.getElementById('sr-mortgage-balance').value) || 0;
    const mortgageRate = parseFloat(document.getElementById('sr-mortgage-rate').value) || 0;
    const remainingTerm = parseInt(document.getElementById('sr-remaining-term').value) || 25;
    const currentPayment = parseFloat(document.getElementById('sr-current-payment').value) || 0;
    const purchasePrice = parseFloat(document.getElementById('sr-purchase-price').value) || 0;

    // Sell scenario inputs
    const sellingCostsPercent = parseFloat(document.getElementById('sr-selling-costs').value) || 8;
    const capGainsRate = parseFloat(document.getElementById('sr-cap-gains-rate').value) || 15;
    const isPrimaryResidence = document.getElementById('sr-primary-residence').value === 'yes';
    const filingStatus = document.getElementById('sr-filing-status').value;

    // Rent scenario inputs
    const monthlyRent = parseFloat(document.getElementById('sr-monthly-rent').value) || 0;
    const propertyTax = parseFloat(document.getElementById('sr-property-tax').value) || 0;
    const insurance = parseFloat(document.getElementById('sr-insurance').value) || 0;
    const hoa = parseFloat(document.getElementById('sr-hoa').value) || 0;
    const maintenancePercent = parseFloat(document.getElementById('sr-maintenance').value) || 1;
    const mgmtFeePercent = parseFloat(document.getElementById('sr-mgmt-fee').value) || 0;
    const vacancyPercent = parseFloat(document.getElementById('sr-vacancy').value) || 5;
    const rentIncreasePercent = parseFloat(document.getElementById('sr-rent-increase').value) || 3;

    // Investment assumptions
    const appreciationPercent = parseFloat(document.getElementById('sr-appreciation').value) || 3;
    const altReturnPercent = parseFloat(document.getElementById('sr-alt-return').value) || 7;
    const taxBracket = parseFloat(document.getElementById('sr-tax-bracket').value) || 24;
    const analysisPeriod = parseInt(document.getElementById('sr-analysis-period').value) || 10;

    // ========== SELL SCENARIO CALCULATIONS ==========
    const sellingCosts = homeValue * (sellingCostsPercent / 100);
    const grossProceeds = homeValue - sellingCosts - mortgageBalance;

    // Capital gains calculation
    const totalGain = homeValue - purchasePrice;
    const exclusionAmount = isPrimaryResidence ? (filingStatus === 'married' ? 500000 : 250000) : 0;
    const taxableGain = Math.max(0, totalGain - exclusionAmount);
    const capGainsTax = taxableGain * (capGainsRate / 100);

    const netSellProceeds = grossProceeds - capGainsTax;

    // Future value if invested
    const investedFutureValue = netSellProceeds * Math.pow(1 + altReturnPercent / 100, analysisPeriod);

    // ========== RENT SCENARIO CALCULATIONS ==========
    // Monthly expenses
    const monthlyPropertyTax = propertyTax / 12;
    const monthlyInsurance = insurance / 12;
    const monthlyMaintenance = (homeValue * (maintenancePercent / 100)) / 12;
    const monthlyMgmtFee = monthlyRent * (mgmtFeePercent / 100);

    // Monthly cash flow (Year 1)
    const effectiveRent = monthlyRent * (1 - vacancyPercent / 100);
    const totalMonthlyExpenses = currentPayment + monthlyPropertyTax + monthlyInsurance + monthlyMaintenance + monthlyMgmtFee + hoa;
    const monthlyCashFlow = effectiveRent - totalMonthlyExpenses;

    // Calculate total cash flow over analysis period with rent increases
    let totalCashFlow = 0;
    let yearlyRent = monthlyRent * 12;
    let yearlyExpenses = totalMonthlyExpenses * 12;

    for (let year = 1; year <= analysisPeriod; year++) {
        const effectiveYearlyRent = yearlyRent * (1 - vacancyPercent / 100);
        totalCashFlow += effectiveYearlyRent - yearlyExpenses;
        yearlyRent *= (1 + rentIncreasePercent / 100);
        // Expenses increase at half the rate of rent (approximation)
        yearlyExpenses *= 1.015;
    }

    // Future home value
    const futureHomeValue = homeValue * Math.pow(1 + appreciationPercent / 100, analysisPeriod);

    // Future mortgage balance (simplified amortization)
    const monthlyRate = mortgageRate / 100 / 12;
    let balance = mortgageBalance;
    const totalMonths = Math.min(analysisPeriod * 12, remainingTerm * 12);

    for (let month = 0; month < totalMonths; month++) {
        const interestPayment = balance * monthlyRate;
        const principalPayment = currentPayment - interestPayment;
        balance = Math.max(0, balance - principalPayment);
    }
    const futureMortgageBalance = balance;

    // Future equity
    const futureEquity = futureHomeValue - futureMortgageBalance;

    // Total rent scenario wealth
    const rentTotalWealth = futureEquity + totalCashFlow;

    // ========== RENTAL PROPERTY METRICS ==========
    const annualGrossRent = monthlyRent * 12;
    const annualNetOperatingIncome = (annualGrossRent * (1 - vacancyPercent / 100)) -
        propertyTax - insurance - (homeValue * maintenancePercent / 100) - (annualGrossRent * mgmtFeePercent / 100) - (hoa * 12);

    const capRate = (annualNetOperatingIncome / homeValue) * 100;
    const currentEquity = homeValue - mortgageBalance;
    const annualCashFlow = monthlyCashFlow * 12;
    const cashOnCash = currentEquity > 0 ? (annualCashFlow / currentEquity) * 100 : 0;
    const grossRentYield = (annualGrossRent / homeValue) * 100;

    // Total ROI including appreciation
    const totalAnnualReturn = annualCashFlow + (homeValue * appreciationPercent / 100);
    const totalROI = currentEquity > 0 ? (totalAnnualReturn / currentEquity) * 100 : 0;

    // ========== UPDATE DISPLAY ==========
    // Sell scenario
    document.getElementById('sr-sell-proceeds').textContent = formatCurrency(netSellProceeds);
    document.getElementById('sr-sale-price').textContent = formatCurrency(homeValue);
    document.getElementById('sr-selling-costs-amt').textContent = '-' + formatCurrency(sellingCosts);
    document.getElementById('sr-mortgage-payoff').textContent = '-' + formatCurrency(mortgageBalance);
    document.getElementById('sr-cap-gains-tax').textContent = capGainsTax > 0 ? '-' + formatCurrency(capGainsTax) : '$0';
    document.getElementById('sr-alt-return-display').textContent = altReturnPercent + '%';
    document.getElementById('sr-invested-value').textContent = formatCurrency(investedFutureValue);
    document.getElementById('sr-period-sell').textContent = analysisPeriod;

    // Rent scenario
    document.getElementById('sr-rent-wealth').textContent = formatCurrency(rentTotalWealth);
    document.getElementById('sr-period-rent').textContent = analysisPeriod;
    document.getElementById('sr-future-home-value').textContent = formatCurrency(futureHomeValue);
    document.getElementById('sr-future-mortgage').textContent = '-' + formatCurrency(futureMortgageBalance);
    document.getElementById('sr-future-equity').textContent = formatCurrency(futureEquity);
    document.getElementById('sr-total-cashflow').textContent = totalCashFlow >= 0 ? formatCurrency(totalCashFlow) : '-' + formatCurrency(Math.abs(totalCashFlow));

    // Monthly cash flow breakdown
    document.getElementById('sr-cf-rent').textContent = formatCurrency(effectiveRent);
    document.getElementById('sr-cf-mortgage').textContent = '-' + formatCurrency(currentPayment);
    document.getElementById('sr-cf-tax-ins').textContent = '-' + formatCurrency(monthlyPropertyTax + monthlyInsurance);
    document.getElementById('sr-cf-other').textContent = '-' + formatCurrency(monthlyMaintenance + monthlyMgmtFee + hoa);
    document.getElementById('sr-cf-net').textContent = monthlyCashFlow >= 0 ? formatCurrency(monthlyCashFlow) : '-' + formatCurrency(Math.abs(monthlyCashFlow));

    // Rental metrics
    document.getElementById('sr-cap-rate').textContent = formatPercent(capRate);
    document.getElementById('sr-cash-on-cash').textContent = formatPercent(cashOnCash);
    document.getElementById('sr-rent-yield').textContent = formatPercent(grossRentYield);
    document.getElementById('sr-total-roi').textContent = formatPercent(totalROI);

    // Recommendation
    const recommendationDiv = document.getElementById('sr-recommendation');
    const difference = investedFutureValue - rentTotalWealth;
    const percentDiff = Math.abs(difference / Math.max(investedFutureValue, rentTotalWealth) * 100);

    if (investedFutureValue > rentTotalWealth) {
        recommendationDiv.className = 'sr-recommendation sell-better';
        recommendationDiv.innerHTML = `
            <h4>Recommendation: Consider Selling</h4>
            <p>Based on your inputs, selling and investing the proceeds could yield approximately
            <strong>${formatCurrency(Math.abs(difference))}</strong> more (${percentDiff.toFixed(1)}%)
            over ${analysisPeriod} years compared to keeping as a rental.</p>
        `;
    } else {
        recommendationDiv.className = 'sr-recommendation rent-better';
        recommendationDiv.innerHTML = `
            <h4>Recommendation: Consider Keeping as Rental</h4>
            <p>Based on your inputs, keeping the property as a rental could yield approximately
            <strong>${formatCurrency(Math.abs(difference))}</strong> more (${percentDiff.toFixed(1)}%)
            over ${analysisPeriod} years compared to selling and investing.</p>
        `;
    }

    // Show results
    document.getElementById('sell-rent-results').style.display = 'block';

    // Update chart
    updateSellRentChart(analysisPeriod, netSellProceeds, altReturnPercent, homeValue, appreciationPercent, futureMortgageBalance, totalCashFlow);
}

function updateSellRentChart(years, sellProceeds, investReturn, homeValue, appreciation, finalMortgage, totalCashFlow) {
    const ctx = document.getElementById('sellRentChart');
    if (!ctx) return;

    if (charts.sellRent) {
        charts.sellRent.destroy();
    }

    const labels = [];
    const sellData = [];
    const rentEquityData = [];
    const rentCashFlowData = [];

    for (let year = 0; year <= years; year++) {
        labels.push(`Year ${year}`);

        // Sell scenario - invested proceeds growing
        sellData.push(sellProceeds * Math.pow(1 + investReturn / 100, year));

        // Rent scenario - home equity (simplified)
        const futureValue = homeValue * Math.pow(1 + appreciation / 100, year);
        const mortgageProgress = year / years;
        const currentMortgage = homeValue - ((homeValue - finalMortgage) * mortgageProgress);
        rentEquityData.push(futureValue - currentMortgage);

        // Cumulative cash flow
        rentCashFlowData.push((totalCashFlow / years) * year);
    }

    charts.sellRent = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Sell & Invest',
                    data: sellData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Keep & Rent (Equity)',
                    data: rentEquityData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: {
                    display: true,
                    text: 'Wealth Comparison Over Time'
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

// ============================================
// TOOL SELECTION & DOCUMENT GENERATION
// ============================================
function setupToolSelection() {
    const checkboxes = document.querySelectorAll('.tool-checkbox');
    const selectedCountEl = document.getElementById('selectedCount');
    const generateBtn = document.getElementById('generateDocBtn');
    const clearBtn = document.getElementById('clearSelectionsBtn');

    if (!checkboxes.length) return;

    // Handle checkbox changes
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation(); // Prevent card expansion
            const card = checkbox.closest('.tool-card');
            card.classList.toggle('selected', checkbox.checked);
            updateSelectionCount();
        });

        // Prevent click from bubbling to header
        checkbox.closest('.tool-select-checkbox').addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    // Clear all selections
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            checkboxes.forEach(cb => {
                cb.checked = false;
                cb.closest('.tool-card').classList.remove('selected');
            });
            updateSelectionCount();
        });
    }

    // Generate document
    if (generateBtn) {
        generateBtn.addEventListener('click', generateClientReport);
    }

    function updateSelectionCount() {
        const selectedCount = document.querySelectorAll('.tool-checkbox:checked').length;
        if (selectedCountEl) {
            selectedCountEl.textContent = selectedCount;
        }
        if (generateBtn) {
            generateBtn.disabled = selectedCount === 0;
        }
    }
}

function generateClientReport() {
    const selectedTools = document.querySelectorAll('.tool-checkbox:checked');
    if (selectedTools.length === 0) {
        alert('Please select at least one calculator to include in the report.');
        return;
    }

    // Collect data from selected tools
    const reportData = [];

    selectedTools.forEach(checkbox => {
        const toolId = checkbox.dataset.tool;
        const card = checkbox.closest('.tool-card');
        const title = card.querySelector('.tool-title h3').textContent;
        const resultsDiv = card.querySelector('.tool-results');

        // Check if results are visible (calculator was run)
        if (resultsDiv && resultsDiv.style.display !== 'none') {
            reportData.push({
                id: toolId,
                title: title,
                results: extractToolResults(toolId, card)
            });
        } else {
            reportData.push({
                id: toolId,
                title: title,
                results: null,
                message: 'Calculator not yet run'
            });
        }
    });

    // Generate HTML report
    generateHTMLReport(reportData);
}

function extractToolResults(toolId, card) {
    const results = {};

    switch (toolId) {
        case 'dti':
            results.frontEndDTI = document.getElementById('dti-front-value')?.textContent;
            results.backEndDTI = document.getElementById('dti-back-value')?.textContent;
            break;
        case 'rent-buy':
            results.buyingCost = document.getElementById('rb-buying-total')?.textContent;
            results.rentingCost = document.getElementById('rb-renting-total')?.textContent;
            results.savings = document.getElementById('rb-savings')?.textContent;
            break;
        case 'amortization':
            results.monthlyPayment = document.getElementById('amort-monthly-payment')?.textContent;
            results.totalInterest = document.getElementById('amort-total-interest')?.textContent;
            results.totalCost = document.getElementById('amort-total-cost')?.textContent;
            break;
        case 'arm-fixed':
            results.fixedPayment = document.getElementById('arm-fixed-payment')?.textContent;
            results.armInitialPayment = document.getElementById('arm-initial-payment')?.textContent;
            break;
        case 'pmi':
            results.currentLTV = document.getElementById('pmi-current-ltv')?.textContent;
            results.timeToRemove = document.getElementById('pmi-time-to-remove')?.textContent;
            break;
        case 'points':
            results.breakeven = document.getElementById('points-breakeven')?.textContent;
            results.pointsCost = document.getElementById('points-cost')?.textContent;
            results.monthlySavings = document.getElementById('points-monthly-savings')?.textContent;
            break;
        case 'refi-breakeven':
            results.breakeven = document.getElementById('refi-breakeven-months')?.textContent;
            results.monthlySavings = document.getElementById('refi-monthly-savings')?.textContent;
            results.lifetimeSavings = document.getElementById('refi-lifetime-savings')?.textContent;
            break;
        case 'buydown':
            results.buydownCost = document.getElementById('buydown-total-cost')?.textContent;
            break;
        case 'sell-rent':
            results.sellProceeds = document.getElementById('sr-sell-proceeds')?.textContent;
            results.rentWealth = document.getElementById('sr-rent-wealth')?.textContent;
            results.capRate = document.getElementById('sr-cap-rate')?.textContent;
            results.cashOnCash = document.getElementById('sr-cash-on-cash')?.textContent;
            break;
        default:
            // Generic extraction
            const allValues = card.querySelectorAll('.tool-results [id]');
            allValues.forEach(el => {
                if (el.textContent) {
                    results[el.id] = el.textContent;
                }
            });
    }

    return results;
}

function generateHTMLReport(reportData) {
    // Get loan officer info from settings if available
    const loName = localStorage.getItem('loName') || 'Loan Officer';
    const loCompany = localStorage.getItem('loCompany') || '';
    const loPhone = localStorage.getItem('loPhone') || '';
    const loEmail = localStorage.getItem('loEmail') || '';
    const loNMLS = localStorage.getItem('loNMLS') || '';

    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let reportHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mortgage Analysis Report - ${currentDate}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 3px solid #1e3a5f; }
        .header h1 { color: #1e3a5f; font-size: 2rem; margin-bottom: 10px; }
        .header .subtitle { color: #666; font-size: 1.1rem; }
        .header .date { color: #888; font-size: 0.9rem; margin-top: 10px; }
        .lo-info { background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
        .lo-info h3 { color: #1e3a5f; margin-bottom: 10px; }
        .lo-info p { margin: 5px 0; font-size: 0.95rem; }
        .tool-section { margin-bottom: 35px; page-break-inside: avoid; }
        .tool-section h2 { color: #1e3a5f; font-size: 1.3rem; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; margin-bottom: 15px; }
        .results-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .result-item { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .result-item .label { font-size: 0.85rem; color: #666; margin-bottom: 5px; }
        .result-item .value { font-size: 1.2rem; font-weight: 600; color: #1e3a5f; }
        .not-calculated { background: #fff3cd; padding: 15px; border-radius: 8px; color: #856404; font-style: italic; }
        .footer { margin-top: 50px; padding-top: 30px; border-top: 2px solid #e5e7eb; text-align: center; color: #888; font-size: 0.85rem; }
        .disclaimer { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 0.8rem; color: #666; }
        @media print { body { padding: 20px; } .tool-section { page-break-inside: avoid; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>Mortgage Analysis Report</h1>
        <p class="subtitle">Customized Scenario Analysis</p>
        <p class="date">Prepared on ${currentDate}</p>
    </div>

    ${loName || loCompany ? `
    <div class="lo-info">
        <h3>Prepared By</h3>
        ${loName ? `<p><strong>${loName}</strong></p>` : ''}
        ${loCompany ? `<p>${loCompany}</p>` : ''}
        ${loPhone ? `<p>Phone: ${loPhone}</p>` : ''}
        ${loEmail ? `<p>Email: ${loEmail}</p>` : ''}
        ${loNMLS ? `<p>NMLS# ${loNMLS}</p>` : ''}
    </div>
    ` : ''}
`;

    reportData.forEach(tool => {
        reportHTML += `
    <div class="tool-section">
        <h2>${tool.title}</h2>
`;
        if (tool.results) {
            reportHTML += '<div class="results-grid">';
            for (const [key, value] of Object.entries(tool.results)) {
                if (value) {
                    const label = formatResultLabel(key);
                    reportHTML += `
            <div class="result-item">
                <div class="label">${label}</div>
                <div class="value">${value}</div>
            </div>`;
                }
            }
            reportHTML += '</div>';
        } else {
            reportHTML += `<p class="not-calculated">This calculator has not been run yet. Please calculate results before generating the report.</p>`;
        }
        reportHTML += '</div>';
    });

    reportHTML += `
    <div class="footer">
        <p>Generated by LoanDr. Mortgage Tools</p>
        <div class="disclaimer">
            <strong>Disclaimer:</strong> This report is for informational purposes only and does not constitute financial advice.
            All calculations are estimates based on the inputs provided. Actual rates, payments, and terms may vary.
            Please consult with a licensed mortgage professional for personalized advice tailored to your specific situation.
        </div>
    </div>
</body>
</html>`;

    // Open report in new window
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(reportHTML);
    reportWindow.document.close();
}

function formatResultLabel(key) {
    // Convert camelCase or kebab-case to readable label
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/-/g, ' ')
        .replace(/^./, str => str.toUpperCase())
        .replace(/dti/gi, 'DTI')
        .replace(/ltv/gi, 'LTV')
        .replace(/pmi/gi, 'PMI')
        .replace(/arm/gi, 'ARM')
        .trim();
}
