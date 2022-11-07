type EncryptedSignalProvider = {id: string, collectorFunction: () => Promise<string> };
type GoogleTag = { encryptedSignalProviders?: EncryptedSignalProvider[] };
export function setupGoogleTag() {
    if (!window.googletag) {
        window.googletag = {};
    }
    if (!window.googletag.encryptedSignalProviders) {
        window.googletag.encryptedSignalProviders = [];
    }
    window.googletag.encryptedSignalProviders.push({
        id: "uidapi.com",
        collectorFunction: () => {
            if (window.__uid2 && 'getAdvertisingTokenAsync' in window.__uid2) {
                return window.__uid2.getAdvertisingTokenAsync();
            } else {
                return Promise.reject(new Error("UID2 SDK not present"));
            }
        },
    });
}

declare global {
    interface Window {
        googletag: GoogleTag;
    }
}
