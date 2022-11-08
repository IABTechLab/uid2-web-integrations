class mockedGoogleTag {
    constructor() {
        if (window.googletag?.cmd?.length) {
            window.googletag?.cmd?.forEach(c => c());
        }

        this.encryptedSignalProviders = new mockedEncryptedSignalProviders()

        if (Array.isArray(window.googletag?.encryptedSignalProviders)) {
            window.googletag?.encryptedSignalProviders?.forEach(p => this.encryptedSignalProviders.push(p))
        }    

        this.cmd = {
            push: (c) => c()
        }
    }
}

class mockedEncryptedSignalProviders {
    static expired_time = 24 * 60 * 60 * 1000
    constructor() {
        if (window.mockedEncryptedSignalProviders?.push?.length) {
            window.mockedEncryptedSignalProviders?.push?.forEach(a => this.push(a));
        }

        this.handlers = []
        this.resolvedCallbacks = []
        this.push = async (a) => {
            const now = Date.now();
            let value;
            const key = `_GESPSK-${a.id}`
            if (localStorage.getItem(key) && (now - JSON.parse(localStorage.getItem(key))[2]) < mockedEncryptedSignalProviders.expired_time) {
                value = JSON.parse(localStorage.getItem(key))[1]
            } else {
                value = await a.collectorFunction()
                localStorage.setItem(key, JSON.stringify([
                    a.id,
                    value,
                    now
                ]));
            }
            this.handlers.push({
                ...a,
                collectorGeneratedData: value
            })
    
            this.resolvedCallbacks.forEach(cb => cb({ id: a.id, collectorGeneratedData: value }))
        };
    
        this.addOnSignalResolveCallback = function(a) {
            this.resolvedCallbacks.push(a);
            this.handlers.forEach(h => {
                a({ id: h.id, collectorGeneratedData: h.collectorGeneratedData})
            })
        };
    
        this.clearAllCache = function() {
            for (var key in localStorage) {
                if (key.startsWith('_GESPSK')) localStorage.removeItem(key)
            }
        };    
    }
};

window.googletag = new mockedGoogleTag();