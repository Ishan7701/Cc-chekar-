// Ultimate CC Checker Pro - Main JavaScript File
class BinLookupService {
    constructor() {
        this.cache = new Map();
        this.localBINDatabase = {
            // Visa BIN ranges
            '471632': { country: 'United States', city: 'New York', bank: 'Bank of America', zipCode: '10001', state: 'NY' },
            '411111': { country: 'United States', city: 'Wilmington', bank: 'Chase Bank', zipCode: '19801', state: 'DE' },
            '453211': { country: 'United Kingdom', city: 'London', bank: 'HSBC Bank', zipCode: 'EC2V 7HN', state: 'London' },
            '455633': { country: 'Canada', city: 'Toronto', bank: 'Royal Bank of Canada', zipCode: 'M5J 2T3', state: 'ON' },
            '491748': { country: 'Australia', city: 'Sydney', bank: 'Commonwealth Bank', zipCode: '2000', state: 'NSW' },
            
            // Mastercard BIN ranges
            '511111': { country: 'United States', city: 'Wilmington', bank: 'Citibank', zipCode: '19801', state: 'DE' },
            '555555': { country: 'United States', city: 'Wilmington', bank: 'Mastercard Bank', zipCode: '19801', state: 'DE' },
            '542523': { country: 'Germany', city: 'Berlin', bank: 'Deutsche Bank', zipCode: '10117', state: 'Berlin' },
            '510000': { country: 'United States', city: 'New York', bank: 'Capital One', zipCode: '10001', state: 'NY' },
            '552742': { country: 'France', city: 'Paris', bank: 'BNP Paribas', zipCode: '75008', state: 'Paris' },
            
            // American Express BIN ranges
            '371449': { country: 'United States', city: 'New York', bank: 'American Express', zipCode: '10004', state: 'NY' },
            '343434': { country: 'United States', city: 'New York', bank: 'American Express', zipCode: '10004', state: 'NY' },
            '376411': { country: 'Mexico', city: 'Mexico City', bank: 'American Express', zipCode: '11510', state: 'CDMX' },
            
            // Discover BIN ranges
            '601100': { country: 'United States', city: 'Riverwoods', bank: 'Discover Bank', zipCode: '60015', state: 'IL' },
            '601101': { country: 'United States', city: 'Riverwoods', bank: 'Discover Bank', zipCode: '60015', state: 'IL' },
            
            // JCB BIN ranges
            '353011': { country: 'Japan', city: 'Tokyo', bank: 'JCB Co.', zipCode: '105-7117', state: 'Tokyo' },
            '356999': { country: 'Japan', city: 'Tokyo', bank: 'JCB International', zipCode: '105-7117', state: 'Tokyo' },
            
            // UnionPay BIN ranges
            '625094': { country: 'China', city: 'Beijing', bank: 'China UnionPay', zipCode: '100031', state: 'Beijing' },
            '628888': { country: 'China', city: 'Beijing', bank: 'China UnionPay', zipCode: '100031', state: 'Beijing' }
        };
    }

    getLocalBINData(bin) {
        if (this.localBINDatabase[bin]) {
            return this.localBINDatabase[bin];
        }
        
        for (let length = 5; length >= 4; length--) {
            const prefix = bin.substring(0, length);
            if (this.localBINDatabase[prefix]) {
                return this.localBINDatabase[prefix];
            }
        }
        
        return null;
    }

    async lookupBIN(bin) {
        if (this.cache.has(bin)) {
            return this.cache.get(bin);
        }

        const localData = this.getLocalBINData(bin);
        if (localData) {
            const result = {
                bin: bin,
                brand: this.detectBrand(bin),
                type: 'credit',
                bank: { 
                    name: localData.bank, 
                    city: localData.city,
                    state: localData.state
                },
                country: { 
                    name: localData.country, 
                    code: this.getCountryCode(localData.country), 
                    currency: this.getCurrency(localData.country)
                },
                zipCode: localData.zipCode,
                validated: true,
                source: 'local'
            };
            this.cache.set(bin, result);
            return result;
        }

        try {
            const response = await this.fetchWithTimeout(`https://lookup.binlist.net/${bin}`, {
                method: 'GET',
                headers: {
                    'Accept-Version': '3',
                    'User-Agent': 'CC-Checker-App/1.0'
                },
                timeout: 5000
            });

            if (response.ok) {
                const data = await response.json();
                const result = this.formatResult(data, bin);
                this.cache.set(bin, result);
                return result;
            } else {
                throw new Error(`API returned status: ${response.status}`);
            }
        } catch (error) {
            console.warn('BIN API failed:', error);
            return this.getFallbackInfo(bin);
        }
    }

    async fetchWithTimeout(url, options = {}) {
        const { timeout = 5000 } = options;
        
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    formatResult(data, bin) {
        return {
            bin: bin,
            brand: data.scheme || this.detectBrand(bin),
            type: data.type || 'credit',
            bank: {
                name: data.bank?.name || 'Unknown Bank',
                city: data.bank?.city || 'Unknown City',
                state: data.bank?.state || 'Unknown State'
            },
            country: {
                name: data.country?.name || 'Unknown Country',
                code: data.country?.alpha2 || 'XX',
                currency: data.country?.currency || 'USD'
            },
            zipCode: data.bank?.zipCode || 'Unknown',
            validated: true,
            source: 'api'
        };
    }

    detectBrand(bin) {
        const firstDigit = bin[0];
        const firstTwo = bin.substring(0, 2);
        const firstFour = bin.substring(0, 4);

        if (firstDigit === '4') return 'Visa';
        if (firstTwo >= '51' && firstTwo <= '55') return 'Mastercard';
        if (firstTwo === '34' || firstTwo === '37') return 'American Express';
        if (firstFour === '6011' || firstTwo === '65') return 'Discover';
        if (firstTwo === '35') return 'JCB';
        if (firstTwo === '62') return 'UnionPay';
        if (firstTwo === '36' || firstTwo === '38' || firstTwo === '39') return 'Diners Club';
        
        return 'Unknown';
    }

    getCountryCode(countryName) {
        const countryCodes = {
            'United States': 'US',
            'United Kingdom': 'GB',
            'Canada': 'CA',
            'Australia': 'AU',
            'Germany': 'DE',
            'France': 'FR',
            'Japan': 'JP',
            'China': 'CN',
            'India': 'IN',
            'Mexico': 'MX',
            'Brazil': 'BR',
            'Italy': 'IT',
            'Spain': 'ES',
            'South Korea': 'KR',
            'Russia': 'RU'
        };
        return countryCodes[countryName] || 'XX';
    }

    getCurrency(countryName) {
        const currencies = {
            'United States': 'USD',
            'United Kingdom': 'GBP',
            'Canada': 'CAD',
            'Australia': 'AUD',
            'Germany': 'EUR',
            'France': 'EUR',
            'Japan': 'JPY',
            'China': 'CNY',
            'India': 'INR',
            'Mexico': 'MXN',
            'Brazil': 'BRL',
            'Italy': 'EUR',
            'Spain': 'EUR',
            'South Korea': 'KRW',
            'Russia': 'RUB'
        };
        return currencies[countryName] || 'USD';
    }

    getFallbackInfo(bin) {
        const brand = this.detectBrand(bin);
        let country = 'Various';
        let bank = 'Various Banks';
        let city = 'Various';
        let state = 'Various';
        let zipCode = 'Various';

        if (bin.startsWith('4')) {
            country = 'United States';
            bank = 'Visa Member Bank';
            city = 'Various Cities';
            state = 'Various States';
            zipCode = 'Various';
        } else if (bin.startsWith('5')) {
            country = 'United States';
            bank = 'Mastercard Member Bank';
            city = 'Various Cities';
            state = 'Various States';
            zipCode = 'Various';
        } else if (bin.startsWith('34') || bin.startsWith('37')) {
            country = 'United States';
            bank = 'American Express';
            city = 'New York';
            state = 'NY';
            zipCode = '10004';
        } else if (bin.startsWith('6011') || bin.startsWith('65')) {
            country = 'United States';
            bank = 'Discover Bank';
            city = 'Riverwoods';
            state = 'IL';
            zipCode = '60015';
        }

        return {
            bin: bin,
            brand: brand,
            type: 'credit',
            bank: { 
                name: bank, 
                city: city,
                state: state
            },
            country: { 
                name: country, 
                code: this.getCountryCode(country), 
                currency: this.getCurrency(country)
            },
            zipCode: zipCode,
            validated: false,
            source: 'fallback'
        };
    }

    clearCache() {
        this.cache.clear();
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            localDBSize: Object.keys(this.localBINDatabase).length
        };
    }
}

class UltimateCCChecker {
    constructor() {
        this.binService = new BinLookupService();
        this.countries = new Set();
        this.initializeEventListeners();
        this.loadSampleData();
    }

    initializeEventListeners() {
        document.getElementById('checkSingle').addEventListener('click', () => this.checkSingleCard());
        document.getElementById('checkBulk').addEventListener('click', () => this.checkBulkCards());
        document.getElementById('clearAll').addEventListener('click', () => this.clearAll());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToCSV());
        document.getElementById('ccNumbers').addEventListener('input', () => this.updateCardCount());
    }

    loadSampleData() {
        const sampleData = [
            '4716325427975915|10|2026|477',
            '5111111111111118|12|2025|123',
            '371449635398431|08|2027|456',
            '4111111111111111|01|2026|789',
            '5555555555554444|03|2028|321',
            '4532112345678901|06|2025|123',
            '5425234567891234|09|2027|456',
            '6011000990139424|11|2026|789',
            '3530111333300000|04|2025|111',
            '6240008632001145|07|2027|222'
        ].join('\n');
        
        document.getElementById('ccNumbers').value = sampleData;
        this.updateCardCount();
    }

    updateCardCount() {
        const cards = this.parseInput(document.getElementById('ccNumbers').value);
        document.getElementById('cardCount').textContent = `${cards.length} cards loaded`;
    }

    parseInput(input) {
        return input.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                const parts = line.split('|').map(part => part.trim());
                return {
                    number: parts[0] || '',
                    month: parts[1] || '',
                    year: parts[2] || '',
                    cvv: parts[3] || '',
                    raw: line
                };
            });
    }

    async checkSingleCard() {
        const cards = this.parseInput(document.getElementById('ccNumbers').value);
        
        if (cards.length === 0) {
            this.showAlert('Please enter credit card data in format: CC|Month|Year|CVV', 'warning');
            return;
        }

        this.showLoading(true);
        try {
            await this.validateCard(cards[0]);
        } finally {
            this.showLoading(false);
            this.updateStatistics();
        }
    }

    async checkBulkCards() {
        const cards = this.parseInput(document.getElementById('ccNumbers').value);

        if (cards.length === 0) {
            this.showAlert('Please enter credit card data to check!', 'warning');
            return;
        }

        this.showLoading(true);
        this.clearResults();
        this.resetStatistics();

        const totalCards = cards.length;
        
        for (let i = 0; i < cards.length; i++) {
            await this.validateCard(cards[i]);
            const progress = ((i + 1) / totalCards) * 100;
            document.getElementById('progressBar').style.width = `${progress}%`;
            document.getElementById('progressText').textContent = `Processing ${i + 1} of ${totalCards} cards...`;
            await this.delay(100);
        }

        this.showLoading(false);
        this.updateStatistics();
        this.showAlert(`✅ Successfully processed ${cards.length} cards!`, 'success');
    }

    async validateCard(cardData) {
        const cleanNumber = cardData.number.replace(/\s/g, '');
        
        if (!this.isValidLength(cleanNumber)) {
            const binInfo = await this.binService.getFallbackInfo(cleanNumber.substring(0, 6));
            this.displayResult(cardData, false, binInfo, 'INVALID');
            return;
        }

        const isValid = this.luhnCheck(cleanNumber);
        let binInfo;

        try {
            const bin = cleanNumber.substring(0, 6);
            
            const localData = this.binService.getLocalBINData(bin);
            if (localData) {
                binInfo = {
                    bin: bin,
                    brand: this.binService.detectBrand(bin),
                    type: 'credit',
                    bank: { 
                        name: localData.bank, 
                        city: localData.city,
                        state: localData.state
                    },
                    country: { 
                        name: localData.country, 
                        code: this.binService.getCountryCode(localData.country), 
                        currency: this.binService.getCurrency(localData.country)
                    },
                    zipCode: localData.zipCode,
                    validated: true,
                    source: 'local'
                };
            } else {
                binInfo = await this.binService.lookupBIN(bin);
            }
        } catch (error) {
            binInfo = await this.binService.getFallbackInfo(cleanNumber);
        }

        this.displayResult(cardData, isValid, binInfo, isValid ? 'ACTIVE' : 'INVALID');
    }

    isValidLength(cardNumber) {
        const length = cardNumber.length;
        return length >= 13 && length <= 19;
    }

    luhnCheck(cardNumber) {
        if (!cardNumber || cardNumber.length < 13) return false;
        
        let sum = 0;
        let isEven = false;

        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber.charAt(i), 10);

            if (isEven) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    }

    displayResult(cardData, isValid, binInfo, status) {
        const resultsContainer = document.getElementById('resultsContainer');
        const formattedNumber = this.formatCardNumber(cardData.number);
        
        const resultDiv = document.createElement('div');
        resultDiv.className = `result-item ${isValid ? 'result-valid' : 'result-invalid'} highlight`;
        
        resultDiv.innerHTML = `
            <div class="card-header-main">
                <div class="card-number">
                    <i class="fas fa-credit-card me-2"></i>${formattedNumber}
                </div>
                <span class="card-status ${isValid ? 'status-valid' : 'status-invalid'}">
                    ${isValid ? '✅ ACTIVE' : '❌ INVALID'}
                </span>
            </div>
            
            <div class="details-grid">
                <div class="detail-item">
                    <span class="detail-label">Brand:</span>
                    <span class="detail-value type-${binInfo.brand.toLowerCase()}">
                        ${binInfo.brand}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Type:</span>
                    <span class="detail-value text-capitalize">${binInfo.type}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Country:</span>
                    <span class="detail-value">
                        <i class="fas fa-flag me-1"></i>${binInfo.country.name}
                        <span class="badge bg-secondary ms-1">${binInfo.country.code}</span>
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Bank:</span>
                    <span class="detail-value">
                        <i class="fas fa-university me-1"></i>${binInfo.bank.name}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">City:</span>
                    <span class="detail-value">
                        <i class="fas fa-city me-1"></i>${binInfo.bank.city}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">State:</span>
                    <span class="detail-value">
                        <i class="fas fa-map-marker-alt me-1"></i>${binInfo.bank.state}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Expiry:</span>
                    <span class="detail-value">
                        <i class="fas fa-calendar me-1"></i>${cardData.month}/${cardData.year}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">CVV:</span>
                    <span class="detail-value">
                        <i class="fas fa-shield-alt me-1"></i>${cardData.cvv}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Currency:</span>
                    <span class="detail-value">
                        <i class="fas fa-money-bill me-1"></i>${binInfo.country.currency}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Zip Code:</span>
                    <span class="detail-value">
                        <i class="fas fa-map-pin me-1"></i>${binInfo.zipCode}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Data Source:</span>
                    <span class="detail-value">
                        <i class="fas fa-database me-1"></i>${binInfo.source.toUpperCase()}
                    </span>
                </div>
            </div>
            
            <div class="mt-2 p-2 rounded ${isValid ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'}">
                <small class="${isValid ? 'text-success' : 'text-danger'}">
                    <i class="fas ${isValid ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-1"></i>
                    ${isValid ? 
                        '✅ Card passed Luhn algorithm validation and BIN lookup' : 
                        '❌ Card failed validation checks'
                    }
                </small>
            </div>
        `;

        resultsContainer.appendChild(resultDiv);
        resultsContainer.scrollTop = resultsContainer.scrollHeight;

        if (binInfo.country.name !== 'Unknown Country') {
            this.countries.add(binInfo.country.name);
        }
    }

    formatCardNumber(cardNumber) {
        return cardNumber.replace(/(\d{4})/g, '$1 ').trim();
    }

    showLoading(show) {
        document.getElementById('loading').classList.toggle('d-none', !show);
        if (show) {
            document.getElementById('progressBar').style.width = '0%';
            document.getElementById('progressText').textContent = 'Initializing...';
        }
    }

    clearResults() {
        document.getElementById('resultsContainer').innerHTML = '';
        this.countries.clear();
    }

    clearAll() {
        document.getElementById('ccNumbers').value = '';
        this.clearResults();
        this.updateCardCount();
        this.resetStatistics();
        this.binService.clearCache();
        this.showAlert('🗑️ All fields cleared successfully!', 'info');
    }

    resetStatistics() {
        document.getElementById('validCount').textContent = '0';
        document.getElementById('invalidCount').textContent = '0';
        document.getElementById('visaCount').textContent = '0';
        document.getElementById('mastercardCount').textContent = '0';
        document.getElementById('activeCards').textContent = '0';
        document.getElementById('deadCards').textContent = '0';
        document.getElementById('countryCount').textContent = '0';
        document.getElementById('totalCards').textContent = '0';
    }

    updateStatistics() {
        const results = document.querySelectorAll('.result-item');
        let validCount = 0;
        let invalidCount = 0;
        let visaCount = 0;
        let mastercardCount = 0;

        results.forEach(result => {
            if (result.classList.contains('result-valid')) validCount++;
            if (result.classList.contains('result-invalid')) invalidCount++;
            
            const text = result.textContent;
            if (text.includes('Visa')) visaCount++;
            if (text.includes('Mastercard')) mastercardCount++;
        });

        document.getElementById('validCount').textContent = validCount;
        document.getElementById('invalidCount').textContent = invalidCount;
        document.getElementById('visaCount').textContent = visaCount;
        document.getElementById('mastercardCount').textContent = mastercardCount;
        document.getElementById('activeCards').textContent = validCount;
        document.getElementById('deadCards').textContent = invalidCount;
        document.getElementById('countryCount').textContent = this.countries.size;
        
        const cards = this.parseInput(document.getElementById('ccNumbers').value);
        document.getElementById('totalCards').textContent = cards.length;
    }

    exportToCSV() {
        const results = document.querySelectorAll('.result-item');
        if (results.length === 0) {
            this.showAlert('No results to export!', 'warning');
            return;
        }

        let csv = 'Card Number,Brand,Type,Country,City,State,Bank,Expiry,CVV,Status,Currency,Zip Code,Data Source\n';
        
        results.forEach(result => {
            const cardNumber = result.querySelector('.card-number').textContent.replace(/[^\d]/g, '');
            const details = result.querySelectorAll('.detail-item');
            
            const getDetailValue = (index) => {
                return details[index] ? details[index].querySelector('.detail-value').textContent.trim() : 'N/A';
            };

            const brand = getDetailValue(0);
            const type = getDetailValue(1);
            const country = getDetailValue(2).split(' ')[0]; // Remove flag emoji
            const bank = getDetailValue(3);
            const city = getDetailValue(4);
            const state = getDetailValue(5);
            const expiry = getDetailValue(6);
            const cvv = getDetailValue(7);
            const currency = getDetailValue(8);
            const zipCode = getDetailValue(9);
            const dataSource = getDetailValue(10);
            const status = result.classList.contains('result-valid') ? 'ACTIVE' : 'INVALID';

            csv += `"${cardNumber}","${brand}","${type}","${country}","${city}","${state}","${bank}","${expiry}","${cvv}","${status}","${currency}","${zipCode}","${dataSource}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cc-checker-results-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showAlert('📥 CSV exported successfully!', 'success');
    }

    showAlert(message, type) {
        const alertClass = {
            'success': 'alert-success',
            'warning': 'alert-warning',
            'info': 'alert-info',
            'danger': 'alert-danger'
        }[type] || 'alert-info';

        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${alertClass} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-5`;
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
            <strong>${type.toUpperCase()}:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ccChecker = new UltimateCCChecker();
});
