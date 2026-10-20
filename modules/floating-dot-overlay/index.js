import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

/**
 * JavaScript interface for the native Android Floating Dot Overlay.
 * 
 * Uses requireOptionalNativeModule so that running in Expo Go or web
 * never causes a runtime crash.
 */
const NativeOverlay = Platform.OS === 'android'
  ? requireOptionalNativeModule('FloatingDotOverlay')
  : null;

export const isNativeModuleAvailable = Boolean(NativeOverlay);

/**
 * Checks if SYSTEM_ALERT_WINDOW (display over other apps) permission is granted.
 */
export async function checkOverlayPermission() {
  if (NativeOverlay && typeof NativeOverlay.checkPermission === 'function') {
    try {
      return await NativeOverlay.checkPermission();
    } catch (e) {
      console.warn('Error checking overlay permission:', e);
      return false;
    }
  }
  return false;
}

/**
 * Opens Android system settings for this app to grant "Display over other apps".
 */
export async function requestOverlayPermission() {
  if (NativeOverlay && typeof NativeOverlay.requestPermission === 'function') {
    try {
      return await NativeOverlay.requestPermission();
    } catch (e) {
      console.warn('Error requesting overlay permission:', e);
      return false;
    }
  }
  return false;
}

/**
 * Starts the native floating dot foreground service.
 */
export async function startFloatingOverlay() {
  if (NativeOverlay && typeof NativeOverlay.startOverlay === 'function') {
    return await NativeOverlay.startOverlay();
  }
  throw new Error(
    'Native FloatingDotOverlay module is not loaded in this environment. ' +
    'Expo Go does not include custom native modules. A development build (APK) is required.'
  );
}

/**
 * Stops the native floating dot foreground service.
 */
export async function stopFloatingOverlay() {
  if (NativeOverlay && typeof NativeOverlay.stopOverlay === 'function') {
    return await NativeOverlay.stopOverlay();
  }
  return false;
}

/**
 * Returns whether the floating dot overlay service is currently running.
 */
export function isFloatingOverlayRunning() {
  if (NativeOverlay && typeof NativeOverlay.isOverlayRunning === 'function') {
    return Boolean(NativeOverlay.isOverlayRunning());
  }
  return false;
}
