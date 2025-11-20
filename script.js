class UltimateCCChecker {
    constructor() {
        this.binService = window.binService;
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
            '5555555555554444|03|2028|321'
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
                    cvv: parts[3] || ''
                };
            });
    }

    async checkSingleCard() {
        const cards = this.parseInput(document.getElementById('ccNumbers').value);
        
        if (cards.length === 0) {
            alert('Please enter credit card data!');
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
            alert('Please enter credit card data!');
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
        alert(`Processed ${cards.length} cards successfully!`);
    }

    async validateCard(cardData) {
        const cleanNumber = cardData.number.replace(/\s/g, '');
        
        if (!this.isValidLength(cleanNumber)) {
            this.displayResult(cardData, false, await this.getFallbackInfo(cleanNumber), 'INVALID');
            return;
        }

        const isValid = this.luhnCheck(cleanNumber);
        let binInfo;

        try {
            const bin = cleanNumber.substring(0, 6);
            binInfo = await this.binService.lookupBIN(bin);
        } catch (error) {
            binInfo = await this.getFallbackInfo(cleanNumber);
        }

        this.displayResult(cardData, isValid, binInfo, isValid ? 'ACTIVE' : 'INVALID');
    }

    async getFallbackInfo(cardNumber) {
        const bin = cardNumber.substring(0, 6);
        return this.binService.getFallbackInfo(bin);
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
                <div class="card-number">${formattedNumber}</div>
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
                    <span class="detail-value">${binInfo.country.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Bank:</span>
                    <span class="detail-value">${binInfo.bank.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">City:</span>
                    <span class="detail-value">${binInfo.bank.city}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Expiry:</span>
                    <span class="detail-value">${cardData.month}/${cardData.year}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">CVV:</span>
                    <span class="detail-value">${cardData.cvv}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Currency:</span>
                    <span class="detail-value">${binInfo.country.currency}</span>
                </div>
            </div>
            
            <div class="mt-2 ${isValid ? 'text-success' : 'text-danger'}">
                <small>
                    <i class="fas ${isValid ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                    ${isValid ? 'Card passed all validation checks' : 'Card failed validation'}
                </small>
            </div>
        `;

        resultsContainer.appendChild(resultDiv);

        if (binInfo.country.name !== 'Unknown Country') {
            this.countries.add(binInfo.country.name);
        }
    }

    formatCardNumber(cardNumber) {
        return cardNumber.replace(/(\d{4})/g, '$1 ').trim();
    }

    showLoading(show) {
        document.getElementById('loading').classList.toggle('d-none', !show);
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
        alert('All fields cleared!');
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

        let csv = 'Card Number,Brand,Type,Country,City,Bank,Expiry,CVV,Status,Currency\n';
        
        results.forEach(result => {
            const cardNumber = result.querySelector('.card-number').textContent.replace(/\s/g, '');
            const details = result.querySelectorAll('.detail-item');
            
            const brand = details[0].querySelector('.detail-value').textContent;
            const type = details[1].querySelector('.detail-value').textContent;
            const country = details[2].querySelector('.detail-value').textContent;
            const bank = details[3].querySelector('.detail-value').textContent;
            const city = details[4].querySelector('.detail-value').textContent;
            const expiry = details[5].querySelector('.detail-value').textContent;
            const cvv = details[6].querySelector('.detail-value').textContent;
            const currency = details[7].querySelector('.detail-value').textContent;
            const status = result.classList.contains('result-valid') ? 'ACTIVE' : 'INVALID';

            csv += `"${cardNumber}","${brand}","${type}","${country}","${city}","${bank}","${expiry}","${cvv}","${status}","${currency}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cc-results-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        alert('CSV exported successfully!');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.ccChecker = new UltimateCCChecker();
});
