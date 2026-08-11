import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface CustomKeyboardProps {
  onDigitPress: (digit: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function CustomKeyboard({ onDigitPress, onDelete, disabled = false }: CustomKeyboardProps) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  // Recalculé à chaque rendu via le hook réactif useWindowDimensions (et non
  // Dimensions.get('window') figé une fois pour toutes au chargement du module) :
  // s'adapte à la rotation d'écran, aux appareils pliables, et au redimensionnement
  // de fenêtre (web/tablette en split-screen).
  const { width, height } = useWindowDimensions();
  const isShortScreen = height < 700;
  const margin = isShortScreen ? 4 : 6;
  const rawKeySize = Math.floor((width - 56) / 5) - margin * 2;
  const maxKeySize = isShortScreen ? 56 : 72;
  const KEY_SIZE = Math.min(maxKeySize, rawKeySize > 0 ? rawKeySize : 48);

  return (
    <View style={styles.container}>
      <View style={[styles.grid, { marginHorizontal: -margin }]}>
        {digits.map((digit) => (
          <TouchableOpacity
            key={digit}
            style={[styles.key, { width: KEY_SIZE, height: KEY_SIZE, margin }, disabled && styles.keyDisabled]}
            onPress={() => !disabled && onDigitPress(digit)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={disabled ? ['#e6eef6', '#cbd5e1'] : ['#6366f1', '#818cf8']}
              style={styles.keyGradient}
            >
              <Text style={[styles.keyText, disabled && styles.keyTextDisabled]}>{digit}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.key, { width: KEY_SIZE, height: KEY_SIZE, margin }, disabled && styles.keyDisabled]}
          onPress={() => !disabled && onDelete()}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={disabled ? ['#e6eef6', '#cbd5e1'] : ['#f56565', '#fb7185']}
            style={styles.keyGradient}
          >
            <Text style={[styles.deleteText, disabled && styles.keyTextDisabled]}>⌫</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginHorizontal: -6,
  },
  key: {
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#5b6ef5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  keyGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  keyTextDisabled: {
    color: '#a0aec0',
  },
  deleteText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
});
