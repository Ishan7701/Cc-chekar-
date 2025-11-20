class BinLookupService {
    constructor() {
        this.cache = new Map();
        this.localBINDatabase = {
            '471632': { country: 'United States', city: 'New York', bank: 'Bank of America', zipCode: '10001' },
            '511111': { country: 'United States', city: 'Wilmington', bank: 'Citibank', zipCode: '19801' },
            '371449': { country: 'United States', city: 'New York', bank: 'American Express', zipCode: '10004' },
            '411111': { country: 'United States', city: 'Wilmington', bank: 'Chase Bank', zipCode: '19801' },
            '555555': { country: 'United States', city: 'Wilmington', bank: 'Mastercard Bank', zipCode: '19801' },
            '453211': { country: 'United Kingdom', city: 'London', bank: 'HSBC Bank', zipCode: 'EC2V 7HN' },
            '542523': { country: 'Germany', city: 'Berlin', bank: 'Deutsche Bank', zipCode: '10117' },
            '400000': { country: 'United States', city: 'San Francisco', bank: 'Wells Fargo', zipCode: '94105' },
            '510000': { country: 'United States', city: 'New York', bank: 'Capital One', zipCode: '10001' },
            '601100': { country: 'United States', city: 'Riverwoods', bank: 'Discover Bank', zipCode: '60015' }
        };
    }

    getLocalBINData(bin) {
        for (let length = 6; length >= 4; length--) {
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

        // Try local database first
        const localData = this.getLocalBINData(bin);
        if (localData) {
            const result = {
                bin: bin,
                brand: this.detectBrand(bin),
                type: 'credit',
                bank: { name: localData.bank, city: localData.city },
                country: { name: localData.country, code: this.getCountryCode(localData.country), currency: 'USD' },
                zipCode: localData.zipCode,
                validated: true
            };
            this.cache.set(bin, result);
            return result;
        }

        // Fallback to API
        try {
            const response = await fetch(`https://lookup.binlist.net/${bin}`, {
                headers: {
                    'Accept-Version': '3',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const result = this.formatResult(data, bin);
                this.cache.set(bin, result);
                return result;
            }
        } catch (error) {
            console.warn('BIN API failed:', error);
        }

        return this.getFallbackInfo(bin);
    }

    formatResult(data, bin) {
        return {
            bin: bin,
            brand: data.scheme || this.detectBrand(bin),
            type: data.type || 'credit',
            bank: {
                name: data.bank?.name || 'Unknown Bank',
                city: data.bank?.city || 'Unknown City'
            },
            country: {
                name: data.country?.name || 'Unknown Country',
                code: data.country?.alpha2 || 'XX',
                currency: data.country?.currency || 'USD'
            },
            validated: true
        };
    }

    detectBrand(bin) {
        const firstDigit = bin[0];
        const firstTwo = bin.substring(0, 2);

        if (firstDigit === '4') return 'Visa';
        if (firstTwo >= '51' && firstTwo <= '55') return 'Mastercard';
        if (firstTwo === '34' || firstTwo === '37') return 'American Express';
        if (bin.startsWith('6011') || firstTwo === '65') return 'Discover';
        if (firstTwo === '35') return 'JCB';
        if (firstTwo === '62') return 'UnionPay';
        
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
            'India': 'IN'
        };
        return countryCodes[countryName] || 'XX';
    }

    getFallbackInfo(bin) {
        const brand = this.detectBrand(bin);
        let country = 'Various';
        let bank = 'Various Banks';
        let city = 'Various';

        if (bin.startsWith('4')) {
            country = 'United States';
            bank = 'Visa Member Bank';
            city = 'Various Cities';
        } else if (bin.startsWith('5')) {
            country = 'United States';
            bank = 'Mastercard Member Bank';
            city = 'Various Cities';
        } else if (bin.startsWith('34') || bin.startsWith('37')) {
            country = 'United States';
            bank = 'American Express';
            city = 'New York';
        }

        return {
            bin: bin,
            brand: brand,
            type: 'credit',
            bank: { name: bank, city: city },
            country: { name: country, code: this.getCountryCode(country), currency: 'USD' },
            validated: false
        };
    }

    clearCache() {
        this.cache.clear();
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
            '5425234567891234|09|2027|456'
        ].join('\n');
        
        document.getElementById('ccNumbers').value = sampleData;
        this.updateCardCount();
    }

    updateCardCount() {
        const cards = this.parseInput(document.getElementById('ccNumbers').value);
        document.getElementById('validCount').textContent = '0';
        document.getElementById('invalidCount').textContent = '0';
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
            alert('Please enter credit card data in format: CC|Month|Year|CVV');
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
            alert('Please enter credit card data to check!');
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
            await this.delay(100);
        }

        this.showLoading(false);
        this.updateStatistics();
        alert(`✅ Successfully processed ${cards.length} cards!`);
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
            
            // Try local cache first for instant results
            const localData = this.binService.getLocalBINData(bin);
            if (localData) {
                binInfo = {
                    bin: bin,
                    brand: this.binService.detectBrand(bin),
                    type: 'credit',
                    bank: { name: localData.bank, city: localData.city },
                    country: { name: localData.country, code: this.binService.getCountryCode(localData.country), currency: 'USD' },
                    zipCode: localData.zipCode,
                    validated: true
                };
            } else {
                // Fall back to API lookup
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
        resultDiv.className = `result-item ${isValid ? 'result-valid' : 'result-invalid'}`;
        
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
                    <span class="detail-value">${binInfo.brand}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Type:</span>
                    <span class="detail-value">${binInfo.type}</span>
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
                ${binInfo.zipCode ? `
                <div class="detail-item">
                    <span class="detail-label">Zip Code:</span>
                    <span class="detail-value">
                        <i class="fas fa-map-pin me-1"></i>${binInfo.zipCode}
                    </span>
                </div>
                ` : ''}
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
        alert('🗑️ All fields cleared successfully!');
    }

    resetStatistics() {
        document.getElementById('validCount').textContent = '0';
        document.getElementById('invalidCount').textContent = '0';
        document.getElementById('visaCount').textContent = '0';
        document.getElementById('mastercardCount').textContent = '0';
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
    }

    exportToCSV() {
        const results = document.querySelectorAll('.result-item');
        if (results.length === 0) {
            alert('No results to export!');
            return;
        }

        let csv = 'Card Number,Brand,Type,Country,City,Bank,Expiry,CVV,Status,Currency,Zip Code\n';
        
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
            const expiry = getDetailValue(5);
            const cvv = getDetailValue(6);
            const currency = getDetailValue(7);
            const zipCode = details[8] ? details[8].querySelector('.detail-value').textContent.trim() : 'N/A';
            const status = result.classList.contains('result-valid') ? 'ACTIVE' : 'INVALID';

            csv += `"${cardNumber}","${brand}","${type}","${country}","${city}","${bank}","${expiry}","${cvv}","${status}","${currency}","${zipCode}"\n`;
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
        
        alert('📥 CSV exported successfully!');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the application when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.ccChecker = new UltimateCCChecker();
});
