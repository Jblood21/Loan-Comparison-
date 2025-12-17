// HECM Reverse Mortgage Calculator
const HECMCalculator = {
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

        return {
            scenarioName: panel.querySelector('.scenario-name')?.value || `Scenario ${scenarioId}`,
            hecmType: hecmType,
            borrowerAge: parseFloat(panel.querySelector('.borrower-age')?.value) || 70,
            spouseAge: parseFloat(panel.querySelector('.spouse-age')?.value) || 0,
            homeValue: parseFloat(panel.querySelector('.home-value')?.value) || 0,
            propertyType: panel.querySelector('.property-type')?.value || 'single-family',
            existingMortgage: parseFloat(panel.querySelector('.existing-mortgage')?.value) || 0,
            interestRate: parseFloat(panel.querySelector('.interest-rate')?.value) || 6.5,
            initialRate: parseFloat(panel.querySelector('.initial-rate')?.value) || 5.5,
            margin: parseFloat(panel.querySelector('.margin')?.value) || 2.0,
            lenderCredit: parseFloat(panel.querySelector('.lender-credit')?.value) || 0,
            fhaLimit: parseFloat(panel.querySelector('.fha-limit')?.value) || 1149825,
            plf: parseFloat(panel.querySelector('.plf')?.value) || 52.4,
            paymentType: paymentType,
            termMonths: parseFloat(panel.querySelector('.term-months')?.value) || 120,
            thirdPartyCosts: parseFloat(panel.querySelector('.third-party-costs')?.value) || 3500
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

    // Calculate loan balance projection
    calculateBalanceProjection(initialBalance, rate, years) {
        // Balance grows at interest rate + 0.5% annual MIP
        const growthRate = (rate + 0.5) / 100;
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

        // Validate age
        if (data.borrowerAge < 62) {
            alert('Borrower must be at least 62 years old for a HECM.');
            return;
        }

        // Calculate Max Claim Amount
        const maxClaimAmount = Math.min(data.homeValue, data.fhaLimit);

        // Calculate Principal Limit
        const principalLimit = maxClaimAmount * (data.plf / 100);

        // Calculate costs
        const initialMIP = this.calculateInitialMIP(data.homeValue, data.fhaLimit);
        const originationFee = this.calculateOriginationFee(data.homeValue, data.fhaLimit) - data.lenderCredit;
        const totalClosingCosts = initialMIP + Math.max(0, originationFee) + data.thirdPartyCosts;

        // Calculate Net Principal Limit
        const netPrincipalLimit = principalLimit - totalClosingCosts - data.existingMortgage;

        // Calculate based on payment type
        let cashToBorrower = 0;
        let locAmount = 0;
        let monthlyPayment = 0;

        const effectiveRate = data.hecmType === 'adjustable' ? data.initialRate : data.interestRate;

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

        // Update form readonly fields
        const panel = document.querySelector(`.loan-panel[data-panel="${scenarioId}"]`);
        panel.querySelector('.initial-mip').value = Math.round(initialMIP);
        panel.querySelector('.origination-fee').value = Math.round(Math.max(0, originationFee));
        panel.querySelector('.total-closing-costs').value = Math.round(totalClosingCosts);

        // Display results
        document.getElementById(`max-claim-${scenarioId}`).textContent = this.formatCurrency(maxClaimAmount);
        document.getElementById(`principal-limit-${scenarioId}`).textContent = this.formatCurrency(principalLimit);
        document.getElementById(`net-principal-${scenarioId}`).textContent = this.formatCurrency(Math.max(0, netPrincipalLimit));
        document.getElementById(`cash-to-borrower-${scenarioId}`).textContent = this.formatCurrency(Math.max(0, cashToBorrower));
        document.getElementById(`loc-amount-${scenarioId}`).textContent = this.formatCurrency(Math.max(0, locAmount));
        document.getElementById(`monthly-payment-${scenarioId}`).textContent = this.formatCurrency(monthlyPayment);

        // LOC Growth projections
        if (locAmount > 0) {
            document.getElementById(`loc-year5-${scenarioId}`).textContent = this.formatCurrency(this.calculateLOCGrowth(locAmount, effectiveRate, 5));
            document.getElementById(`loc-year10-${scenarioId}`).textContent = this.formatCurrency(this.calculateLOCGrowth(locAmount, effectiveRate, 10));
            document.getElementById(`loc-year15-${scenarioId}`).textContent = this.formatCurrency(this.calculateLOCGrowth(locAmount, effectiveRate, 15));
            document.getElementById(`loc-year20-${scenarioId}`).textContent = this.formatCurrency(this.calculateLOCGrowth(locAmount, effectiveRate, 20));
        }

        // Balance projections (starting from total closing costs + existing mortgage payoff)
        const initialBalance = totalClosingCosts + data.existingMortgage;
        document.getElementById(`balance-year5-${scenarioId}`).textContent = this.formatCurrency(this.calculateBalanceProjection(initialBalance, effectiveRate, 5));
        document.getElementById(`balance-year10-${scenarioId}`).textContent = this.formatCurrency(this.calculateBalanceProjection(initialBalance, effectiveRate, 10));
        document.getElementById(`balance-year15-${scenarioId}`).textContent = this.formatCurrency(this.calculateBalanceProjection(initialBalance, effectiveRate, 15));
        document.getElementById(`balance-year20-${scenarioId}`).textContent = this.formatCurrency(this.calculateBalanceProjection(initialBalance, effectiveRate, 20));

        // Cost breakdown
        document.getElementById(`cost-mip-${scenarioId}`).textContent = this.formatCurrency(initialMIP);
        document.getElementById(`cost-origination-${scenarioId}`).textContent = this.formatCurrency(Math.max(0, originationFee));
        document.getElementById(`cost-third-party-${scenarioId}`).textContent = this.formatCurrency(data.thirdPartyCosts);
        document.getElementById(`cost-payoff-${scenarioId}`).textContent = this.formatCurrency(data.existingMortgage);
        document.getElementById(`cost-total-${scenarioId}`).textContent = this.formatCurrency(totalClosingCosts + data.existingMortgage);

        // Show results
        document.getElementById(`results-${scenarioId}`).style.display = 'block';

        // Store results for comparison
        this.results = this.results || {};
        this.results[scenarioId] = {
            name: data.scenarioName,
            maxClaimAmount,
            principalLimit,
            netPrincipalLimit: Math.max(0, netPrincipalLimit),
            cashToBorrower: Math.max(0, cashToBorrower),
            locAmount: Math.max(0, locAmount),
            monthlyPayment,
            totalClosingCosts,
            existingMortgage: data.existingMortgage,
            interestRate: data.interestRate,
            paymentType: data.paymentType
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
            { label: 'Max Claim Amount', key: 'maxClaimAmount' },
            { label: 'Principal Limit', key: 'principalLimit' },
            { label: 'Net Principal Limit', key: 'netPrincipalLimit' },
            { label: 'Cash to Borrower', key: 'cashToBorrower' },
            { label: 'Line of Credit', key: 'locAmount' },
            { label: 'Monthly Payment', key: 'monthlyPayment' },
            { label: 'Total Closing Costs', key: 'totalClosingCosts' },
            { label: 'Interest Rate', key: 'interestRate', isPercent: true }
        ];

        const tbody = document.getElementById('hecmComparisonBody');
        tbody.innerHTML = metrics.map(m => {
            const v1 = r1[m.key];
            const v2 = r2[m.key];
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

// Tab Management
document.addEventListener('DOMContentLoaded', () => {
    // Initialize settings
    SettingsManager.init();

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

    // Payment type change - show/hide term input
    document.querySelectorAll('input[name^="payment-type-"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const panel = radio.closest('.loan-panel');
            const termGroup = panel.querySelector('.term-period-group');
            const showTerm = ['term', 'modified-term'].includes(radio.value);
            termGroup.style.display = showTerm ? 'block' : 'none';
        });
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
});
