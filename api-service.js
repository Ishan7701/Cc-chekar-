// Advanced BIN Lookup Service with Local Database
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
        // Check for exact 6-digit match first
        if (this.localBINDatabase[bin]) {
            return this.localBINDatabase[bin];
        }
        
        // Check for 4-5 digit prefixes
        for (let length = 5; length >= 4; length--) {
            const prefix = bin.substring(0, length);
            if (this.localBINDatabase[prefix]) {
                return this.localBINDatabase[prefix];
            }
        }
        
        return null;
    }

    async lookupBIN(bin) {
        // Check cache first
        if (this.cache.has(bin)) {
            return this.cache.get(bin);
        }

        // Try local database for instant results
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

        // Fallback to external API
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
            // Return fallback info if API fails
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

    // Clear cache method
    clearCache() {
        this.cache.clear();
    }

    // Get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            localDBSize: Object.keys(this.localBINDatabase).length
        };
    }
}

// Initialize global service instance
window.binService = new BinLookupService();
