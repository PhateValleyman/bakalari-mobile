# Rodičovský kiosk – ověřené technické zdroje

- Android Lock Task Mode: https://developer.android.com/work/dpc/dedicated-devices/lock-task-mode
- Android Dedicated Devices / provisioning: https://developer.android.com/work/dpc/dedicated-devices
- Expo local native module: https://docs.expo.dev/modules/native-module-tutorial/

## Důležité závěry

- Skutečný celo-tabletový kiosk vyžaduje plně spravované zařízení a Device Owner/admin component.
- DPC musí aplikaci povolit přes `DevicePolicyManager.setLockTaskPackages()`; aplikace pak může použít `startLockTask()` nebo manifest `android:lockTaskMode="if_whitelisted"`.
- Produkční provisioning má začít factory resetem a enrollmentem. Android doporučuje QR provisioning během úvodního setupu.
- Expo web preview a Expo Go neumí skutečně blokovat systémový Home/Settings. Pro Device Owner je nutný rebuild s lokálním native modulem a následné nativní Android oprávnění.
- QR rodičovského odemčení v aplikaci bude podepsaný offline token; samotný QR obsah nebude obsahovat školské heslo ani access token.
