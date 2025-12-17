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
                    <td><strong>${s.name || `Scenario ${i + 1}`}</strong></td>
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
                                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Scenario</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Max Claim</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Principal Limit</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Net Principal</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Cash at Close</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Line of Credit</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Monthly Payment</th>
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
                borrowerAge: panel.querySelector('.borrower-age')?.value || '70',
                spouseAge: panel.querySelector('.spouse-age')?.value || '',
                homeValue: panel.querySelector('.home-value')?.value || '450000',
                propertyType: panel.querySelector('.property-type')?.value || 'single-family',
                existingMortgage: panel.querySelector('.existing-mortgage')?.value || '0',
                interestRate: panel.querySelector('.interest-rate')?.value || '6.5',
                initialRate: panel.querySelector('.initial-rate')?.value || '5.5',
                margin: panel.querySelector('.margin')?.value || '2.0',
                lenderCredit: panel.querySelector('.lender-credit')?.value || '0',
                plf: panel.querySelector('.plf')?.value || '52.4',
                paymentType: panel.querySelector(`input[name="payment-type-${id}"]:checked`)?.value || 'lump-sum',
                termMonths: panel.querySelector('.term-months')?.value || '120',
                thirdPartyCosts: panel.querySelector('.third-party-costs')?.value || '3500'
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
            if (s.plf) panel.querySelector('.plf').value = s.plf;
            if (s.termMonths) panel.querySelector('.term-months').value = s.termMonths;
            if (s.thirdPartyCosts) panel.querySelector('.third-party-costs').value = s.thirdPartyCosts;

            // Set HECM type
            panel.querySelectorAll('.hecm-type-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.type === s.hecmType);
            });
            panel.querySelectorAll('.adjustable-only').forEach(el => {
                el.style.display = s.hecmType === 'adjustable' ? 'block' : 'none';
            });

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

// Tab Management
document.addEventListener('DOMContentLoaded', () => {
    // Initialize settings
    SettingsManager.init();
    DocumentGenerator.init();
    ScenarioManager.init();

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

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            DocumentGenerator.closeModal();
            ScenarioManager.closeModal();
        }
    });
});
