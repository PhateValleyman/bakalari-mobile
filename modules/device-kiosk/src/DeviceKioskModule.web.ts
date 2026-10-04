import { registerWebModule, NativeModule } from "expo";

import type { DeviceKioskStatus } from "./DeviceKioskModule";

type DeviceKioskModuleEvents = Record<string, never>;

class DeviceKioskModule extends NativeModule<DeviceKioskModuleEvents> {
  private locked = false;

  getStatus(): DeviceKioskStatus {
    return {
      isDeviceOwner: false,
      isLockTaskPermitted: false,
      isLockTaskRunning: this.locked,
      packageName: "web-preview",
    };
  }

  async startKiosk(): Promise<boolean> {
    this.locked = true;
    return false;
  }

  async stopKiosk(): Promise<boolean> {
    this.locked = false;
    return true;
  }
}

export default registerWebModule(DeviceKioskModule, "DeviceKiosk");
