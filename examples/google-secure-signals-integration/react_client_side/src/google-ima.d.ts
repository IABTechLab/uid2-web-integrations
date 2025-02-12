declare namespace google {
  namespace ima {
    class AdDisplayContainer {
      constructor(adContainer: HTMLElement, videoElement: HTMLVideoElement);
      initialize(): void;
      resize(): void;
      destroy(): void;
    }

    class AdsLoader {
      constructor(adDisplayContainer: AdDisplayContainer);
      requestAds(adsRequest: AdsRequest): void;
      contentComplete(): void;
      addEventListener(eventType: string, handler: Function, useCapture?: boolean): void;
    }

    class AdsManager {
      init(width: number, height: number, viewMode: ViewMode): void;
      start(): void;
      resize(width: number, height: number, viewMode: ViewMode): void;
      destroy(): void;
      addEventListener(eventType: string, handler: Function): void;
    }

    namespace AdsManagerLoadedEvent {
      enum Type {
        ADS_MANAGER_LOADED = 'adsManagerLoaded',
      }
    }

    class AdsRequest {
      adTagUrl: string;
      linearAdSlotWidth: number;
      linearAdSlotHeight: number;
      nonLinearAdSlotWidth: number;
      nonLinearAdSlotHeight: number;
    }

    enum ViewMode {
      NORMAL = 'NORMAL',
      FULLSCREEN = 'FULLSCREEN',
    }

    namespace AdEvent {
      enum Type {
        CONTENT_PAUSE_REQUESTED = 'contentPauseRequested',
        CONTENT_RESUME_REQUESTED = 'contentResumeRequested',
        LOADED = 'loaded',
      }
    }

    namespace AdErrorEvent {
      enum Type {
        AD_ERROR = 'adError',
      }
    }
  }
}
