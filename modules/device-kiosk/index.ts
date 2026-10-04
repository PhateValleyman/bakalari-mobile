// Re-export the native module. On web, it will be resolved to DeviceKioskModule.web.ts
// and on native platforms to DeviceKioskModule.ts
export { default } from './src/DeviceKioskModule';
export * from './src/DeviceKiosk.types';
