declare module 'expo-notifications' {
  export function requestPermissionsAsync(): Promise<{ status: string }>;
  export function setNotificationHandler(handler: any): void;
  export function scheduleNotificationAsync(options: any): Promise<string>;
}
