import { useState, useRef, useCallback } from 'react';

export function useAudioCache() {
  const audioUrisRef = useRef<Map<string, string>>(new Map());

  const setAudioUri = useCallback((key: string, uri: string) => {
    audioUrisRef.current.set(key, uri);
  }, []);

  const getAudioUri = useCallback((key: string) => {
    return audioUrisRef.current.get(key);
  }, []);

  const hasAudioUri = useCallback((key: string) => {
    return audioUrisRef.current.has(key);
  }, []);

  const clearCache = useCallback(() => {
    audioUrisRef.current.clear();
  }, []);

  return {
    setAudioUri,
    getAudioUri,
    hasAudioUri,
    clearCache,
  };
}
