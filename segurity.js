const SecurityManager = (() => {
    function sanitizeInput(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    const validators = {
        name: (name) => {
            const clean = sanitizeInput(name.trim());
            const regex = /^[a-zA-ZÁÉÍÓÚáéíóúÑñ\s]{2,60}$/;
            return { isValid: regex.test(clean), sanitized: clean, rawClean: name.trim() };
        },
        phone: (phone) => {
            const clean = sanitizeInput(phone.trim());
            const regex = /^\d{7,15}$/;
            return { isValid: regex.test(clean), sanitized: clean };
        },
        email: (email) => {
            const clean = sanitizeInput(email.trim());
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return { isValid: regex.test(clean) && clean.length <= 100, sanitized: clean };
        },
        date: (dateStr) => {
            const selectedDate = new Date(dateStr);
            const now = new Date();
            return { isValid: !isNaN(selectedDate.getTime()) && selectedDate > now, sanitized: dateStr };
        }
    };

    function generateSessionToken() {
        const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem('mgz_session_token', token);
        return token;
    }

    function validateSessionToken(token) {
        const storedToken = sessionStorage.getItem('mgz_session_token');
        return storedToken && storedToken === token;
    }

    function consumeSessionToken() {
        sessionStorage.removeItem('mgz_session_token');
    }

    const SECRET_KEY = "MgZ_Secure_Salt_2026";
    
    function simpleHash(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0;
        }
        return hash.toString(16);
    }

    const LoyaltyStorage = {
        getCounter() {
            try {
                const encryptedData = localStorage.getItem('mgz_loyalty_state');
                if (!encryptedData) return 0;

                const parsed = JSON.parse(encryptedData);
                const expectedSignature = simpleHash(parsed.count.toString() + SECRET_KEY);

                if (parsed.signature !== expectedSignature) {
                    this.setCounter(0);
                    return 0;
                }
                return parseInt(parsed.count, 10);
            } catch (e) {
                return 0;
            }
        },
        setCounter(count) {
            const safeCount = Math.max(0, Math.min(5, parseInt(count, 10)));
            const signature = simpleHash(safeCount.toString() + SECRET_KEY);
            const payload = JSON.stringify({ count: safeCount, signature: signature });
            localStorage.setItem('mgz_loyalty_state', payload);
        }
    };

    return {
        sanitizeInput,
        validators,
        generateSessionToken,
        validateSessionToken,
        consumeSessionToken,
        LoyaltyStorage
    };
})();