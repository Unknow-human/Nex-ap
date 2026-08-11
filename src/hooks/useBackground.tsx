import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BackgroundConfig, backgroundService } from '../services/backgroundService';

interface BackgroundContextValue {
  background: BackgroundConfig;
  isLoading: boolean;
  setColorBackground: (color: string) => Promise<void>;
  setPhotoBackground: (uri: string) => Promise<void>;
  resetBackground: () => Promise<void>;
}

const BackgroundContext = createContext<BackgroundContextValue | undefined>(undefined);

/**
 * Fournit l'arrière-plan personnalisé (couleur ou photo) choisi par
 * l'utilisateur à toute l'app. À placer une seule fois, tout en haut de
 * l'arbre (voir App.tsx), pour que le choix soit visible sur tous les
 * écrans (Accueil, Chat, Jeu) et pas seulement celui où il a été défini.
 */
export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [background, setBackground] = useState<BackgroundConfig>({ type: 'default' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    backgroundService.getBackground().then((config) => {
      if (mounted) {
        setBackground(config);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setColorBackground = useCallback(async (color: string) => {
    const config: BackgroundConfig = { type: 'color', value: color };
    setBackground(config); // optimiste : réactif immédiatement à l'écran
    await backgroundService.setBackground(config);
  }, []);

  const setPhotoBackground = useCallback(async (uri: string) => {
    const config: BackgroundConfig = { type: 'photo', uri };
    setBackground(config);
    await backgroundService.setBackground(config);
  }, []);

  const resetBackground = useCallback(async () => {
    setBackground({ type: 'default' });
    await backgroundService.resetBackground();
  }, []);

  return (
    <BackgroundContext.Provider
      value={{ background, isLoading, setColorBackground, setPhotoBackground, resetBackground }}
    >
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground(): BackgroundContextValue {
  const ctx = useContext(BackgroundContext);
  if (!ctx) {
    throw new Error('useBackground doit être utilisé à l\'intérieur de <BackgroundProvider>');
  }
  return ctx;
}
