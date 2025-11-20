
// BIN Database (simplified - in real app, use comprehensive BIN database)
const binDatabase = {
    '4': { type: 'Visa', country: 'Various' },
    '51': { type: 'Mastercard', country: 'Various' },
    '52': { type: 'Mastercard', country: 'Various' },
    '53': { type: 'Mastercard', country: 'Various' },
    '54': { type: 'Mastercard', country: 'Various' },
    '55': { type: 'Mastercard', country: 'Various' },
    '34': { type: 'American Express', country: 'USA' },
    '37': { type: 'American Express', country: 'USA' },
    '36': { type: 'Diners Club', country: 'Various' },
    '30': { type: 'Diners Club', country: 'Various' },
    '60': { type: 'Discover', country: 'USA' },
    '62': { type: 'UnionPay', country: 'China' },
    '35': { type: 'JCB', country: 'Japan' }
};

class CCChecker {
    constructor() {
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
        const cards = textarea.value.split('\n').filter(card => card.trim().length > 0);
        document.getElementById('cardCount').textContent = `${cards.length} cards`;
    }

    checkSingleCard() {
        const textarea = document.getElementById('ccNumbers');
        const cards = textarea.value.split('\n').filter(card => card.trim().length > 0);
        
        if (cards.length === 0) {
            this.showAlert('Please enter at least one credit card number.', 'warning');
            return;
        }

        this.validateCard(cards[0]);
    }

    checkBulkCards() {
        const textarea = document.getElementById('ccNumbers');
        const cards = textarea.value.split('\n')
            .filter(card => card.trim().length > 0)
            .slice(0, 100); // Limit to 100 cards

        if (cards.length === 0) {
            this.showAlert('Please enter credit card numbers to check.', 'warning');
            return;
        }

        this.showLoading(true);
        this.clearResults();

        // Simulate API delay for bulk processing
        setTimeout(() => {
            cards.forEach((card, index) => {
                setTimeout(() => {
                    this.validateCard(card);
                    if (index === cards.length - 1) {
                        this.showLoading(false);
                        this.updateStatistics();
                    }
                }, index * 100); // Stagger requests
            });
        }, 500);
    }

    validateCard(cardNumber) {
        const cleanNumber = cardNumber.replace(/\s/g, '');
        
        if (!this.isValidLength(cleanNumber)) {
            this.displayResult(cleanNumber, false, 'Invalid length');
            return;
        }

        const cardInfo = this.getCardInfo(cleanNumber);
        const isValid = this.luhnCheck(cleanNumber);

        this.displayResult(cleanNumber, isValid, cardInfo);
    }

    isValidLength(cardNumber) {
        const length = cardNumber.length;
        return length >= 13 && length <= 19;
    }

    luhnCheck(cardNumber) {
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

    getCardInfo(cardNumber) {
        // Get BIN information
        let binInfo = { type: 'Unknown', country: 'Unknown', bank: 'Unknown' };

        // Check BIN patterns
        for (const [prefix, info] of Object.entries(binDatabase)) {
            if (cardNumber.startsWith(prefix)) {
                binInfo = { ...info };
                break;
            }
        }

        // Enhanced country detection based on BIN ranges
        if (cardNumber.startsWith('4')) {
            binInfo.country = this.detectVisaCountry(cardNumber);
        } else if (cardNumber.startsWith('5')) {
            binInfo.country = this.detectMastercardCountry(cardNumber);
        }

        return binInfo;
    }

    detectVisaCountry(cardNumber) {
        // Simplified country detection - in real app, use comprehensive BIN database
        const firstSix = parseInt(cardNumber.substring(0, 6));
        if (firstSix >= 400000 && firstSix <= 499999) {
            return 'United States';
        }
        return 'Various Countries';
    }

    detectMastercardCountry(cardNumber) {
        const firstSix = parseInt(cardNumber.substring(0, 6));
        if (firstSix >= 510000 && firstSix <= 559999) {
            return 'United States';
        }
        return 'Various Countries';
    }

    displayResult(cardNumber, isValid, cardInfo) {
        const resultsContainer = document.getElementById('resultsContainer');
        const formattedNumber = this.formatCardNumber(cardNumber);
        
        const resultCard = document.createElement('div');
        resultCard.className = `result-card fade-in ${isValid ? 'result-valid' : 'result-invalid'}`;
        
        resultCard.innerHTML = `
            <div class="card-body p-3">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <strong class="${isValid ? 'text-success' : 'text-danger'}">
                            ${formattedNumber}
                        </strong>
                    </div>
                    <div class="col-md-2">
                        <span class="badge ${isValid ? 'bg-success' : 'bg-danger'}">
                            ${isValid ? 'VALID' : 'INVALID'}
                        </span>
                    </div>
                    <div class="col-md-2">
                        <small>Type: <strong>${cardInfo.type}</strong></small>
                    </div>
                    <div class="col-md-3">
                        <small>Country: <strong>${cardInfo.country}</strong></small>
                    </div>
                    <div class="col-md-2">
                        <small>Bank: <strong>${cardInfo.bank}</strong></small>
                    </div>
                </div>
                ${!isValid ? '<div class="text-danger mt-1"><small>❌ Failed validation check</small></div>' : ''}
            </div>
        `;

        resultsContainer.appendChild(resultCard);
    }

    formatCardNumber(cardNumber) {
        return cardNumber.replace(/(\d{4})/g, '$1 ').trim();
    }

    showLoading(show) {
        document.getElementById('loading').classList.toggle('d-none', !show);
    }

    clearResults() {
        document.getElementById('resultsContainer').innerHTML = '';
        this.resetStatistics();
    }

    clearAll() {
        document.getElementById('ccNumbers').value = '';
        this.clearResults();
        this.updateCardCount();
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

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${alertClass} alert-dismissible fade show mt-3`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CCChecker();
});

// Add some sample data for testing
document.addEventListener('DOMContentLoaded', () => {
    const sampleCards = [
        '4716325427975915', // Valid Visa
        '5111111111111118', // Valid Mastercard
        '371449635398431',  // Valid American Express
        '4111111111111111', // Valid Visa
        '1234567890123456', // Invalid
        '5555555555554444'  // Valid Mastercard
    ].join('\n');
    
    document.getElementById('ccNumbers').value = sampleCards;
    new CCChecker().updateCardCount();
});
