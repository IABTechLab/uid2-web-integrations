export type EncryptedSignalProvider = { id: string, collectorFunction: () => Promise<string> };
export type EncryptedSignalHandler = EncryptedSignalProvider & { collectorGeneratedData: string };
export type EncryptedSignalCallback = (param: Omit<EncryptedSignalHandler, 'collectorFunction'>) => void;
export class MockedGoogleTag {
    public encryptedSignalProviders: MockedEncryptedSignalProviders | EncryptedSignalProvider[]
    public cmd: { push: (f: Function) => void } | Function[]

    constructor() {
        if (Array.isArray(window.googletag?.cmd)) {
            window.googletag.cmd.forEach(c => c());
        }

        this.encryptedSignalProviders = new MockedEncryptedSignalProviders()

        if (Array.isArray(window.googletag?.encryptedSignalProviders)) {
            window.googletag?.encryptedSignalProviders?.forEach(p => this.encryptedSignalProviders.push(p))
        }    

        this.cmd = {
            push: (f: Function) => f()
        }
    }
}

class MockedEncryptedSignalProviders {
    static expired_time = 24 * 60 * 60 * 1000
    private _resolvedCallbacks: EncryptedSignalCallback[]
    private _handlers: EncryptedSignalHandler[];

    constructor() {
        if (Array.isArray(window.googletag?.encryptedSignalProviders)) {
            window.googletag.encryptedSignalProviders.forEach(a => this.push(a));
        }

        this._handlers = []
        this._resolvedCallbacks = []
    }
    
    public async push (provider: EncryptedSignalProvider) {
        const now = Date.now();
        let value: string;
        const key = `_GESPSK-${provider.id}`
        if (localStorage.getItem(key) && (now - JSON.parse(localStorage.getItem(key)??'')[2]) < mockedEncryptedSignalProviders.expired_time) {
            value = JSON.parse(localStorage.getItem(key)??'')[1]
        } else {
            value = await provider.collectorFunction()
            localStorage.setItem(key, JSON.stringify([
                provider.id,
                value,
                now
            ]));
        }
        this._handlers.push({
            ...provider,
            collectorGeneratedData: value
        })

        this._resolvedCallbacks.forEach(cb => cb({ id: provider.id, collectorGeneratedData: value }))
    };

    public addOnSignalResolveCallback (callback: EncryptedSignalCallback) {
        this._resolvedCallbacks.push(callback);
        this._handlers.forEach(h => {
            callback({ id: h.id, collectorGeneratedData: h.collectorGeneratedData})
        })
    }

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


