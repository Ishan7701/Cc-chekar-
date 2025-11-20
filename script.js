function validateCC() {
    // Get the input value and remove any spaces
    let ccNumber = document.getElementById('ccNumber').value.replace(/\s/g, '');
    let resultDiv = document.getElementById('result');

    // Basic check to see if the input is empty or contains non-digits
    if (ccNumber === '') {
        showResult('Please enter a credit card number.', 'w3-red');
        return;
    }
    if (!/^\d+$/.test(ccNumber)) {
        showResult('Credit card number can only contain digits.', 'w3-red');
        return;
    }

    // Determine the card type based on the starting digits
    let cardType = getCardType(ccNumber);
    
    // Validate the number using the Luhn algorithm
    let isValid = luhnCheck(ccNumber);

    // Prepare the result message
    let resultHTML = `<strong>Number:</strong> ${formatCCNumber(ccNumber)}<br>`;
    resultHTML += `<strong>Type:</strong> ${cardType}<br>`;
    resultHTML += `<strong>Validation:</strong> `;

    if (isValid) {
        resultHTML += `<span class="w3-text-green"><strong>Valid (Passed Luhn Check)</strong></span>`;
        showResult(resultHTML, 'w3-pale-green');
    } else {
        resultHTML += `<span class="w3-text-red"><strong>Invalid (Failed Luhn Check)</strong></span>`;
        showResult(resultHTML, 'w3-pale-red');
    }
}

// The Luhn Algorithm for checksum validation
function luhnCheck(ccNumber) {
    let sum = 0;
    let shouldDouble = false;
    // Loop through the number from right to left
    for (let i = ccNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(ccNumber[i]);
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
}

// Identify the card network/type using the BIN (first few digits)
function getCardType(ccNumber) {
    let firstDigit = ccNumber[0];
    let firstTwo = ccNumber.substring(0, 2);
    let firstFour = ccNumber.substring(0, 4);

    // Visa
    if (firstDigit === '4') return 'Visa';
    // Mastercard
    if (firstTwo >= '51' && firstTwo <= '55') return 'Mastercard';
    // American Express
    if (firstTwo === '34' || firstTwo === '37') return 'American Express';
    // Discover
    if (ccNumber.startsWith('6011') || firstTwo === '65' || (firstThree >= '644' && firstThree <= '649')) return 'Discover';
    // Other types can be added here as needed

    return 'Unknown';
}

// A helper function to format the number with spaces (e.g., 4111 1111 1111 1111)
function formatCCNumber(ccNumber) {
    return ccNumber.replace(/(.{4})/g, '$1 ').trim();
}

// A helper function to display the results in the designated area
function showResult(content, colorClass) {
    let resultDiv = document.getElementById('result');
    resultDiv.innerHTML = content;
    resultDiv.className = `w3-container w3-panel w3-padding ${colorClass} result-panel`;
    resultDiv.style.display = 'block';
}
