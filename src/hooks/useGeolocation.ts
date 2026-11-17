import { useState, useCallback, useEffect, useRef } from 'react';

export interface GeoCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number | null;   // meters/second from GPS
  heading?: number | null; // degrees from North
  timestamp?: number;
}

export interface GeolocationState {
  coords: GeoCoordinates | null;
  loading: boolean;
  isWatching: boolean;
  error: string | null;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unavailable';
  requestLocation: () => Promise<GeoCoordinates | null>;
  startWatching: () => void;
  stopWatching: () => void;
  setManualLocation: (lat: number, lng: number) => void;
  clearLocation: () => void;
}

export function useGeolocation(): GeolocationState {
  const [coords, setCoords] = useState<GeoCoordinates | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unavailable'>('prompt');

  const watchIdRef = useRef<number | null>(null);

  // Check initial permission status if supported
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          setPermissionStatus(status.state as 'prompt' | 'granted' | 'denied');
          status.onchange = () => {
            setPermissionStatus(status.state as 'prompt' | 'granted' | 'denied');
          };
        })
        .catch(() => {
          // Ignore permissions API failures on older browsers
        });
    }
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
    setLoading(false);
  }, []);

  // Clean up watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const mapGeoError = (code: number, GeolocationPositionErrorRef?: typeof GeolocationPositionError) => {
    const PERMISSION_DENIED = GeolocationPositionErrorRef?.PERMISSION_DENIED ?? 1;
    const POSITION_UNAVAILABLE = GeolocationPositionErrorRef?.POSITION_UNAVAILABLE ?? 2;
    const TIMEOUT = GeolocationPositionErrorRef?.TIMEOUT ?? 3;

    if (code === PERMISSION_DENIED) {
      setPermissionStatus('denied');
      return 'permission_denied';
    }
    if (code === POSITION_UNAVAILABLE) return 'position_unavailable';
    if (code === TIMEOUT) return 'timeout';
    return 'location_failed';
  };

  const requestLocation = useCallback(async (): Promise<GeoCoordinates | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('geolocation_unsupported');
      setPermissionStatus('unavailable');
      return null;
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords: GeoCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: position.timestamp
          };
          setCoords(newCoords);
          setLoading(false);
          setPermissionStatus('granted');
          setError(null);
          resolve(newCoords);
        },
        (err) => {
          setLoading(false);
          setError(mapGeoError(err.code, typeof GeolocationPositionError !== 'undefined' ? GeolocationPositionError : undefined));
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 15000
        }
      );
    });
  }, []);

  const startWatching = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('geolocation_unsupported');
      setPermissionStatus('unavailable');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setLoading(true);
    setIsWatching(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp
        });
        setLoading(false);
        setPermissionStatus('granted');
        setError(null);
      },
      (err) => {
        setLoading(false);
        setError(mapGeoError(err.code, typeof GeolocationPositionError !== 'undefined' ? GeolocationPositionError : undefined));
        if (err.code === 1) {
          stopWatching();
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      }
    );
  }, [stopWatching]);

  const setManualLocation = useCallback((lat: number, lng: number) => {
    setCoords({ lat, lng, timestamp: Date.now() });
    setError(null);
  }, []);

  const clearLocation = useCallback(() => {
    stopWatching();
    setCoords(null);
    setError(null);
  }, [stopWatching]);

  return {
    coords,
    loading,
    isWatching,
    error,
    permissionStatus,
    requestLocation,
    startWatching,
    stopWatching,
    setManualLocation,
    clearLocation
  };
}
