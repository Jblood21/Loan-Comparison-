// HECM Reverse Mortgage Calculator
const HECMCalculator = {
    // Program descriptions
    programDescriptions: {
        'hecm-standard': {
            name: 'HECM Standard',
            description: 'The traditional FHA-insured reverse mortgage. Available to homeowners 62+. Includes upfront MIP (2%) and annual MIP (0.5%). Maximum claim amount of $1,209,750 (2025).',
            mipRate: 2.0,
            annualMipRate: 0.5
        },
        'hecm-purchase': {
            name: 'HECM for Purchase',
            description: 'Use a reverse mortgage to purchase a new primary residence. Combine proceeds with down payment to buy a home without monthly mortgage payments. Great for downsizing or relocating.',
            mipRate: 2.0,
            annualMipRate: 0.5
        },
        'hecm-refi': {
            name: 'HECM-to-HECM Refinance',
            description: 'Refinance an existing HECM to access more equity, get a better rate, or add a spouse to the loan. Must provide "significant benefit" to the borrower per HUD guidelines.',
            mipRate: 2.0,
            annualMipRate: 0.5
        },
        'proprietary': {
            name: 'Proprietary/Jumbo Reverse',
            description: 'Non-FHA reverse mortgages for high-value homes exceeding FHA limits. No government insurance, but can access more equity. Terms vary by lender. Not subject to FHA lending limits.',
            mipRate: 0,
            annualMipRate: 0,
            noFhaLimit: true
        }
    },

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    // Get form data for a scenario
    getFormData(scenarioId) {
        const panel = document.querySelector(`.loan-panel[data-panel="${scenarioId}"]`);
        if (!panel) return null;

        const hecmType = panel.querySelector('.hecm-type-tab.active')?.dataset.type || 'fixed';
        const paymentType = panel.querySelector(`input[name="payment-type-${scenarioId}"]:checked`)?.value || 'lump-sum';
        const loanProgram = panel.querySelector('.hecm-program-tabs .program-tab.active')?.dataset.program || 'hecm-standard';

        return {
            scenarioName: panel.querySelector('.scenario-name')?.value || `Scenario ${scenarioId}`,
            hecmType: hecmType,
            loanProgram: loanProgram,
            borrowerAge: parseFloat(panel.querySelector('.borrower-age')?.value) || 70,
            spouseAge: parseFloat(panel.querySelector('.spouse-age')?.value) || 0,
            homeValue: parseFloat(panel.querySelector('.home-value')?.value) || 0,
            propertyType: panel.querySelector('.property-type')?.value || 'single-family',
            existingMortgage: parseFloat(panel.querySelector('.existing-mortgage')?.value) || 0,
            interestRate: parseFloat(panel.querySelector('.interest-rate')?.value) || 6.5,
            initialRate: parseFloat(panel.querySelector('.initial-rate')?.value) || 5.5,
            margin: parseFloat(panel.querySelector('.margin')?.value) || 2.0,
            lenderCredit: parseFloat(panel.querySelector('.lender-credit')?.value) || 0,
            fhaLimit: parseFloat(panel.querySelector('.fha-limit')?.value) || 1209750,
            plf: parseFloat(panel.querySelector('.plf')?.value) || 52.4,
            paymentType: paymentType,
            termMonths: parseFloat(panel.querySelector('.term-months')?.value) || 120,
            thirdPartyCosts: parseFloat(panel.querySelector('.third-party-costs')?.value) || 3500,
            // Set-asides
            lesaAmount: parseFloat(panel.querySelector('.lesa-amount')?.value) || 0,
            serviceFeeSetaside: parseFloat(panel.querySelector('.service-fee-setaside')?.value) || 0,
            repairsSetaside: parseFloat(panel.querySelector('.repairs-setaside')?.value) || 0,
            counselingFee: parseFloat(panel.querySelector('.counseling-fee')?.value) || 125,
            // Annual property charges
            annualTaxes: parseFloat(panel.querySelector('.annual-taxes')?.value) || 0,
            annualInsurance: parseFloat(panel.querySelector('.annual-insurance')?.value) || 0,
            annualHoa: parseFloat(panel.querySelector('.annual-hoa')?.value) || 0,
            annualFlood: parseFloat(panel.querySelector('.annual-flood')?.value) || 0,
            // Desired draw amounts
            desiredCashDraw: parseFloat(panel.querySelector('.desired-cash-draw')?.value) || 0,
            desiredLocAmount: parseFloat(panel.querySelector('.desired-loc-amount')?.value) || 0,
            useMaxAvailable: panel.querySelector('.use-max-available')?.checked ?? true
        };
    },

    // Calculate origination fee (FHA rules)
    calculateOriginationFee(homeValue, fhaLimit) {
        const maxClaimAmount = Math.min(homeValue, fhaLimit);

        // $2,500 minimum or 2% of first $200,000 + 1% of remainder, max $6,000
        let fee = 0;
        if (maxClaimAmount <= 200000) {
            fee = Math.max(2500, maxClaimAmount * 0.02);
        } else {
            fee = 4000 + (maxClaimAmount - 200000) * 0.01;
        }

        return Math.min(fee, 6000);
    },

    // Calculate Initial MIP (2% of max claim amount)
    calculateInitialMIP(homeValue, fhaLimit) {
        const maxClaimAmount = Math.min(homeValue, fhaLimit);
        return maxClaimAmount * 0.02;
    },

    // Calculate line of credit growth
    calculateLOCGrowth(initialAmount, rate, years) {
        // LOC grows at interest rate + 0.5% MIP
        const growthRate = (rate + 0.5) / 100;
        return initialAmount * Math.pow(1 + growthRate, years);
    },

    // Calculate line of credit growth with custom MIP rate
    calculateLOCGrowthWithMip(initialAmount, rate, annualMipRate, years) {
        // LOC grows at interest rate + annual MIP rate
        const growthRate = (rate + annualMipRate) / 100;
        return initialAmount * Math.pow(1 + growthRate, years);
    },

    // Calculate loan balance projection
    calculateBalanceProjection(initialBalance, rate, years) {
        // Balance grows at interest rate + 0.5% annual MIP
        const growthRate = (rate + 0.5) / 100;
        return initialBalance * Math.pow(1 + growthRate, years);
    },

    // Calculate loan balance projection with custom MIP rate
    calculateBalanceProjectionWithMip(initialBalance, rate, annualMipRate, years) {
        // Balance grows at interest rate + annual MIP rate
        const growthRate = (rate + annualMipRate) / 100;
        return initialBalance * Math.pow(1 + growthRate, years);
    },

    // Calculate tenure payment (lifetime)
    calculateTenurePayment(netPrincipalLimit, expectedRate) {
        // Simplified tenure calculation based on expected rate
        // Uses actuarial assumptions - this is a simplified version
        const monthlyRate = expectedRate / 100 / 12;
        const assumedMonths = 240; // ~20 years average

        if (monthlyRate === 0) return netPrincipalLimit / assumedMonths;

        const factor = (monthlyRate * Math.pow(1 + monthlyRate, assumedMonths)) /
                       (Math.pow(1 + monthlyRate, assumedMonths) - 1);

        return netPrincipalLimit * factor * 0.5; // Conservative factor
    },

    // Calculate term payment
    calculateTermPayment(netPrincipalLimit, expectedRate, termMonths) {
        const monthlyRate = expectedRate / 100 / 12;

        if (monthlyRate === 0) return netPrincipalLimit / termMonths;

        const factor = (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                       (Math.pow(1 + monthlyRate, termMonths) - 1);

        return netPrincipalLimit * factor;
    },

    // Main calculation function
    calculate(scenarioId) {
        const data = this.getFormData(scenarioId);
        if (!data) return;

        // Validate age (not required for proprietary)
        if (data.loanProgram !== 'proprietary' && data.borrowerAge < 62) {
            alert('Borrower must be at least 62 years old for a HECM.');
            return;
        }

        // Get program-specific settings
        const programInfo = this.programDescriptions[data.loanProgram] || this.programDescriptions['hecm-standard'];
        const isProprietary = data.loanProgram === 'proprietary';

        // Calculate Max Claim Amount (no limit for proprietary)
        const maxClaimAmount = isProprietary ? data.homeValue : Math.min(data.homeValue, data.fhaLimit);

        // Calculate Principal Limit
        const principalLimit = maxClaimAmount * (data.plf / 100);

        // Calculate costs (proprietary has no MIP)
        const initialMIP = isProprietary ? 0 : this.calculateInitialMIP(data.homeValue, data.fhaLimit);
        const originationFee = this.calculateOriginationFee(data.homeValue, isProprietary ? data.homeValue : data.fhaLimit) - data.lenderCredit;

        // Calculate set-asides total
        const totalSetAsides = data.lesaAmount + data.serviceFeeSetaside + data.repairsSetaside;

        // Total closing costs including counseling fee
        const totalClosingCosts = initialMIP + Math.max(0, originationFee) + data.thirdPartyCosts + data.counselingFee;

        // Calculate annual property charges
        const totalAnnualCharges = data.annualTaxes + data.annualInsurance + data.annualHoa + data.annualFlood;

        // Calculate Net Principal Limit (deduct set-asides)
        const netPrincipalLimit = principalLimit - totalClosingCosts - data.existingMortgage - totalSetAsides;

        // Calculate based on payment type
        let cashToBorrower = 0;
        let locAmount = 0;
        let monthlyPayment = 0;

        const effectiveRate = data.hecmType === 'adjustable' ? data.initialRate : data.interestRate;

        // Check if using custom draw amounts
        if (!data.useMaxAvailable && (data.desiredCashDraw > 0 || data.desiredLocAmount > 0)) {
            // Custom draw amounts - validate they don't exceed net principal limit
            const totalRequested = data.desiredCashDraw + data.desiredLocAmount;

            if (totalRequested > netPrincipalLimit) {
                // Cap at available amount
                const ratio = netPrincipalLimit / totalRequested;
                cashToBorrower = Math.round(data.desiredCashDraw * ratio);
                locAmount = Math.round(data.desiredLocAmount * ratio);
            } else {
                cashToBorrower = data.desiredCashDraw;
                locAmount = data.desiredLocAmount;
            }

            // Calculate monthly payment if there's remaining principal for tenure/term
            const remainingForPayments = netPrincipalLimit - cashToBorrower - locAmount;
            if (remainingForPayments > 0 && ['tenure', 'term', 'modified-tenure', 'modified-term'].includes(data.paymentType)) {
                if (data.paymentType.includes('tenure')) {
                    monthlyPayment = this.calculateTenurePayment(remainingForPayments, data.interestRate);
                } else {
                    monthlyPayment = this.calculateTermPayment(remainingForPayments, data.interestRate, data.termMonths);
                }
            }
        } else {
            // Use maximum available - standard calculation
            switch (data.paymentType) {
                case 'lump-sum':
                    cashToBorrower = netPrincipalLimit;
                    break;
                case 'line-of-credit':
                    locAmount = netPrincipalLimit;
                    break;
                case 'tenure':
                    monthlyPayment = this.calculateTenurePayment(netPrincipalLimit, data.interestRate);
                    break;
                case 'term':
                    monthlyPayment = this.calculateTermPayment(netPrincipalLimit, data.interestRate, data.termMonths);
                    break;
                case 'modified-tenure':
                    locAmount = netPrincipalLimit * 0.5;
                    monthlyPayment = this.calculateTenurePayment(netPrincipalLimit * 0.5, data.interestRate);
                    break;
                case 'modified-term':
                    locAmount = netPrincipalLimit * 0.5;
                    monthlyPayment = this.calculateTermPayment(netPrincipalLimit * 0.5, data.interestRate, data.termMonths);
                    break;
            }
        }

        // Update form readonly fields
        const panel = document.querySelector(`.loan-panel[data-panel="${scenarioId}"]`);
        panel.querySelector('.initial-mip').value = Math.round(initialMIP);
        panel.querySelector('.origination-fee').value = Math.round(Math.max(0, originationFee));
        panel.querySelector('.total-closing-costs').value = Math.round(totalClosingCosts);
        panel.querySelector('.total-annual-charges').value = Math.round(totalAnnualCharges);

        // Update counseling fee display and cash at closing display in closing costs section
        const counselingFeeDisplay = panel.querySelector('.counseling-fee-display');
        if (counselingFeeDisplay) counselingFeeDisplay.value = Math.round(data.counselingFee);

        const cashAtClosingDisplay = panel.querySelector('.cash-at-closing-display');
        if (cashAtClosingDisplay) cashAtClosingDisplay.value = Math.round(Math.max(0, cashToBorrower));

        // Display results
        document.getElementById(`max-claim-${scenarioId}`).textContent = this.formatCurrency(maxClaimAmount);
        document.getElementById(`principal-limit-${scenarioId}`).textContent = this.formatCurrency(principalLimit);
        document.getElementById(`net-principal-${scenarioId}`).textContent = this.formatCurrency(Math.max(0, netPrincipalLimit));
        document.getElementById(`cash-to-borrower-${scenarioId}`).textContent = this.formatCurrency(Math.max(0, cashToBorrower));
        document.getElementById(`loc-amount-${scenarioId}`).textContent = this.formatCurrency(Math.max(0, locAmount));
        document.getElementById(`monthly-payment-${scenarioId}`).textContent = this.formatCurrency(monthlyPayment);

        // Annual MIP rate (0 for proprietary)
        const annualMipRate = isProprietary ? 0 : programInfo.annualMipRate;

        // LOC Growth projections
        if (locAmount > 0) {
            document.getElementById(`loc-year5-${scenarioId}`).textContent = this.formatCurrency(this.calculateLOCGrowthWithMip(locAmount, effectiveRate, annualMipRate, 5));
            document.getElementById(`loc-year10-${scenarioId}`).textContent = this.formatCurrency(this.calculateLOCGrowthWithMip(locAmount, effectiveRate, annualMipRate, 10));
            document.getElementById(`loc-year15-${scenarioId}`).textContent = this.formatCurrency(this.calculateLOCGrowthWithMip(locAmount, effectiveRate, annualMipRate, 15));
            document.getElementById(`loc-year20-${scenarioId}`).textContent = this.formatCurrency(this.calculateLOCGrowthWithMip(locAmount, effectiveRate, annualMipRate, 20));
        }

        // Balance projections (starting from total closing costs + existing mortgage payoff)
        const initialBalance = totalClosingCosts + data.existingMortgage;
        document.getElementById(`balance-year5-${scenarioId}`).textContent = this.formatCurrency(this.calculateBalanceProjectionWithMip(initialBalance, effectiveRate, annualMipRate, 5));
        document.getElementById(`balance-year10-${scenarioId}`).textContent = this.formatCurrency(this.calculateBalanceProjectionWithMip(initialBalance, effectiveRate, annualMipRate, 10));
        document.getElementById(`balance-year15-${scenarioId}`).textContent = this.formatCurrency(this.calculateBalanceProjectionWithMip(initialBalance, effectiveRate, annualMipRate, 15));
        document.getElementById(`balance-year20-${scenarioId}`).textContent = this.formatCurrency(this.calculateBalanceProjectionWithMip(initialBalance, effectiveRate, annualMipRate, 20));

        // Equity projections (home appreciation at 3% minus loan balance)
        const homeAppreciation = 0.03;
        const balance5 = this.calculateBalanceProjectionWithMip(initialBalance, effectiveRate, annualMipRate, 5);
        const balance10 = this.calculateBalanceProjectionWithMip(initialBalance, effectiveRate, annualMipRate, 10);
        const balance15 = this.calculateBalanceProjectionWithMip(initialBalance, effectiveRate, annualMipRate, 15);
        const balance20 = this.calculateBalanceProjectionWithMip(initialBalance, effectiveRate, annualMipRate, 20);

        const homeValue5 = data.homeValue * Math.pow(1 + homeAppreciation, 5);
        const homeValue10 = data.homeValue * Math.pow(1 + homeAppreciation, 10);
        const homeValue15 = data.homeValue * Math.pow(1 + homeAppreciation, 15);
        const homeValue20 = data.homeValue * Math.pow(1 + homeAppreciation, 20);

        document.getElementById(`equity-year5-${scenarioId}`).textContent = this.formatCurrency(Math.max(0, homeValue5 - balance5));
        document.getElementById(`equity-year10-${scenarioId}`).textContent = this.formatCurrency(Math.max(0, homeValue10 - balance10));
        document.getElementById(`equity-year15-${scenarioId}`).textContent = this.formatCurrency(Math.max(0, homeValue15 - balance15));
        document.getElementById(`equity-year20-${scenarioId}`).textContent = this.formatCurrency(Math.max(0, homeValue20 - balance20));

        // Interest & MIP cost projections
        const interest5 = balance5 - initialBalance;
        const interest10 = balance10 - initialBalance;
        const interest15 = balance15 - initialBalance;
        const interest20 = balance20 - initialBalance;

        document.getElementById(`interest-year5-${scenarioId}`).textContent = this.formatCurrency(interest5);
        document.getElementById(`interest-year10-${scenarioId}`).textContent = this.formatCurrency(interest10);
        document.getElementById(`interest-year15-${scenarioId}`).textContent = this.formatCurrency(interest15);
        document.getElementById(`interest-year20-${scenarioId}`).textContent = this.formatCurrency(interest20);

        // Cost breakdown
        document.getElementById(`cost-mip-${scenarioId}`).textContent = this.formatCurrency(initialMIP);
        document.getElementById(`cost-origination-${scenarioId}`).textContent = this.formatCurrency(Math.max(0, originationFee));
        document.getElementById(`cost-third-party-${scenarioId}`).textContent = this.formatCurrency(data.thirdPartyCosts);
        document.getElementById(`cost-counseling-${scenarioId}`).textContent = this.formatCurrency(data.counselingFee);
        document.getElementById(`cost-payoff-${scenarioId}`).textContent = this.formatCurrency(data.existingMortgage);
        document.getElementById(`cost-setasides-${scenarioId}`).textContent = this.formatCurrency(totalSetAsides);
        document.getElementById(`cost-total-${scenarioId}`).textContent = this.formatCurrency(totalClosingCosts + data.existingMortgage + totalSetAsides);

        // Annual obligations
        const annualMipAmount = isProprietary ? 0 : (initialBalance * annualMipRate / 100);
        document.getElementById(`annual-taxes-${scenarioId}`).textContent = this.formatCurrency(data.annualTaxes);
        document.getElementById(`annual-insurance-${scenarioId}`).textContent = this.formatCurrency(data.annualInsurance);
        document.getElementById(`annual-hoa-${scenarioId}`).textContent = this.formatCurrency(data.annualHoa);
        document.getElementById(`annual-mip-${scenarioId}`).textContent = this.formatCurrency(annualMipAmount);
        document.getElementById(`annual-total-${scenarioId}`).textContent = this.formatCurrency(totalAnnualCharges + annualMipAmount);

        // Show results
        document.getElementById(`results-${scenarioId}`).style.display = 'block';

        // Store results for comparison
        this.results = this.results || {};
        this.results[scenarioId] = {
            name: data.scenarioName,
            loanProgram: data.loanProgram,
            programName: programInfo.name,
            maxClaimAmount,
            principalLimit,
            netPrincipalLimit: Math.max(0, netPrincipalLimit),
            cashToBorrower: Math.max(0, cashToBorrower),
            locAmount: Math.max(0, locAmount),
            monthlyPayment,
            totalClosingCosts,
            initialMIP,
            existingMortgage: data.existingMortgage,
            interestRate: data.interestRate,
            paymentType: data.paymentType,
            annualMipRate: annualMipRate
        };

        // Update comparison if both scenarios calculated
        this.updateComparison();
    },

    updateComparison() {
        if (!this.results || !this.results[1] || !this.results[2]) return;

        const r1 = this.results[1];
        const r2 = this.results[2];

        document.getElementById('compare-name-1').textContent = r1.name;
        document.getElementById('compare-name-2').textContent = r2.name;

        const metrics = [
            { label: 'Loan Program', key: 'programName', isText: true },
            { label: 'Max Claim Amount', key: 'maxClaimAmount' },
            { label: 'Principal Limit', key: 'principalLimit' },
            { label: 'Net Principal Limit', key: 'netPrincipalLimit' },
            { label: 'Cash to Borrower', key: 'cashToBorrower' },
            { label: 'Line of Credit', key: 'locAmount' },
            { label: 'Monthly Distribution', key: 'monthlyPayment' },
            { label: 'Upfront MIP', key: 'initialMIP' },
            { label: 'Total Closing Costs', key: 'totalClosingCosts' },
            { label: 'Interest Rate', key: 'interestRate', isPercent: true }
        ];

        const tbody = document.getElementById('hecmComparisonBody');
        tbody.innerHTML = metrics.map(m => {
            const v1 = r1[m.key];
            const v2 = r2[m.key];

            if (m.isText) {
                return `<tr>
                    <td>${m.label}</td>
                    <td>${v1}</td>
                    <td>${v2}</td>
                    <td>-</td>
                </tr>`;
            }

            const diff = v2 - v1;
            const diffClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : '';

            if (m.isPercent) {
                return `<tr>
                    <td>${m.label}</td>
                    <td>${v1.toFixed(3)}%</td>
                    <td>${v2.toFixed(3)}%</td>
                    <td class="${diffClass}">${diff > 0 ? '+' : ''}${diff.toFixed(3)}%</td>
                </tr>`;
            }

            return `<tr>
                <td>${m.label}</td>
                <td>${this.formatCurrency(v1)}</td>
                <td>${this.formatCurrency(v2)}</td>
                <td class="${diffClass}">${diff > 0 ? '+' : ''}${this.formatCurrency(diff)}</td>
            </tr>`;
        }).join('');

        document.getElementById('hecmComparison').style.display = 'block';

        // Update charts and projections
        HECMChartManager.updateCharts();
        HECMChartManager.updateAllTimeBasedDisplays();
    }
};

// Chart Manager for HECM
const HECMChartManager = {
    charts: {},
    selectedYears: 10,

    init() {
        // Time period buttons
        document.querySelectorAll('.hecm-time-section .time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.hecm-time-section .time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('hecmCustomYears').value = '';
                this.selectedYears = parseInt(btn.dataset.years);
                this.updateAllTimeBasedDisplays();
            });
        });

        // Custom years input
        document.getElementById('hecmCustomYears')?.addEventListener('input', (e) => {
            const years = parseInt(e.target.value);
            if (years > 0 && years <= 40) {
                document.querySelectorAll('.hecm-time-section .time-btn').forEach(b => b.classList.remove('active'));
                this.selectedYears = years;
                this.updateAllTimeBasedDisplays();
            }
        });
    },

    updateAllTimeBasedDisplays() {
        const timeLabel = `${this.selectedYears} year${this.selectedYears > 1 ? 's' : ''}`;

        // Update all time labels
        document.querySelectorAll('.hecm-time-section .time-label').forEach(el => {
            el.textContent = `(at ${timeLabel})`;
        });

        this.updateProjections(this.selectedYears);
        this.updateBenefitCards(this.selectedYears);
        this.updateAdvisorRecommendation(this.selectedYears);
    },

    updateCharts() {
        if (!HECMCalculator.results || !HECMCalculator.results[1] || !HECMCalculator.results[2]) return;

        const r1 = HECMCalculator.results[1];
        const r2 = HECMCalculator.results[2];
        const d1 = HECMCalculator.getFormData(1);
        const d2 = HECMCalculator.getFormData(2);

        // Destroy existing charts
        Object.values(this.charts).forEach(chart => chart?.destroy());

        // Chart colors
        const colors = {
            scenario1: 'rgba(37, 99, 235, 0.8)',
            scenario1Light: 'rgba(37, 99, 235, 0.2)',
            scenario2: 'rgba(16, 185, 129, 0.8)',
            scenario2Light: 'rgba(16, 185, 129, 0.2)',
            homeValue: 'rgba(139, 92, 246, 0.8)',
            homeValueLight: 'rgba(139, 92, 246, 0.2)'
        };

        // 1. Benefit Comparison Chart (Cash/LOC)
        const benefitCtx = document.getElementById('hecmBenefitChart')?.getContext('2d');
        if (benefitCtx) {
            this.charts.benefit = new Chart(benefitCtx, {
                type: 'bar',
                data: {
                    labels: [r1.name || 'Scenario 1', r2.name || 'Scenario 2'],
                    datasets: [
                        {
                            label: 'Cash to Borrower',
                            data: [r1.cashToBorrower, r2.cashToBorrower],
                            backgroundColor: colors.scenario1,
                            borderRadius: 4
                        },
                        {
                            label: 'Line of Credit',
                            data: [r1.locAmount, r2.locAmount],
                            backgroundColor: colors.scenario2,
                            borderRadius: 4
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
                                label: (ctx) => `${ctx.dataset.label}: ${HECMCalculator.formatCurrency(ctx.raw)}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => HECMCalculator.formatCurrency(value)
                            }
                        }
                    }
                }
            });
        }

        // 2. Costs Comparison Chart
        const costsCtx = document.getElementById('hecmCostsChart')?.getContext('2d');
        if (costsCtx) {
            this.charts.costs = new Chart(costsCtx, {
                type: 'bar',
                data: {
                    labels: [r1.name || 'Scenario 1', r2.name || 'Scenario 2'],
                    datasets: [
                        {
                            label: 'Initial MIP',
                            data: [r1.initialMIP, r2.initialMIP],
                            backgroundColor: 'rgba(239, 68, 68, 0.7)',
                            borderRadius: 4
                        },
                        {
                            label: 'Closing Costs',
                            data: [r1.totalClosingCosts - r1.initialMIP, r2.totalClosingCosts - r2.initialMIP],
                            backgroundColor: 'rgba(251, 146, 60, 0.7)',
                            borderRadius: 4
                        },
                        {
                            label: 'Mortgage Payoff',
                            data: [r1.existingMortgage, r2.existingMortgage],
                            backgroundColor: 'rgba(156, 163, 175, 0.7)',
                            borderRadius: 4
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
                                label: (ctx) => `${ctx.dataset.label}: ${HECMCalculator.formatCurrency(ctx.raw)}`
                            }
                        }
                    },
                    scales: {
                        x: { stacked: true },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => HECMCalculator.formatCurrency(value)
                            }
                        }
                    }
                }
            });
        }

        // 3. Balance Projection Chart (Line)
        const balanceCtx = document.getElementById('hecmBalanceChart')?.getContext('2d');
        if (balanceCtx) {
            const years = Array.from({length: 31}, (_, i) => i);
            const initialBalance1 = r1.totalClosingCosts + r1.existingMortgage;
            const initialBalance2 = r2.totalClosingCosts + r2.existingMortgage;

            const balances1 = years.map(y => HECMCalculator.calculateBalanceProjectionWithMip(initialBalance1, r1.interestRate, r1.annualMipRate || 0.5, y));
            const balances2 = years.map(y => HECMCalculator.calculateBalanceProjectionWithMip(initialBalance2, r2.interestRate, r2.annualMipRate || 0.5, y));

            this.charts.balance = new Chart(balanceCtx, {
                type: 'line',
                data: {
                    labels: years.map(y => `Year ${y}`),
                    datasets: [
                        {
                            label: r1.name || 'Scenario 1',
                            data: balances1,
                            borderColor: colors.scenario1,
                            backgroundColor: colors.scenario1Light,
                            fill: true,
                            tension: 0.3
                        },
                        {
                            label: r2.name || 'Scenario 2',
                            data: balances2,
                            borderColor: colors.scenario2,
                            backgroundColor: colors.scenario2Light,
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
                                label: (ctx) => `${ctx.dataset.label}: ${HECMCalculator.formatCurrency(ctx.raw)}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => HECMCalculator.formatCurrency(value)
                            }
                        }
                    }
                }
            });
        }

        // 4. Equity Projection Chart
        const equityCtx = document.getElementById('hecmEquityChart')?.getContext('2d');
        if (equityCtx) {
            const years = Array.from({length: 31}, (_, i) => i);
            const homeValue1 = d1?.homeValue || 450000;
            const homeValue2 = d2?.homeValue || 450000;
            const initialBalance1 = r1.totalClosingCosts + r1.existingMortgage;
            const initialBalance2 = r2.totalClosingCosts + r2.existingMortgage;
            const appreciation = 0.03;

            const homeValues1 = years.map(y => homeValue1 * Math.pow(1 + appreciation, y));
            const homeValues2 = years.map(y => homeValue2 * Math.pow(1 + appreciation, y));
            const balances1 = years.map(y => HECMCalculator.calculateBalanceProjectionWithMip(initialBalance1, r1.interestRate, r1.annualMipRate || 0.5, y));
            const balances2 = years.map(y => HECMCalculator.calculateBalanceProjectionWithMip(initialBalance2, r2.interestRate, r2.annualMipRate || 0.5, y));
            const equities1 = years.map((y, i) => Math.max(0, homeValues1[i] - balances1[i]));
            const equities2 = years.map((y, i) => Math.max(0, homeValues2[i] - balances2[i]));

            this.charts.equity = new Chart(equityCtx, {
                type: 'line',
                data: {
                    labels: years.map(y => `Year ${y}`),
                    datasets: [
                        {
                            label: `${r1.name || 'Scenario 1'} Equity`,
                            data: equities1,
                            borderColor: colors.scenario1,
                            backgroundColor: colors.scenario1Light,
                            fill: true,
                            tension: 0.3
                        },
                        {
                            label: `${r2.name || 'Scenario 2'} Equity`,
                            data: equities2,
                            borderColor: colors.scenario2,
                            backgroundColor: colors.scenario2Light,
                            fill: true,
                            tension: 0.3
                        },
                        {
                            label: 'Home Value (3% appreciation)',
                            data: homeValues1,
                            borderColor: colors.homeValue,
                            borderDash: [5, 5],
                            fill: false,
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
                                label: (ctx) => `${ctx.dataset.label}: ${HECMCalculator.formatCurrency(ctx.raw)}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => HECMCalculator.formatCurrency(value)
                            }
                        }
                    }
                }
            });
        }

        // 5. LOC Growth Chart
        const locCtx = document.getElementById('hecmLOCGrowthChart')?.getContext('2d');
        if (locCtx && (r1.locAmount > 0 || r2.locAmount > 0)) {
            const years = Array.from({length: 31}, (_, i) => i);

            const loc1 = years.map(y => r1.locAmount > 0 ? HECMCalculator.calculateLOCGrowthWithMip(r1.locAmount, r1.interestRate, r1.annualMipRate || 0.5, y) : 0);
            const loc2 = years.map(y => r2.locAmount > 0 ? HECMCalculator.calculateLOCGrowthWithMip(r2.locAmount, r2.interestRate, r2.annualMipRate || 0.5, y) : 0);

            this.charts.loc = new Chart(locCtx, {
                type: 'line',
                data: {
                    labels: years.map(y => `Year ${y}`),
                    datasets: [
                        {
                            label: `${r1.name || 'Scenario 1'} LOC`,
                            data: loc1,
                            borderColor: colors.scenario1,
                            backgroundColor: colors.scenario1Light,
                            fill: true,
                            tension: 0.3
                        },
                        {
                            label: `${r2.name || 'Scenario 2'} LOC`,
                            data: loc2,
                            borderColor: colors.scenario2,
                            backgroundColor: colors.scenario2Light,
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
                                label: (ctx) => `${ctx.dataset.label}: ${HECMCalculator.formatCurrency(ctx.raw)}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => HECMCalculator.formatCurrency(value)
                            }
                        }
                    }
                }
            });
        }
    },

    updateProjections(years) {
        if (!HECMCalculator.results || !HECMCalculator.results[1] || !HECMCalculator.results[2]) return;

        const r1 = HECMCalculator.results[1];
        const r2 = HECMCalculator.results[2];
        const d1 = HECMCalculator.getFormData(1);
        const d2 = HECMCalculator.getFormData(2);

        const homeValue1 = d1?.homeValue || 450000;
        const homeValue2 = d2?.homeValue || 450000;
        const initialBalance1 = r1.totalClosingCosts + r1.existingMortgage;
        const initialBalance2 = r2.totalClosingCosts + r2.existingMortgage;
        const appreciation = 0.03;

        // Calculate projections
        const projHomeValue1 = homeValue1 * Math.pow(1 + appreciation, years);
        const projHomeValue2 = homeValue2 * Math.pow(1 + appreciation, years);
        const projBalance1 = HECMCalculator.calculateBalanceProjectionWithMip(initialBalance1, r1.interestRate, r1.annualMipRate || 0.5, years);
        const projBalance2 = HECMCalculator.calculateBalanceProjectionWithMip(initialBalance2, r2.interestRate, r2.annualMipRate || 0.5, years);
        const projEquity1 = Math.max(0, projHomeValue1 - projBalance1);
        const projEquity2 = Math.max(0, projHomeValue2 - projBalance2);
        const projLOC1 = r1.locAmount > 0 ? HECMCalculator.calculateLOCGrowthWithMip(r1.locAmount, r1.interestRate, r1.annualMipRate || 0.5, years) : 0;
        const projLOC2 = r2.locAmount > 0 ? HECMCalculator.calculateLOCGrowthWithMip(r2.locAmount, r2.interestRate, r2.annualMipRate || 0.5, years) : 0;
        const projInterest1 = projBalance1 - initialBalance1;
        const projInterest2 = projBalance2 - initialBalance2;

        // Update labels
        document.getElementById('proj-home-label-1').textContent = r1.name || 'Scenario 1';
        document.getElementById('proj-home-label-2').textContent = r2.name || 'Scenario 2';
        document.getElementById('proj-balance-label-1').textContent = r1.name || 'Scenario 1';
        document.getElementById('proj-balance-label-2').textContent = r2.name || 'Scenario 2';
        document.getElementById('proj-equity-label-1').textContent = r1.name || 'Scenario 1';
        document.getElementById('proj-equity-label-2').textContent = r2.name || 'Scenario 2';
        document.getElementById('proj-loc-label-1').textContent = r1.name || 'Scenario 1';
        document.getElementById('proj-loc-label-2').textContent = r2.name || 'Scenario 2';
        document.getElementById('proj-interest-label-1').textContent = r1.name || 'Scenario 1';
        document.getElementById('proj-interest-label-2').textContent = r2.name || 'Scenario 2';

        // Update values
        document.getElementById('proj-home-1').textContent = HECMCalculator.formatCurrency(projHomeValue1);
        document.getElementById('proj-home-2').textContent = HECMCalculator.formatCurrency(projHomeValue2);
        document.getElementById('proj-balance-1').textContent = HECMCalculator.formatCurrency(projBalance1);
        document.getElementById('proj-balance-2').textContent = HECMCalculator.formatCurrency(projBalance2);
        document.getElementById('proj-equity-1').textContent = HECMCalculator.formatCurrency(projEquity1);
        document.getElementById('proj-equity-2').textContent = HECMCalculator.formatCurrency(projEquity2);
        document.getElementById('proj-loc-1').textContent = HECMCalculator.formatCurrency(projLOC1);
        document.getElementById('proj-loc-2').textContent = HECMCalculator.formatCurrency(projLOC2);
        document.getElementById('proj-interest-1').textContent = HECMCalculator.formatCurrency(projInterest1);
        document.getElementById('proj-interest-2').textContent = HECMCalculator.formatCurrency(projInterest2);

        // Equity difference
        const equityDiff = Math.abs(projEquity1 - projEquity2);
        const favorScenario = projEquity1 > projEquity2 ? (r1.name || 'Scenario 1') : (r2.name || 'Scenario 2');
        document.getElementById('proj-equity-diff').textContent = HECMCalculator.formatCurrency(equityDiff);
        document.getElementById('proj-equity-note').textContent = `in favor of ${favorScenario}`;

        // Update recommendation
        this.updateRecommendation(r1, r2, projEquity1, projEquity2, years);
    },

    updateBenefitCards(years) {
        if (!HECMCalculator.results || !HECMCalculator.results[1] || !HECMCalculator.results[2]) return;

        const r1 = HECMCalculator.results[1];
        const r2 = HECMCalculator.results[2];
        const d1 = HECMCalculator.getFormData(1);
        const d2 = HECMCalculator.getFormData(2);

        const name1 = r1.name || 'Scenario 1';
        const name2 = r2.name || 'Scenario 2';

        const homeValue1 = d1?.homeValue || 450000;
        const homeValue2 = d2?.homeValue || 450000;
        const initialBalance1 = r1.totalClosingCosts + r1.existingMortgage;
        const initialBalance2 = r2.totalClosingCosts + r2.existingMortgage;
        const appreciation = 0.03;

        // Calculate projected values
        const projHomeValue1 = homeValue1 * Math.pow(1 + appreciation, years);
        const projHomeValue2 = homeValue2 * Math.pow(1 + appreciation, years);
        const projBalance1 = HECMCalculator.calculateBalanceProjectionWithMip(initialBalance1, r1.interestRate, r1.annualMipRate || 0.5, years);
        const projBalance2 = HECMCalculator.calculateBalanceProjectionWithMip(initialBalance2, r2.interestRate, r2.annualMipRate || 0.5, years);
        const projEquity1 = Math.max(0, projHomeValue1 - projBalance1);
        const projEquity2 = Math.max(0, projHomeValue2 - projBalance2);
        const projLOC1 = r1.locAmount > 0 ? HECMCalculator.calculateLOCGrowthWithMip(r1.locAmount, r1.interestRate, r1.annualMipRate || 0.5, years) : 0;
        const projLOC2 = r2.locAmount > 0 ? HECMCalculator.calculateLOCGrowthWithMip(r2.locAmount, r2.interestRate, r2.annualMipRate || 0.5, years) : 0;
        const projInterest1 = projBalance1 - initialBalance1;
        const projInterest2 = projBalance2 - initialBalance2;

        // Helper to generate benefit card content
        const generateBenefitContent = (values, isCostCard = false) => {
            const bestValue = isCostCard ? Math.min(...values.map(v => v.value)) : Math.max(...values.map(v => v.value));

            let html = values.map(v => {
                const isBest = v.value === bestValue;
                return `
                    <div class="benefit-scenario-row ${isBest ? 'best' : ''}">
                        <span class="scenario-name">${v.name}${isBest ? '<span class="best-badge">Best</span>' : ''}</span>
                        <span class="scenario-value">${HECMCalculator.formatCurrency(v.value)}</span>
                    </div>
                `;
            }).join('');

            // Add difference row
            const diff = Math.abs(values[0].value - values[1].value);
            if (diff > 0) {
                const betterScenario = isCostCard
                    ? (values[0].value < values[1].value ? values[0].name : values[1].name)
                    : (values[0].value > values[1].value ? values[0].name : values[1].name);

                html += `
                    <div class="benefit-difference">
                        <div class="benefit-diff-row">
                            <span>Difference</span>
                            <span class="diff-value ${isCostCard ? 'extra' : 'savings'}">${HECMCalculator.formatCurrency(diff)}</span>
                        </div>
                    </div>
                `;
            }

            return html;
        };

        // Update each benefit card
        document.getElementById('benefit-npl').innerHTML = generateBenefitContent([
            { name: name1, value: r1.netPrincipalLimit },
            { name: name2, value: r2.netPrincipalLimit }
        ]);

        document.getElementById('benefit-cash').innerHTML = generateBenefitContent([
            { name: name1, value: r1.cashToBorrower },
            { name: name2, value: r2.cashToBorrower }
        ]);

        document.getElementById('benefit-costs').innerHTML = generateBenefitContent([
            { name: name1, value: r1.totalClosingCosts },
            { name: name2, value: r2.totalClosingCosts }
        ], true);

        document.getElementById('benefit-equity').innerHTML = generateBenefitContent([
            { name: name1, value: projEquity1 },
            { name: name2, value: projEquity2 }
        ]);

        document.getElementById('benefit-loc').innerHTML = generateBenefitContent([
            { name: name1, value: projLOC1 },
            { name: name2, value: projLOC2 }
        ]);

        document.getElementById('benefit-interest').innerHTML = generateBenefitContent([
            { name: name1, value: projInterest1 },
            { name: name2, value: projInterest2 }
        ], true);
    },

    updateAdvisorRecommendation(years) {
        if (!HECMCalculator.results || !HECMCalculator.results[1] || !HECMCalculator.results[2]) return;

        const r1 = HECMCalculator.results[1];
        const r2 = HECMCalculator.results[2];
        const d1 = HECMCalculator.getFormData(1);
        const d2 = HECMCalculator.getFormData(2);

        const name1 = r1.name || 'Scenario 1';
        const name2 = r2.name || 'Scenario 2';

        const homeValue1 = d1?.homeValue || 450000;
        const homeValue2 = d2?.homeValue || 450000;
        const initialBalance1 = r1.totalClosingCosts + r1.existingMortgage;
        const initialBalance2 = r2.totalClosingCosts + r2.existingMortgage;
        const appreciation = 0.03;

        // Calculate scores for each scenario
        let score1 = 0, score2 = 0;
        const reasons1 = [], reasons2 = [];

        // Net Principal Limit comparison
        if (r1.netPrincipalLimit > r2.netPrincipalLimit) {
            score1 += 2;
            reasons1.push(`${HECMCalculator.formatCurrency(r1.netPrincipalLimit - r2.netPrincipalLimit)} more available proceeds`);
        } else if (r2.netPrincipalLimit > r1.netPrincipalLimit) {
            score2 += 2;
            reasons2.push(`${HECMCalculator.formatCurrency(r2.netPrincipalLimit - r1.netPrincipalLimit)} more available proceeds`);
        }

        // Cash to borrower
        if (r1.cashToBorrower > r2.cashToBorrower) {
            score1 += 1;
            reasons1.push(`${HECMCalculator.formatCurrency(r1.cashToBorrower - r2.cashToBorrower)} more cash at closing`);
        } else if (r2.cashToBorrower > r1.cashToBorrower) {
            score2 += 1;
            reasons2.push(`${HECMCalculator.formatCurrency(r2.cashToBorrower - r1.cashToBorrower)} more cash at closing`);
        }

        // Lower closing costs
        if (r1.totalClosingCosts < r2.totalClosingCosts) {
            score1 += 1;
            reasons1.push(`${HECMCalculator.formatCurrency(r2.totalClosingCosts - r1.totalClosingCosts)} lower upfront costs`);
        } else if (r2.totalClosingCosts < r1.totalClosingCosts) {
            score2 += 1;
            reasons2.push(`${HECMCalculator.formatCurrency(r1.totalClosingCosts - r2.totalClosingCosts)} lower upfront costs`);
        }

        // Lower interest rate
        if (r1.interestRate < r2.interestRate) {
            score1 += 1;
            reasons1.push(`Lower interest rate (${r1.interestRate.toFixed(2)}% vs ${r2.interestRate.toFixed(2)}%)`);
        } else if (r2.interestRate < r1.interestRate) {
            score2 += 1;
            reasons2.push(`Lower interest rate (${r2.interestRate.toFixed(2)}% vs ${r1.interestRate.toFixed(2)}%)`);
        }

        // Equity preservation at selected year
        const projBalance1 = HECMCalculator.calculateBalanceProjectionWithMip(initialBalance1, r1.interestRate, r1.annualMipRate || 0.5, years);
        const projBalance2 = HECMCalculator.calculateBalanceProjectionWithMip(initialBalance2, r2.interestRate, r2.annualMipRate || 0.5, years);
        const projEquity1 = Math.max(0, homeValue1 * Math.pow(1 + appreciation, years) - projBalance1);
        const projEquity2 = Math.max(0, homeValue2 * Math.pow(1 + appreciation, years) - projBalance2);

        if (projEquity1 > projEquity2) {
            score1 += 2;
            reasons1.push(`Preserves ${HECMCalculator.formatCurrency(projEquity1 - projEquity2)} more equity at ${years} years`);
        } else if (projEquity2 > projEquity1) {
            score2 += 2;
            reasons2.push(`Preserves ${HECMCalculator.formatCurrency(projEquity2 - projEquity1)} more equity at ${years} years`);
        }

        // Determine winner
        const winner = score1 >= score2 ? 1 : 2;
        const winnerName = winner === 1 ? name1 : name2;
        const winnerReasons = winner === 1 ? reasons1 : reasons2;
        const winnerScore = winner === 1 ? score1 : score2;
        const totalPoints = score1 + score2;

        const contentEl = document.getElementById('hecmAdvisorContent');
        if (!contentEl) return;

        const checkIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;

        contentEl.innerHTML = `
            <div class="advisor-recommendation">
                <div class="advisor-winner">
                    <div class="advisor-winner-label">Recommended</div>
                    <div class="advisor-winner-name">${winnerName}</div>
                    <div class="advisor-winner-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        ${winnerScore}/${totalPoints} points
                    </div>
                </div>
                <div class="advisor-reasons">
                    <h4>Why ${winnerName} is recommended:</h4>
                    <ul class="advisor-reasons-list">
                        ${winnerReasons.map(r => `<li>${checkIcon} ${r}</li>`).join('')}
                    </ul>
                    <div class="advisor-caveat">
                        <strong>Important:</strong> This recommendation is based on the numbers entered and assumes 3% annual home appreciation. Your personal financial situation, goals, and timeline should be the primary factors in your decision. Consult with a HUD-approved HECM counselor before proceeding.
                    </div>
                </div>
            </div>
        `;
    },

    updateRecommendation(r1, r2, equity1, equity2, years) {
        const contentEl = document.getElementById('hecmRecommendationContent');
        if (!contentEl) return;

        const name1 = r1.name || 'Scenario 1';
        const name2 = r2.name || 'Scenario 2';

        let recommendations = [];

        // Compare net principal limits
        if (r1.netPrincipalLimit > r2.netPrincipalLimit) {
            const diff = r1.netPrincipalLimit - r2.netPrincipalLimit;
            recommendations.push(`<strong>${name1}</strong> provides ${HECMCalculator.formatCurrency(diff)} more in available proceeds.`);
        } else if (r2.netPrincipalLimit > r1.netPrincipalLimit) {
            const diff = r2.netPrincipalLimit - r1.netPrincipalLimit;
            recommendations.push(`<strong>${name2}</strong> provides ${HECMCalculator.formatCurrency(diff)} more in available proceeds.`);
        }

        // Compare closing costs
        if (r1.totalClosingCosts < r2.totalClosingCosts) {
            const diff = r2.totalClosingCosts - r1.totalClosingCosts;
            recommendations.push(`<strong>${name1}</strong> has ${HECMCalculator.formatCurrency(diff)} lower upfront costs.`);
        } else if (r2.totalClosingCosts < r1.totalClosingCosts) {
            const diff = r1.totalClosingCosts - r2.totalClosingCosts;
            recommendations.push(`<strong>${name2}</strong> has ${HECMCalculator.formatCurrency(diff)} lower upfront costs.`);
        }

        // Compare equity at selected time period
        if (equity1 > equity2) {
            const diff = equity1 - equity2;
            recommendations.push(`At ${years} years, <strong>${name1}</strong> preserves ${HECMCalculator.formatCurrency(diff)} more equity.`);
        } else if (equity2 > equity1) {
            const diff = equity2 - equity1;
            recommendations.push(`At ${years} years, <strong>${name2}</strong> preserves ${HECMCalculator.formatCurrency(diff)} more equity.`);
        }

        // Compare interest rates
        if (r1.interestRate < r2.interestRate) {
            recommendations.push(`<strong>${name1}</strong> has a lower interest rate (${r1.interestRate.toFixed(3)}% vs ${r2.interestRate.toFixed(3)}%), resulting in slower balance growth.`);
        } else if (r2.interestRate < r1.interestRate) {
            recommendations.push(`<strong>${name2}</strong> has a lower interest rate (${r2.interestRate.toFixed(3)}% vs ${r1.interestRate.toFixed(3)}%), resulting in slower balance growth.`);
        }

        // LOC comparison
        if (r1.locAmount > 0 && r2.locAmount > 0) {
            if (r1.locAmount > r2.locAmount) {
                recommendations.push(`<strong>${name1}</strong> starts with a larger line of credit that will grow over time.`);
            } else if (r2.locAmount > r1.locAmount) {
                recommendations.push(`<strong>${name2}</strong> starts with a larger line of credit that will grow over time.`);
            }
        }

        contentEl.innerHTML = `
            <ul class="recommendation-list">
                ${recommendations.map(r => `<li>${r}</li>`).join('')}
            </ul>
            <p class="recommendation-note">
                <strong>Note:</strong> This analysis assumes 3% annual home appreciation and current interest rates remaining constant.
                Actual results may vary. Consult with a HUD-approved HECM counselor before making any decisions.
            </p>
        `;
    }
};

// Settings Manager
const SettingsManager = {
    init() {
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.settingsOverlay = document.getElementById('settingsOverlay');
        this.closeSettingsBtn = document.getElementById('closeSettings');
        this.darkModeToggle = document.getElementById('darkModeToggle');

        // Bind events
        this.settingsBtn?.addEventListener('click', () => this.openSettings());
        this.closeSettingsBtn?.addEventListener('click', () => this.closeSettings());
        this.settingsOverlay?.addEventListener('click', () => this.closeSettings());
        this.darkModeToggle?.addEventListener('change', () => this.toggleDarkMode());

        // Load saved settings
        this.loadSettings();

        // Save buttons
        document.getElementById('saveLOSettings')?.addEventListener('click', () => this.saveLOInfo());
        document.getElementById('saveLenderSettings')?.addEventListener('click', () => this.saveLenderInfo());
        document.getElementById('saveRealtorSettings')?.addEventListener('click', () => this.saveRealtorInfo());
        document.getElementById('saveTitleAgentSettings')?.addEventListener('click', () => this.saveTitleAgentInfo());

        // Admin login
        document.getElementById('adminLoginBtn')?.addEventListener('click', () => this.adminLogin());
        document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.adminLogin();
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.settingsPanel?.classList.contains('hidden')) {
                this.closeSettings();
            }
        });
    },

    openSettings() {
        this.settingsPanel?.classList.remove('hidden');
        this.settingsOverlay?.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    closeSettings() {
        this.settingsPanel?.classList.add('hidden');
        this.settingsOverlay?.classList.add('hidden');
        document.body.style.overflow = '';
    },

    toggleDarkMode() {
        const isDark = this.darkModeToggle?.checked;
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    },

    loadSettings() {
        // Load theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (this.darkModeToggle) this.darkModeToggle.checked = true;
        }

        // Load LO info
        const loInfo = JSON.parse(localStorage.getItem('loandrUserInfo') || '{}');
        if (loInfo.name) document.getElementById('loName').value = loInfo.name;
        if (loInfo.company) document.getElementById('loCompany').value = loInfo.company;
        if (loInfo.phone) document.getElementById('loPhone').value = loInfo.phone;
        if (loInfo.email) document.getElementById('loEmail').value = loInfo.email;
        if (loInfo.nmls) document.getElementById('loNMLS').value = loInfo.nmls;

        // Update header display
        if (loInfo.name) document.getElementById('userName').textContent = loInfo.name;
        if (loInfo.company) document.getElementById('userCompany').textContent = loInfo.company;

        // Load lender info
        const lenderInfo = JSON.parse(localStorage.getItem('loandrLenderInfo') || '{}');
        if (lenderInfo.name) document.getElementById('lenderName').value = lenderInfo.name;
        if (lenderInfo.nmls) document.getElementById('lenderNMLS').value = lenderInfo.nmls;
        if (lenderInfo.phone) document.getElementById('lenderPhone').value = lenderInfo.phone;
        if (lenderInfo.website) document.getElementById('lenderWebsite').value = lenderInfo.website;
        if (lenderInfo.address) document.getElementById('lenderAddress').value = lenderInfo.address;
        if (lenderInfo.cityStateZip) document.getElementById('lenderCityStateZip').value = lenderInfo.cityStateZip;
        if (lenderInfo.disclaimer) document.getElementById('lenderDisclaimer').value = lenderInfo.disclaimer;

        // Load realtor info
        const realtorInfo = JSON.parse(localStorage.getItem('loandrRealtorInfo') || '{}');
        if (realtorInfo.enabled) document.getElementById('enableRealtorBranding').checked = true;
        if (realtorInfo.name) document.getElementById('realtorName').value = realtorInfo.name;
        if (realtorInfo.company) document.getElementById('realtorCompany').value = realtorInfo.company;
        if (realtorInfo.phone) document.getElementById('realtorPhone').value = realtorInfo.phone;
        if (realtorInfo.email) document.getElementById('realtorEmail').value = realtorInfo.email;
        if (realtorInfo.license) document.getElementById('realtorLicense').value = realtorInfo.license;

        // Load title agent info
        const titleInfo = JSON.parse(localStorage.getItem('loandrTitleAgentInfo') || '{}');
        if (titleInfo.enabled) document.getElementById('enableTitleBranding').checked = true;
        if (titleInfo.company) document.getElementById('titleAgentCompany').value = titleInfo.company;
        if (titleInfo.name) document.getElementById('titleAgentName').value = titleInfo.name;
        if (titleInfo.phone) document.getElementById('titleAgentPhone').value = titleInfo.phone;
        if (titleInfo.email) document.getElementById('titleAgentEmail').value = titleInfo.email;
        if (titleInfo.address) document.getElementById('titleAgentAddress').value = titleInfo.address;
    },

    saveLOInfo() {
        const info = {
            name: document.getElementById('loName')?.value || '',
            company: document.getElementById('loCompany')?.value || '',
            phone: document.getElementById('loPhone')?.value || '',
            email: document.getElementById('loEmail')?.value || '',
            nmls: document.getElementById('loNMLS')?.value || ''
        };
        localStorage.setItem('loandrUserInfo', JSON.stringify(info));

        // Update header
        document.getElementById('userName').textContent = info.name;
        document.getElementById('userCompany').textContent = info.company;

        this.showSaveConfirmation('Loan Officer info saved!');
    },

    saveLenderInfo() {
        const info = {
            name: document.getElementById('lenderName')?.value || '',
            nmls: document.getElementById('lenderNMLS')?.value || '',
            phone: document.getElementById('lenderPhone')?.value || '',
            website: document.getElementById('lenderWebsite')?.value || '',
            address: document.getElementById('lenderAddress')?.value || '',
            cityStateZip: document.getElementById('lenderCityStateZip')?.value || '',
            disclaimer: document.getElementById('lenderDisclaimer')?.value || ''
        };
        localStorage.setItem('loandrLenderInfo', JSON.stringify(info));
        this.showSaveConfirmation('Lender info saved!');
    },

    saveRealtorInfo() {
        const info = {
            enabled: document.getElementById('enableRealtorBranding')?.checked || false,
            name: document.getElementById('realtorName')?.value || '',
            company: document.getElementById('realtorCompany')?.value || '',
            phone: document.getElementById('realtorPhone')?.value || '',
            email: document.getElementById('realtorEmail')?.value || '',
            license: document.getElementById('realtorLicense')?.value || ''
        };
        localStorage.setItem('loandrRealtorInfo', JSON.stringify(info));
        this.showSaveConfirmation('Real Estate Agent info saved!');
    },

    saveTitleAgentInfo() {
        const info = {
            enabled: document.getElementById('enableTitleBranding')?.checked || false,
            company: document.getElementById('titleAgentCompany')?.value || '',
            name: document.getElementById('titleAgentName')?.value || '',
            phone: document.getElementById('titleAgentPhone')?.value || '',
            email: document.getElementById('titleAgentEmail')?.value || '',
            address: document.getElementById('titleAgentAddress')?.value || ''
        };
        localStorage.setItem('loandrTitleAgentInfo', JSON.stringify(info));
        this.showSaveConfirmation('Title Company info saved!');
    },

    showSaveConfirmation(message) {
        // Create and show a toast notification
        const toast = document.createElement('div');
        toast.className = 'save-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--primary-color, #2563eb);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    },

    adminLogin() {
        const password = document.getElementById('adminPassword')?.value;
        const errorEl = document.getElementById('adminError');

        // Simple password check (in production, this should be server-side)
        if (password === 'LoanAdmin2024!') {
            window.location.href = 'admin.html';
        } else {
            errorEl?.classList.remove('hidden');
            setTimeout(() => errorEl?.classList.add('hidden'), 3000);
        }
    }
};

// Document Generator
const DocumentGenerator = {
    init() {
        document.getElementById('generateHecmDoc')?.addEventListener('click', () => this.openModal());
        document.getElementById('closeModal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('copyDocBtn')?.addEventListener('click', () => this.copyToClipboard());
        document.getElementById('downloadDocBtn')?.addEventListener('click', () => this.downloadHTML());
        document.getElementById('printDocBtn')?.addEventListener('click', () => this.printDocument());

        // Close on overlay click
        document.getElementById('documentModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'documentModal') this.closeModal();
        });

        // Load saved LO info
        const loInfo = JSON.parse(localStorage.getItem('loandrUserInfo') || '{}');
        if (loInfo.name) document.getElementById('loanOfficerName').value = loInfo.name;
        if (loInfo.company) document.getElementById('companyName').value = loInfo.company;
        if (loInfo.phone || loInfo.email) {
            document.getElementById('contactInfo').value = [loInfo.phone, loInfo.email].filter(Boolean).join(' | ');
        }

        // Update preview on input change
        document.querySelectorAll('.document-options input, .document-options textarea').forEach(input => {
            input.addEventListener('input', () => this.updatePreview());
        });
    },

    openModal() {
        if (!HECMCalculator.results || Object.keys(HECMCalculator.results).length === 0) {
            alert('Please calculate at least one scenario before generating a document.');
            return;
        }
        document.getElementById('documentModal')?.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        this.updatePreview();
    },

    closeModal() {
        document.getElementById('documentModal')?.classList.add('hidden');
        document.body.style.overflow = '';
    },

    updatePreview() {
        const preview = document.getElementById('documentPreview');
        if (!preview) return;

        const borrowerName = document.getElementById('borrowerName')?.value || 'Valued Client';
        const propertyAddress = document.getElementById('propertyAddress')?.value || 'Property Address';
        const loanOfficer = document.getElementById('loanOfficerName')?.value || '';
        const company = document.getElementById('companyName')?.value || '';
        const contact = document.getElementById('contactInfo')?.value || '';
        const notes = document.getElementById('additionalNotes')?.value || '';

        const results = HECMCalculator.results || {};
        const scenarios = Object.keys(results).map(key => results[key]);

        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        let scenarioRows = '';
        scenarios.forEach((s, i) => {
            scenarioRows += `
                <tr>
                    <td><strong>${s.name || `Scenario ${i + 1}`}</strong><br><small style="color: #6b7280;">${s.programName || 'HECM Standard'}</small></td>
                    <td>${HECMCalculator.formatCurrency(s.maxClaimAmount)}</td>
                    <td>${HECMCalculator.formatCurrency(s.principalLimit)}</td>
                    <td>${HECMCalculator.formatCurrency(s.netPrincipalLimit)}</td>
                    <td>${HECMCalculator.formatCurrency(s.cashToBorrower)}</td>
                    <td>${HECMCalculator.formatCurrency(s.locAmount)}</td>
                    <td>${HECMCalculator.formatCurrency(s.monthlyPayment)}</td>
                    <td>${HECMCalculator.formatCurrency(s.totalClosingCosts)}</td>
                </tr>
            `;
        });

        preview.innerHTML = `
            <div class="doc-preview-content" style="font-family: Arial, sans-serif; padding: 20px; background: white; border: 1px solid #ddd; border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 15px;">
                    <h1 style="color: #2563eb; margin: 0;">HECM Reverse Mortgage Comparison</h1>
                    <p style="color: #666; margin: 5px 0;">Prepared for: <strong>${borrowerName}</strong></p>
                    <p style="color: #666; margin: 5px 0;">Property: ${propertyAddress}</p>
                    <p style="color: #666; margin: 5px 0;">Date: ${today}</p>
                </div>

                <h3 style="color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Comparison Summary</h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background: #f3f4f6;">
                                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Scenario / Program</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Max Claim</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Principal Limit</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Net Principal</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Cash at Close</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Line of Credit</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Monthly Distribution</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Closing Costs</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${scenarioRows}
                        </tbody>
                    </table>
                </div>

                <div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #1e40af;">Important HECM Information</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 13px;">
                        <li>HECM loans are available to homeowners 62 years and older</li>
                        <li>The loan balance grows over time as interest accrues</li>
                        <li>You retain ownership of your home and can live in it as long as you maintain it as your primary residence</li>
                        <li>The loan becomes due when you sell, move out, or pass away</li>
                        <li>You are still responsible for property taxes, insurance, and maintenance</li>
                        <li>HECMs are FHA-insured, protecting both you and the lender</li>
                    </ul>
                </div>

                ${notes ? `
                <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #92400e;">Additional Notes</h4>
                    <p style="margin: 0; color: #78350f; white-space: pre-wrap;">${notes}</p>
                </div>
                ` : ''}

                <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">
                    ${loanOfficer ? `<p style="margin: 5px 0;"><strong>Prepared by:</strong> ${loanOfficer}</p>` : ''}
                    ${company ? `<p style="margin: 5px 0;">${company}</p>` : ''}
                    ${contact ? `<p style="margin: 5px 0;">${contact}</p>` : ''}
                    <p style="margin: 15px 0 0 0; font-size: 11px; color: #9ca3af;">
                        This comparison is for informational purposes only and does not constitute a loan offer or commitment.
                        Actual loan terms may vary. Please consult with a HUD-approved HECM counselor before proceeding.
                    </p>
                </div>
            </div>
        `;
    },

    copyToClipboard() {
        const preview = document.getElementById('documentPreview');
        if (!preview) return;

        const range = document.createRange();
        range.selectNode(preview);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();

        SettingsManager.showSaveConfirmation('Document copied to clipboard!');
    },

    downloadHTML() {
        const preview = document.getElementById('documentPreview');
        if (!preview) return;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>HECM Comparison - ${document.getElementById('borrowerName')?.value || 'Client'}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                ${preview.innerHTML}
            </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HECM-Comparison-${new Date().toISOString().split('T')[0]}.html`;
        a.click();
        URL.revokeObjectURL(url);
    },

    printDocument() {
        const preview = document.getElementById('documentPreview');
        if (!preview) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>HECM Comparison</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { page-break-inside: avoid; }
                </style>
            </head>
            <body>
                ${preview.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
};

// Scenario Manager (Save/Load/Export/Import)
const ScenarioManager = {
    init() {
        document.getElementById('myScenariosBtn')?.addEventListener('click', () => this.openModal());
        document.getElementById('closeSavedModal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('savedScenariosOverlay')?.addEventListener('click', () => this.closeModal());
        document.getElementById('saveScenarioBtn')?.addEventListener('click', () => this.quickSave());
        document.getElementById('saveNewScenarioBtn')?.addEventListener('click', () => this.saveNewScenario());
        document.getElementById('exportDataBtn')?.addEventListener('click', () => this.exportData());
        document.getElementById('importDataInput')?.addEventListener('change', (e) => this.importData(e));
    },

    openModal() {
        document.getElementById('savedScenariosModal')?.classList.remove('hidden');
        document.getElementById('savedScenariosOverlay')?.classList.remove('hidden');
        this.loadSavedList();
    },

    closeModal() {
        document.getElementById('savedScenariosModal')?.classList.add('hidden');
        document.getElementById('savedScenariosOverlay')?.classList.add('hidden');
    },

    loadSavedList() {
        const list = document.getElementById('savedScenariosList');
        if (!list) return;

        const saved = JSON.parse(localStorage.getItem('hecmSavedScenarios') || '[]');

        if (saved.length === 0) {
            list.innerHTML = '<p class="no-scenarios">No saved scenarios yet.</p>';
            return;
        }

        list.innerHTML = saved.map((item, index) => `
            <div class="saved-scenario-item">
                <div class="scenario-info">
                    <strong>${item.name}</strong>
                    <small>${new Date(item.date).toLocaleDateString()}</small>
                </div>
                <div class="scenario-actions-btns">
                    <button class="btn-load" onclick="ScenarioManager.loadScenario(${index})">Load</button>
                    <button class="btn-delete" onclick="ScenarioManager.deleteScenario(${index})">Delete</button>
                </div>
            </div>
        `).join('');
    },

    quickSave() {
        const name = prompt('Enter a name for this scenario:');
        if (!name) return;
        this.saveScenario(name);
    },

    saveNewScenario() {
        const nameInput = document.getElementById('saveScenarioName');
        const name = nameInput?.value?.trim();
        if (!name) {
            alert('Please enter a name for the scenario.');
            return;
        }
        this.saveScenario(name);
        nameInput.value = '';
    },

    saveScenario(name) {
        const data = this.collectFormData();
        const saved = JSON.parse(localStorage.getItem('hecmSavedScenarios') || '[]');

        saved.push({
            name,
            date: new Date().toISOString(),
            data
        });

        localStorage.setItem('hecmSavedScenarios', JSON.stringify(saved));
        this.loadSavedList();
        SettingsManager.showSaveConfirmation('Scenario saved!');
    },

    loadScenario(index) {
        const saved = JSON.parse(localStorage.getItem('hecmSavedScenarios') || '[]');
        const scenario = saved[index];
        if (!scenario) return;

        this.applyFormData(scenario.data);
        this.closeModal();
        SettingsManager.showSaveConfirmation('Scenario loaded!');
    },

    deleteScenario(index) {
        if (!confirm('Are you sure you want to delete this scenario?')) return;

        const saved = JSON.parse(localStorage.getItem('hecmSavedScenarios') || '[]');
        saved.splice(index, 1);
        localStorage.setItem('hecmSavedScenarios', JSON.stringify(saved));
        this.loadSavedList();
    },

    collectFormData() {
        const scenarios = {};
        document.querySelectorAll('.loan-panel').forEach(panel => {
            const id = panel.dataset.panel;
            scenarios[id] = {
                scenarioName: panel.querySelector('.scenario-name')?.value || '',
                hecmType: panel.querySelector('.hecm-type-tab.active')?.dataset.type || 'fixed',
                loanProgram: panel.querySelector('.hecm-program-tabs .program-tab.active')?.dataset.program || 'hecm-standard',
                borrowerAge: panel.querySelector('.borrower-age')?.value || '70',
                spouseAge: panel.querySelector('.spouse-age')?.value || '',
                homeValue: panel.querySelector('.home-value')?.value || '450000',
                propertyType: panel.querySelector('.property-type')?.value || 'single-family',
                existingMortgage: panel.querySelector('.existing-mortgage')?.value || '0',
                interestRate: panel.querySelector('.interest-rate')?.value || '6.5',
                initialRate: panel.querySelector('.initial-rate')?.value || '5.5',
                margin: panel.querySelector('.margin')?.value || '2.0',
                lenderCredit: panel.querySelector('.lender-credit')?.value || '0',
                fhaLimit: panel.querySelector('.fha-limit')?.value || '1209750',
                plf: panel.querySelector('.plf')?.value || '52.4',
                paymentType: panel.querySelector(`input[name="payment-type-${id}"]:checked`)?.value || 'lump-sum',
                termMonths: panel.querySelector('.term-months')?.value || '120',
                thirdPartyCosts: panel.querySelector('.third-party-costs')?.value || '3500',
                // Set-asides
                lesaAmount: panel.querySelector('.lesa-amount')?.value || '0',
                serviceFeeSetaside: panel.querySelector('.service-fee-setaside')?.value || '0',
                repairsSetaside: panel.querySelector('.repairs-setaside')?.value || '0',
                counselingFee: panel.querySelector('.counseling-fee')?.value || '125',
                // Annual property charges
                annualTaxes: panel.querySelector('.annual-taxes')?.value || '0',
                annualInsurance: panel.querySelector('.annual-insurance')?.value || '0',
                annualHoa: panel.querySelector('.annual-hoa')?.value || '0',
                annualFlood: panel.querySelector('.annual-flood')?.value || '0',
                // Desired draw amounts
                desiredCashDraw: panel.querySelector('.desired-cash-draw')?.value || '0',
                desiredLocAmount: panel.querySelector('.desired-loc-amount')?.value || '0',
                useMaxAvailable: panel.querySelector('.use-max-available')?.checked ?? true
            };
        });
        return scenarios;
    },

    applyFormData(data) {
        Object.keys(data).forEach(id => {
            const panel = document.querySelector(`.loan-panel[data-panel="${id}"]`);
            if (!panel) return;

            const s = data[id];

            // Set values
            if (s.scenarioName) panel.querySelector('.scenario-name').value = s.scenarioName;
            if (s.borrowerAge) panel.querySelector('.borrower-age').value = s.borrowerAge;
            if (s.spouseAge) panel.querySelector('.spouse-age').value = s.spouseAge;
            if (s.homeValue) panel.querySelector('.home-value').value = s.homeValue;
            if (s.propertyType) panel.querySelector('.property-type').value = s.propertyType;
            if (s.existingMortgage) panel.querySelector('.existing-mortgage').value = s.existingMortgage;
            if (s.interestRate) panel.querySelector('.interest-rate').value = s.interestRate;
            if (s.initialRate) panel.querySelector('.initial-rate').value = s.initialRate;
            if (s.margin) panel.querySelector('.margin').value = s.margin;
            if (s.lenderCredit) panel.querySelector('.lender-credit').value = s.lenderCredit;
            if (s.fhaLimit) panel.querySelector('.fha-limit').value = s.fhaLimit;
            if (s.plf) panel.querySelector('.plf').value = s.plf;
            if (s.termMonths) panel.querySelector('.term-months').value = s.termMonths;
            if (s.thirdPartyCosts) panel.querySelector('.third-party-costs').value = s.thirdPartyCosts;

            // Set-asides
            if (s.lesaAmount) panel.querySelector('.lesa-amount').value = s.lesaAmount;
            if (s.serviceFeeSetaside) panel.querySelector('.service-fee-setaside').value = s.serviceFeeSetaside;
            if (s.repairsSetaside) panel.querySelector('.repairs-setaside').value = s.repairsSetaside;
            if (s.counselingFee) panel.querySelector('.counseling-fee').value = s.counselingFee;

            // Annual property charges
            if (s.annualTaxes) panel.querySelector('.annual-taxes').value = s.annualTaxes;
            if (s.annualInsurance) panel.querySelector('.annual-insurance').value = s.annualInsurance;
            if (s.annualHoa) panel.querySelector('.annual-hoa').value = s.annualHoa;
            if (s.annualFlood) panel.querySelector('.annual-flood').value = s.annualFlood;

            // Desired draw amounts
            if (s.desiredCashDraw) panel.querySelector('.desired-cash-draw').value = s.desiredCashDraw;
            if (s.desiredLocAmount) panel.querySelector('.desired-loc-amount').value = s.desiredLocAmount;
            const useMaxCheckbox = panel.querySelector('.use-max-available');
            if (useMaxCheckbox && s.useMaxAvailable !== undefined) useMaxCheckbox.checked = s.useMaxAvailable;

            // Set HECM type
            panel.querySelectorAll('.hecm-type-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.type === s.hecmType);
            });
            panel.querySelectorAll('.adjustable-only').forEach(el => {
                el.style.display = s.hecmType === 'adjustable' ? 'block' : 'none';
            });

            // Set loan program
            if (s.loanProgram) {
                panel.querySelectorAll('.hecm-program-tabs .program-tab').forEach(tab => {
                    tab.classList.toggle('active', tab.dataset.program === s.loanProgram);
                });
                // Update program description
                const programInfo = HECMCalculator.programDescriptions[s.loanProgram];
                const descEl = panel.querySelector('.program-description');
                if (descEl && programInfo) {
                    descEl.textContent = programInfo.description;
                    descEl.closest('.program-info')?.classList.remove('hidden');
                }
                // Handle FHA limit for proprietary
                const fhaLimitInput = panel.querySelector('.fha-limit');
                if (fhaLimitInput && s.loanProgram === 'proprietary') {
                    fhaLimitInput.removeAttribute('readonly');
                }
            }

            // Set payment type
            const paymentRadio = panel.querySelector(`input[name="payment-type-${id}"][value="${s.paymentType}"]`);
            if (paymentRadio) paymentRadio.checked = true;

            // Show/hide term input
            const termGroup = panel.querySelector('.term-period-group');
            if (termGroup) {
                termGroup.style.display = ['term', 'modified-term'].includes(s.paymentType) ? 'block' : 'none';
            }
        });
    },

    exportData() {
        const data = {
            type: 'hecm-scenarios',
            version: '1.0',
            date: new Date().toISOString(),
            scenarios: this.collectFormData(),
            results: HECMCalculator.results || {}
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HECM-Export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        SettingsManager.showSaveConfirmation('Data exported!');
    },

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.type !== 'hecm-scenarios') {
                    alert('Invalid file format. Please select a valid HECM export file.');
                    return;
                }
                this.applyFormData(data.scenarios);
                SettingsManager.showSaveConfirmation('Data imported!');
            } catch (err) {
                alert('Error reading file. Please make sure it\'s a valid JSON file.');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    }
};

// PLF Lookup Calculator
const PLFLookup = {
    // Approximate PLF values based on HUD tables (simplified interpolation)
    // Format: age -> { rate: plf }
    basePLFs: {
        62: { 5.0: 0.524, 5.5: 0.490, 6.0: 0.458, 6.5: 0.428, 7.0: 0.400, 7.5: 0.374, 8.0: 0.350 },
        65: { 5.0: 0.549, 5.5: 0.515, 6.0: 0.483, 6.5: 0.453, 7.0: 0.425, 7.5: 0.399, 8.0: 0.374 },
        70: { 5.0: 0.589, 5.5: 0.555, 6.0: 0.523, 6.5: 0.493, 7.0: 0.465, 7.5: 0.438, 8.0: 0.413 },
        75: { 5.0: 0.629, 5.5: 0.595, 6.0: 0.563, 6.5: 0.533, 7.0: 0.504, 7.5: 0.477, 8.0: 0.451 },
        80: { 5.0: 0.670, 5.5: 0.637, 6.0: 0.605, 6.5: 0.574, 7.0: 0.545, 7.5: 0.518, 8.0: 0.491 },
        85: { 5.0: 0.712, 5.5: 0.680, 6.0: 0.648, 6.5: 0.618, 7.0: 0.589, 7.5: 0.561, 8.0: 0.534 },
        90: { 5.0: 0.750, 5.5: 0.721, 6.0: 0.692, 6.5: 0.663, 7.0: 0.635, 7.5: 0.608, 8.0: 0.581 },
        95: { 5.0: 0.780, 5.5: 0.752, 6.0: 0.724, 6.5: 0.697, 7.0: 0.670, 7.5: 0.644, 8.0: 0.618 },
        99: { 5.0: 0.800, 5.5: 0.774, 6.0: 0.748, 6.5: 0.722, 7.0: 0.696, 7.5: 0.671, 8.0: 0.646 }
    },

    lookup(age, rate) {
        // Clamp age
        const minAge = 62;
        const maxAge = 99;
        age = Math.max(minAge, Math.min(maxAge, Math.round(age)));

        // Clamp rate
        rate = Math.max(5.0, Math.min(8.0, rate));

        // Find bounding ages
        const ages = Object.keys(this.basePLFs).map(Number).sort((a, b) => a - b);
        let lowerAge = ages[0], upperAge = ages[ages.length - 1];

        for (let i = 0; i < ages.length - 1; i++) {
            if (age >= ages[i] && age <= ages[i + 1]) {
                lowerAge = ages[i];
                upperAge = ages[i + 1];
                break;
            }
        }

        // Find bounding rates
        const rates = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0];
        let lowerRate = rates[0], upperRate = rates[rates.length - 1];

        for (let i = 0; i < rates.length - 1; i++) {
            if (rate >= rates[i] && rate <= rates[i + 1]) {
                lowerRate = rates[i];
                upperRate = rates[i + 1];
                break;
            }
        }

        // Bilinear interpolation
        const plfLowerAgeLowerRate = this.basePLFs[lowerAge][lowerRate];
        const plfLowerAgeUpperRate = this.basePLFs[lowerAge][upperRate];
        const plfUpperAgeLowerRate = this.basePLFs[upperAge][lowerRate];
        const plfUpperAgeUpperRate = this.basePLFs[upperAge][upperRate];

        // Interpolate by rate for lower age
        const rateFraction = (rate - lowerRate) / (upperRate - lowerRate || 1);
        const plfAtLowerAge = plfLowerAgeLowerRate + (plfLowerAgeUpperRate - plfLowerAgeLowerRate) * rateFraction;
        const plfAtUpperAge = plfUpperAgeLowerRate + (plfUpperAgeUpperRate - plfUpperAgeLowerRate) * rateFraction;

        // Interpolate by age
        const ageFraction = (age - lowerAge) / (upperAge - lowerAge || 1);
        const plf = plfAtLowerAge + (plfAtUpperAge - plfAtLowerAge) * ageFraction;

        return plf;
    },

    init() {
        const lookupBtn = document.getElementById('lookupPLF');
        const ageInput = document.getElementById('plf-age-input');
        const rateInput = document.getElementById('plf-rate-input');
        const plfValue = document.getElementById('plfValue');
        const plfExplanation = document.getElementById('plfExplanation');
        const resultSection = document.getElementById('plfResult');

        if (!lookupBtn) return;

        const performLookup = () => {
            const age = parseInt(ageInput.value) || 70;
            const rate = parseFloat(rateInput.value) || 7.0;

            if (age < 62) {
                plfValue.textContent = 'N/A';
                plfExplanation.innerHTML = '<p>Borrower must be at least 62 years old for a HECM.</p>';
                return;
            }

            const plf = this.lookup(age, rate);
            const plfPercent = (plf * 100).toFixed(1);
            plfValue.textContent = plfPercent + '%';

            // Calculate example
            const exampleHomeValue = 400000;
            const principalLimit = Math.round(exampleHomeValue * plf);

            // Update explanation
            plfExplanation.innerHTML = `
                <p>At age <strong>${age}</strong> with a <strong>${rate.toFixed(2)}%</strong> expected rate, you can access approximately <strong>${plfPercent}%</strong> of your home's value.</p>
            `;

            // Update example calculation
            const exampleEl = resultSection.querySelector('.plf-result-example');
            if (exampleEl) {
                exampleEl.innerHTML = `
                    <div class="plf-example-header">Example Calculation</div>
                    <div class="plf-example-row">
                        <span>Home Value:</span>
                        <span>$${exampleHomeValue.toLocaleString()}</span>
                    </div>
                    <div class="plf-example-row">
                        <span>PLF:</span>
                        <span>${plfPercent}%</span>
                    </div>
                    <div class="plf-example-row result">
                        <span>Gross Principal Limit:</span>
                        <span>$${principalLimit.toLocaleString()}</span>
                    </div>
                `;
            }
        };

        lookupBtn.addEventListener('click', performLookup);
        ageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performLookup(); });
        rateInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performLookup(); });

        // Initial lookup
        performLookup();
    }
};

// Tab Management
document.addEventListener('DOMContentLoaded', () => {
    // Initialize settings
    SettingsManager.init();
    DocumentGenerator.init();
    ScenarioManager.init();
    HECMChartManager.init();
    PLFLookup.init();

    // Scenario tabs
    const tabs = document.querySelectorAll('.loan-tab');
    const panels = document.querySelectorAll('.loan-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-loan')) return;

            const loanId = tab.dataset.loan;

            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            document.querySelector(`.loan-panel[data-panel="${loanId}"]`)?.classList.add('active');
        });
    });

    // HECM type tabs (Fixed/Adjustable)
    document.querySelectorAll('.hecm-type-tabs').forEach(container => {
        container.querySelectorAll('.hecm-type-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.hecm-type-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const panel = container.closest('.loan-panel');
                const isAdjustable = tab.dataset.type === 'adjustable';

                panel.querySelectorAll('.adjustable-only').forEach(el => {
                    el.style.display = isAdjustable ? 'block' : 'none';
                });

                // Fixed rate only allows lump sum
                if (tab.dataset.type === 'fixed') {
                    const lumpSumRadio = panel.querySelector('input[value="lump-sum"]');
                    if (lumpSumRadio) lumpSumRadio.checked = true;
                }
            });
        });
    });

    // HECM Loan Program tabs
    document.querySelectorAll('.hecm-program-tabs').forEach(container => {
        container.querySelectorAll('.program-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.program-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const panel = container.closest('.loan-panel');
                const programKey = tab.dataset.program;
                const programInfo = HECMCalculator.programDescriptions[programKey];

                // Update program description
                const descEl = panel.querySelector('.program-description');
                if (descEl && programInfo) {
                    descEl.textContent = programInfo.description;
                    descEl.closest('.program-info')?.classList.remove('hidden');
                }

                // Handle proprietary program specifics
                const fhaLimitInput = panel.querySelector('.fha-limit');
                const isProprietary = programKey === 'proprietary';

                if (fhaLimitInput) {
                    if (isProprietary) {
                        fhaLimitInput.removeAttribute('readonly');
                        fhaLimitInput.placeholder = 'No FHA limit';
                    } else {
                        fhaLimitInput.setAttribute('readonly', true);
                        fhaLimitInput.value = 1209750;
                    }
                }

                // Update helper text for proprietary
                const helperText = panel.querySelector('.fha-limit')?.closest('.form-group')?.querySelector('.helper-text');
                if (helperText) {
                    helperText.textContent = isProprietary ? 'No FHA limit for proprietary loans' : 'Current FHA maximum claim amount';
                }
            });
        });
    });

    // Payment type change - show/hide term input
    document.querySelectorAll('input[name^="payment-type-"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const panel = radio.closest('.loan-panel');
            const termGroup = panel.querySelector('.term-period-group');
            const showTerm = ['term', 'modified-term'].includes(radio.value);
            termGroup.style.display = showTerm ? 'block' : 'none';
        });
    });

    // "Use maximum available" checkbox toggle
    document.querySelectorAll('.use-max-available').forEach(checkbox => {
        const panel = checkbox.closest('.loan-panel');
        const cashDrawInput = panel?.querySelector('.desired-cash-draw');
        const locAmountInput = panel?.querySelector('.desired-loc-amount');

        const updateInputState = () => {
            const disabled = checkbox.checked;
            if (cashDrawInput) {
                cashDrawInput.disabled = disabled;
                cashDrawInput.style.opacity = disabled ? '0.5' : '1';
            }
            if (locAmountInput) {
                locAmountInput.disabled = disabled;
                locAmountInput.style.opacity = disabled ? '0.5' : '1';
            }
        };

        // Set initial state
        updateInputState();

        checkbox.addEventListener('change', updateInputState);
    });

    // Auto-calculate property taxes and insurance based on home value
    // Property tax default: 0.55% of appraised value
    // Insurance default: 0.265% of appraised value
    document.querySelectorAll('.loan-panel').forEach(panel => {
        const homeValueInput = panel.querySelector('.home-value');
        const taxesInput = panel.querySelector('.annual-taxes');
        const insuranceInput = panel.querySelector('.annual-insurance');
        const borrowerAgeInput = panel.querySelector('.borrower-age');
        const spouseAgeInput = panel.querySelector('.spouse-age');
        const interestRateInput = panel.querySelector('.interest-rate');
        const plfInput = panel.querySelector('.plf');

        // Track if user has manually edited the fields
        let taxesManuallyEdited = false;
        let insuranceManuallyEdited = false;
        let plfManuallyEdited = false;

        // Function to update defaults based on home value
        const updatePropertyDefaults = () => {
            const homeValue = parseFloat(homeValueInput?.value) || 0;

            if (homeValue > 0) {
                // Property taxes: 0.55% of appraised value
                if (!taxesManuallyEdited && taxesInput) {
                    const defaultTax = Math.round(homeValue * 0.0055);
                    taxesInput.value = defaultTax;
                }

                // Insurance: 0.265% of appraised value
                if (!insuranceManuallyEdited && insuranceInput) {
                    const defaultInsurance = Math.round(homeValue * 0.00265);
                    insuranceInput.value = defaultInsurance;
                }
            }
        };

        // Function to update PLF based on age and rate
        const updatePLF = () => {
            if (plfManuallyEdited) return;

            const borrowerAge = parseFloat(borrowerAgeInput?.value) || 70;
            const spouseAge = parseFloat(spouseAgeInput?.value) || 0;
            const rate = parseFloat(interestRateInput?.value) || 6.5;

            // Use youngest borrower's age (if spouse is on loan)
            const youngestAge = spouseAge > 0 ? Math.min(borrowerAge, spouseAge) : borrowerAge;

            if (youngestAge >= 62 && plfInput) {
                const plf = PLFLookup.lookup(youngestAge, rate);
                plfInput.value = (plf * 100).toFixed(1);
            }
        };

        // Home value change - update taxes, insurance
        homeValueInput?.addEventListener('input', updatePropertyDefaults);

        // Age and rate changes - update PLF
        borrowerAgeInput?.addEventListener('input', updatePLF);
        spouseAgeInput?.addEventListener('input', updatePLF);
        interestRateInput?.addEventListener('input', updatePLF);

        // Track manual edits
        taxesInput?.addEventListener('input', () => { taxesManuallyEdited = true; });
        insuranceInput?.addEventListener('input', () => { insuranceManuallyEdited = true; });
        plfInput?.addEventListener('input', () => { plfManuallyEdited = true; });

        // Reset manual edit flags when home value changes significantly
        homeValueInput?.addEventListener('change', () => {
            taxesManuallyEdited = false;
            insuranceManuallyEdited = false;
            updatePropertyDefaults();
        });

        // Initial calculation
        updatePropertyDefaults();
        updatePLF();
    });

    // Sticky tabs
    const tabsContainer = document.querySelector('.loan-tabs-container');
    if (tabsContainer) {
        const observer = new IntersectionObserver(
            ([entry]) => {
                tabsContainer.classList.toggle('sticky-active', entry.intersectionRatio < 1);
            },
            { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
        );
        observer.observe(tabsContainer);
    }

    // Print button
    document.getElementById('printHecmBtn')?.addEventListener('click', () => {
        window.print();
    });

    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to sign out?')) {
            window.location.href = 'login.html';
        }
    });

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            DocumentGenerator.closeModal();
            ScenarioManager.closeModal();
        }
    });
});
