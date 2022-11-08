
const initializeGoogleTag = () => {
    if (window.Uid2ESPLoaded) return
    
    if (!window.googletag) {
        window.googletag = { encryptedSignalProviders: [], cmd: [] };
    }
    const uid2Hanlder = retrieveAdvertisingTokenHandler()
    if (!uid2Hanlder) {
        console.warn('Please implement `getAdvertisingToken`')
        return
    }
    window.googletag.cmd.push(() => {
        window.googletag.encryptedSignalProviders
            .addOnSignalResolveCallback((payload) => {
                if (payload.id === 'uidapi.com' 
                    && payload.collectorGeneratedData !== uid2Hanlder())
                {
                    forceRefreshCache()
                }
            })
    })
    window.Uid2ESPLoaded = true;
    //TODO: register addErrorHandler as well? 
}

const forceRefreshCache = () => {
    const uid2Handler = retrieveAdvertisingTokenHandler()

    if (!uid2Handler) {
        console.warn('Please implement `getAdvertisingToken`')
        return
    }

    const tempStore = new Map();
    for (const key in localStorage) {
        if (key.startsWith('_GESPSK')) {
            const [id, token ] = JSON.parse(localStorage.getItem(key))
            tempStore.set(id, token)
        }
    }
    window.googletag.encryptedSignalProviders.clearAllCache()

    tempStore.forEach((token, id) => {
        const collectorFunction = id === 'uidapi.com' ? () => Promise.resolve(uid2Handler()) : () => Promise.resolve(token)
        window.googletag.encryptedSignalProviders.push({
            id,
            collectorFunction
        });
    }) 
}

const registerUid2Handler = () => {
    const uid2Handler = retrieveAdvertisingTokenHandler()

    if (!uid2Handler) {
        console.warn('Please implement `getAdvertisingToken`')
        return
    }

    if (uid2Handler()) {
        window.googletag.cmd.push(() => 
            window.googletag.encryptedSignalProviders.push({
                id: 'uidapi.com',
                collectorFunction: () => Promise.resolve(uid2Handler())
            })
        );
    }
}

const retrieveAdvertisingTokenHandler = () => {
    if (typeof getAdvertisingToken === 'function') {
        return getAdvertisingToken
    }
    if (window.__uid2 && 'getAdvertisingToken' in window.__uid2) {
        return window.__uid2.getAdvertisingToken.bind(window.__uid2);
    }
}

(function() {
    initializeGoogleTag();
})();