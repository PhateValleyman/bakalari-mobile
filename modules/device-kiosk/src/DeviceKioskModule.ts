import { NativeModule, requireNativeModule } from "expo";

export type DeviceKioskStatus = {
  isDeviceOwner: boolean;
  isLockTaskPermitted: boolean;
  isLockTaskRunning: boolean;
  packageName: string;
};

declare class DeviceKioskModule extends NativeModule<Record<string, never>> {
  getStatus(): DeviceKioskStatus;
  startKiosk(): Promise<boolean>;
  stopKiosk(): Promise<boolean>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<DeviceKioskModule>("DeviceKiosk");
