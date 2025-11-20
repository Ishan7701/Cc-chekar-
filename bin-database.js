// Comprehensive BIN database for better detection
const binDatabase = {
    // Visa BIN ranges
    '4': { 
        type: 'Visa', 
        country: 'International',
        bank: 'Visa',
        pattern: '4'
    },
    '400000': { type: 'Visa', country: 'United States', bank: 'Chase Bank' },
    '411111': { type: 'Visa', country: 'United States', bank: 'Bank of America' },
    '422222': { type: 'Visa', country: 'United Kingdom', bank: 'Barclays' },
    '433333': { type: 'Visa', country: 'Canada', bank: 'Royal Bank' },
    '444433': { type: 'Visa', country: 'Australia', bank: 'Commonwealth Bank' },
    
    // Mastercard BIN ranges
    '51': { type: 'Mastercard', country: 'International', bank: 'Mastercard' },
    '52': { type: 'Mastercard', country: 'International', bank: 'Mastercard' },
    '53': { type: 'Mastercard', country: 'International', bank: 'Mastercard' },
    '54': { type: 'Mastercard', country: 'International', bank: 'Mastercard' },
    '55': { type: 'Mastercard', country: 'International', bank: 'Mastercard' },
    '510000': { type: 'Mastercard', country: 'United States', bank: 'Citibank' },
    '520000': { type: 'Mastercard', country: 'United Kingdom', bank: 'HSBC' },
    '530000': { type: 'Mastercard', country: 'Germany', bank: 'Deutsche Bank' },
    '540000': { type: 'Mastercard', country: 'France', bank: 'BNP Paribas' },
    '550000': { type: 'Mastercard', country: 'Japan', bank: 'Mitsubishi UFJ' },
    
    // American Express
    '34': { type: 'American Express', country: 'United States', bank: 'American Express' },
    '37': { type: 'American Express', country: 'United States', bank: 'American Express' },
    
    // Discover
    '6011': { type: 'Discover', country: 'United States', bank: 'Discover' },
    '65': { type: 'Discover', country: 'United States', bank: 'Discover' },
    
    // JCB
    '35': { type: 'JCB', country: 'Japan', bank: 'JCB' },
    
    // UnionPay
    '62': { type: 'UnionPay', country: 'China', bank: 'UnionPay' }
};

// Function to find BIN information
function getBINInfo(cardNumber) {
    if (!cardNumber || cardNumber.length < 6) {
        return { type: 'Unknown', country: 'Unknown', bank: 'Unknown' };
    }
    
    // Check for exact matches (longest first)
    const lengths = [6, 5, 4, 3, 2, 1];
    for (const length of lengths) {
        const prefix = cardNumber.substring(0, length);
        if (binDatabase[prefix]) {
            return { ...binDatabase[prefix] };
        }
    }
    
    // Default based on first digit
    const firstDigit = cardNumber[0];
    switch(firstDigit) {
        case '4': return { type: 'Visa', country: 'Various', bank: 'Various Banks' };
        case '5': return { type: 'Mastercard', country: 'Various', bank: 'Various Banks' };
        case '3': return { type: 'American Express', country: 'Various', bank: 'American Express' };
        case '6': return { type: 'Discover', country: 'Various', bank: 'Discover' };
        default: return { type: 'Unknown', country: 'Unknown', bank: 'Unknown' };
    }
}
