import { useState, useCallback, useEffect } from 'react';

export interface GeoCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface GeolocationState {
  coords: GeoCoordinates | null;
  loading: boolean;
  error: string | null;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unavailable';
  requestLocation: () => Promise<GeoCoordinates | null>;
  setManualLocation: (lat: number, lng: number) => void;
  clearLocation: () => void;
}

export function useGeolocation(): GeolocationState {
  const [coords, setCoords] = useState<GeoCoordinates | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unavailable'>('prompt');

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
            accuracy: position.coords.accuracy
          };
          setCoords(newCoords);
          setLoading(false);
          setPermissionStatus('granted');
          setError(null);
          resolve(newCoords);
        },
        (err) => {
          setLoading(false);
          let errorMsg = 'location_failed';
          if (err.code === err.PERMISSION_DENIED) {
            errorMsg = 'permission_denied';
            setPermissionStatus('denied');
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            errorMsg = 'position_unavailable';
          } else if (err.code === err.TIMEOUT) {
            errorMsg = 'timeout';
          }
          setError(errorMsg);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }, []);

  const setManualLocation = useCallback((lat: number, lng: number) => {
    setCoords({ lat, lng });
    setError(null);
  }, []);

  const clearLocation = useCallback(() => {
    setCoords(null);
    setError(null);
  }, []);

  return {
    coords,
    loading,
    error,
    permissionStatus,
    requestLocation,
    setManualLocation,
    clearLocation
  };
}
