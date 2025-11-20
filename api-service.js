class BinLookupService {
    constructor() {
        this.cache = new Map();
    }

    async lookupBIN(bin) {
        if (this.cache.has(bin)) {
            return this.cache.get(bin);
        }

        try {
            const response = await fetch(`https://lookup.binlist.net/${bin}`, {
                headers: {
                    'Accept-Version': '3'
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

    getFallbackInfo(bin) {
        const brand = this.detectBrand(bin);
        let country = 'Various';
        let bank = 'Various Banks';

        if (bin.startsWith('4')) {
            country = 'United States';
            bank = 'Visa Member Bank';
        } else if (bin.startsWith('5')) {
            country = 'United States';
            bank = 'Mastercard Member Bank';
        } else if (bin.startsWith('34') || bin.startsWith('37')) {
            country = 'United States';
            bank = 'American Express';
        }

        return {
            bin: bin,
            brand: brand,
            type: 'credit',
            bank: { name: bank, city: 'Various' },
            country: { name: country, code: 'US', currency: 'USD' },
            validated: false
        };
    }

    clearCache() {
        this.cache.clear();
    }
}

window.binService = new BinLookupService();
