export type DeviceKioskStatus = {
  isDeviceOwner: boolean;
  isLockTaskPermitted: boolean;
  isLockTaskRunning: boolean;
  packageName: string;
};

export type DeviceKioskModuleEvents = Record<string, never>;
