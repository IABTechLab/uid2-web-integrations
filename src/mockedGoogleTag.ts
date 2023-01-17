export type EncryptedSignalProvider = { id: string, collectorFunction: Function };

const REGISTERED_PROVIDERS = ['uidapi.com']
const isCacheExpired = (key: string) => {
    const now = Date.now();
    if (!localStorage.getItem(key)) return true;
    return (now - JSON.parse(localStorage.getItem(key)??'')[2]) > MockedsecureSignalProviders.expired_time
}
export class MockedGoogleTag {
    public secureSignalProviders: MockedsecureSignalProviders | EncryptedSignalProvider[]
    public cmd: { push: (f: Function) => void } | Function[]

    constructor() {
        if (Array.isArray(window.googletag?.cmd)) {
            window.googletag.cmd.forEach(c => c());
        }

        if (Array.isArray(window.googletag?.secureSignalProviders)) {
            window.googletag?.secureSignalProviders?.forEach(p => this.secureSignalProviders.push(p))
        }    

        this.cmd = {
            push: (f: Function) => f()
        }
        let isPlaceholder = false;
        REGISTERED_PROVIDERS.forEach(p => {
            const key = `_GESPSK-${p}`
            if (isCacheExpired(key)) {
                isPlaceholder = true;
                if (!localStorage.getItem(key)) {
                    // Put a placeholder
                    localStorage.setItem(key, JSON.stringify([
                        p,
                        null,
                        Date.now()
                    ]));
                }
                let script = document.createElement('script');
                script.type = 'text/javascript';
                script.async = true;
                script.src = 'https://cdn.integ.uidapi.com/uid2SecureSignal.js';
                document.getElementsByTagName('head')[0].appendChild(script);
            }
        })
        this.secureSignalProviders = new MockedsecureSignalProviders(isPlaceholder)
    }
}

class MockedsecureSignalProviders {
    static expired_time = 24 * 60 * 60 * 1000
    private _isPlaceholder: boolean = false;

    constructor(isPlaceholder: boolean) {
        if (Array.isArray(window.googletag?.secureSignalProviders)) {
            window.googletag.secureSignalProviders.forEach(a => this.push(a));
        }
        this._isPlaceholder = isPlaceholder;
    }
    
    public async push (provider: EncryptedSignalProvider) {
        const now = Date.now();
        let value: string;
        const key = `_GESPSK-${provider.id}`
        if (isCacheExpired(key) || this._isPlaceholder) {
            value = await provider.collectorFunction()
            localStorage.setItem(key, JSON.stringify([
                provider.id,
                value,
                now
            ]));
            this._isPlaceholder = false;
        }
    };

    public clearAllCache () {
        for (var key in localStorage) {
            if (key.startsWith('_GESPSK')) localStorage.removeItem(key)
        }
    }
};

declare global {
    interface Window {
        googletag: MockedGoogleTag;
    }
}

(function() {
    window.googletag = new MockedGoogleTag();
})();


