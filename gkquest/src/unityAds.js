import { Capacitor } from '@capacitor/core';
import { UnityAds } from 'capacitor-unity-ads';

let _unityInitPromise = null;
let _isInitialized = false;
let _adLoadPromise = null;
let _isAdLoaded = false;

// ─── UNITY CONFIGURATION ───
// These are updated reactively from Firebase in App.jsx
export let UNITY_CONFIG = {
  gameId: '6082747', 
  projectId: 'ded86581-2622-45d9-ae7d-cc921cf991a0',
  placementId: 'Rewarded_Android', 
  testMode: false 
};

/**
 * Update configuration from Admin Panel settings.
 */
export function setUnityConfig(config) {
  if (!config) return;
  UNITY_CONFIG = {
    gameId: config.unityGameId || UNITY_CONFIG.gameId,
    projectId: config.unityProjectId || UNITY_CONFIG.projectId,
    placementId: config.unityPlacementId || UNITY_CONFIG.placementId,
    testMode: config.unityTestMode ?? UNITY_CONFIG.testMode
  };
  console.log('[UnityAds] Config Updated:', UNITY_CONFIG);
}

/**
 * Initialize Unity Ads SDK.
 */
export function initializeUnityAds() {
  const gameId = UNITY_CONFIG.gameId;
  const testMode = UNITY_CONFIG.testMode;
  
  if (_unityInitPromise) return _unityInitPromise;

  _unityInitPromise = (async () => {
    if (!Capacitor.isNativePlatform()) {
      _isInitialized = true;
      console.log('[UnityAds] Non-native platform, skipping init');
      return true;
    }

    try {
      console.log('[UnityAds] Initializing for Game ID:', gameId);
      await UnityAds.initialize({
        gameId: gameId,
        testMode: testMode
      });
      _isInitialized = true;
      console.log('[UnityAds] SDK Ready. Test mode:', testMode);
      
      // Auto-load first ad
      prepareRewardAd().catch(() => {});
      return true;
    } catch (e) {
      console.warn('[UnityAds] Init error:', e);
      _isInitialized = true; // Still allow attempts
      return true;
    }
  })();

  return _unityInitPromise;
}

export const isUnityReady = () => _isInitialized;
export const isAdLoaded = () => _isAdLoaded;

/**
 * Load a rewarded ad.
 */
export function prepareRewardAd(placementId = UNITY_CONFIG.placementId) {
  if (_isAdLoaded) return Promise.resolve(true);
  if (_adLoadPromise) return _adLoadPromise;

  _adLoadPromise = (async () => {
    if (!Capacitor.isNativePlatform()) return true;

    try {
      console.log('[UnityAds] Loading ad for placement:', placementId);
      
      const loadPromise = UnityAds.loadRewardedVideo({ placementId: placementId });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('UnityAds load timeout')), 10000)
      );
      
      await Promise.race([loadPromise, timeoutPromise]);
      
      _isAdLoaded = true;
      _adLoadPromise = null;
      console.log('[UnityAds] ✓ Ad cached and ready');
      return true;
    } catch (e) {
       console.warn('[UnityAds] ✗ Load failed:', e);
       _adLoadPromise = null;
       // Retry after 15 seconds
       setTimeout(() => prepareRewardAd(placementId).catch(() => {}), 15000);
       return false;
    }
  })();

  return _adLoadPromise;
}

/**
 * Show the cached rewarded ad.
 */
export async function showRewardAd(placementId = UNITY_CONFIG.placementId) {
  if (!Capacitor.isNativePlatform()) {
    console.log('[UnityAds] Non-native show mock');
    return true; 
  }

  // Double check if ad is really loaded before potentially showing a black screen or failing
  try {
     const check = await UnityAds.isRewardedVideoLoaded();
     _isAdLoaded = check.loaded;
  } catch(e) {}

  if (!_isAdLoaded) {
    console.log('[UnityAds] ✗ Ad not loaded, attempting load before show');
    const loaded = await prepareRewardAd(placementId);
    if (!loaded) return null;
  }

  _isAdLoaded = false;
  try {
    const result = await UnityAds.showRewardedVideo();
    console.log('[UnityAds] ✓ Ad result:', result);
    // Preload next
    prepareRewardAd(placementId).catch(() => {});
    
    // The result from unity-ads contains success: boolean
    if (result && result.success) {
      return 'COMPLETED'; // Return compatible string for existing components
    }
    return null;
  } catch (e) {
    console.error('[UnityAds] Show error:', e);
    prepareRewardAd(placementId).catch(() => {});
    return null;
  }
}
