class SmartCCChecker {
    constructor() {
        this.checkedCards = new Set();
        this.initializeEventListeners();
        this.updateCardCount();
    }

    initializeEventListeners() {
        document.getElementById('checkSingle').addEventListener('click', () => this.checkSingleCard());
        document.getElementById('checkBulk').addEventListener('click', () => this.checkBulkCards());
        document.getElementById('clearAll').addEventListener('click', () => this.clearAll());
        document.getElementById('ccNumbers').addEventListener('input', () => this.updateCardCount());
    }

    updateCardCount() {
        const textarea = document.getElementById('ccNumbers');
        const cards = this.parseInput(textarea.value);
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
                    cvv: parts[3] || ''
                };
            });
    }

    checkSingleCard() {
        const textarea = document.getElementById('ccNumbers');
        const cards = this.parseInput(textarea.value);
        
        if (cards.length === 0) {
            this.showAlert('Please enter credit card data in format: CC|Month|Year|CVV', 'warning');
            return;
        }

        this.validateCard(cards[0]);
    }

    checkBulkCards() {
        const textarea = document.getElementById('ccNumbers');
        const cards = this.parseInput(textarea.value);

        if (cards.length === 0) {
            this.showAlert('Please enter credit card data to check.', 'warning');
            return;
        }

        this.showLoading(true);
        this.clearResults();
        this.resetStatistics();

        const totalCards = cards.length;
        let processed = 0;

        cards.forEach((card, index) => {
            setTimeout(() => {
                this.validateCard(card);
                processed++;
                
                // Update progress
                const progress = (processed / totalCards) * 100;
                document.getElementById('progressBar').style.width = `${progress}%`;
                
                if (processed === totalCards) {
                    setTimeout(() => {
                        this.showLoading(false);
                        this.updateStatistics();
                    }, 500);
                }
            }, index * 150);
        });
    }

    validateCard(cardData) {
        const cleanNumber = cardData.number.replace(/\s/g, '');
        
        if (!this.isValidLength(cleanNumber)) {
            this.displayResult(cardData, false, 'Invalid length');
            return;
        }

        const cardInfo = getBINInfo(cleanNumber);
        const isValid = this.luhnCheck(cleanNumber);
        const status = isValid ? 'ACTIVE' : 'INVALID';

        this.displayResult(cardData, isValid, cardInfo, status);
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
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    }

    displayResult(cardData, isValid, cardInfo, status) {
        const resultsContainer = document.getElementById('resultsContainer');
        const formattedNumber = this.formatCardNumber(cardData.number);
        
        const resultCard = document.createElement('div');
        resultCard.className = `result-card fade-in ${isValid ? 'result-valid' : 'result-invalid'}`;
        
        const typeClass = `type-${cardInfo.type.toLowerCase().replace(' ', '')}`;
        
        resultCard.innerHTML = `
            <div class="card-header-main">
                <div class="card-number">${formattedNumber}</div>
                <span class="card-status ${isValid ? 'status-valid' : 'status-invalid'}">
                    ${isValid ? '✅ VALID' : '❌ INVALID'}
                </span>
            </div>
            
            <div class="details-grid">
                <div class="detail-item">
                    <span class="detail-label">Type:</span>
                    <span class="detail-value ${typeClass}"><strong>${cardInfo.type}</strong></span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Country:</span>
                    <span class="detail-value">${cardInfo.country}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Bank:</span>
                    <span class="detail-value">${cardInfo.bank}</span>
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
                    <span class="detail-label">Status:</span>
                    <span class="detail-value ${isValid ? 'text-success' : 'text-danger'}">
                        <strong>${status}</strong>
                    </span>
                </div>
            </div>
            
            ${!isValid ? 
                '<div class="mt-2 text-danger"><small>❌ Failed Luhn algorithm validation</small></div>' : 
                '<div class="mt-2 text-success"><small>✅ Passed all validation checks</small></div>'
            }
        `;

        resultsContainer.appendChild(resultCard);
        resultsContainer.scrollTop = resultsContainer.scrollHeight;
    }

    formatCardNumber(cardNumber) {
        return cardNumber.replace(/(\d{4})/g, '$1 ').trim();
    }

    showLoading(show) {
        document.getElementById('loading').classList.toggle('d-none', !show);
    }

    clearResults() {
        document.getElementById('resultsContainer').innerHTML = '';
    }

    clearAll() {
        document.getElementById('ccNumbers').value = '';
        this.clearResults();
        this.updateCardCount();
        this.resetStatistics();
        this.showAlert('All fields cleared successfully.', 'info');
    }

    resetStatistics() {
        document.getElementById('validCount').textContent = '0';
        document.getElementById('invalidCount').textContent = '0';
        document.getElementById('visaCount').textContent = '0';
        document.getElementById('mastercardCount').textContent = '0';
    }

    updateStatistics() {
        const results = document.querySelectorAll('.result-card');
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

    showAlert(message, type) {
        const alertClass = {
            'success': 'alert-success',
            'warning': 'alert-warning',
            'info': 'alert-info',
            'danger': 'alert-danger'
        }[type] || 'alert-info';

        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${alertClass} alert-dismissible fade show mt-3`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);

        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Initialize application with sample data
document.addEventListener('DOMContentLoaded', () => {
    const sampleData = [
        '4716325427975915|10|2026|477',
        '5111111111111118|12|2025|123',
        '371449635398431|08|2027|456',
        '4111111111111111|01|2026|789',
        '5555555555554444|03|2028|321'
    ].join('\n');
    
    document.getElementById('ccNumbers').value = sampleData;
    new SmartCCChecker();
});
