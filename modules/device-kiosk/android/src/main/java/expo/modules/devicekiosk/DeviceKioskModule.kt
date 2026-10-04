package expo.modules.devicekiosk

import android.app.Activity
import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DeviceKioskModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DeviceKiosk")

    Function("getStatus") {
      getStatus()
    }

    AsyncFunction("startKiosk") {
      val context = requireContext()
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      if (!isDeviceOwner(context)) return@AsyncFunction false
      val policy = getPolicyManager(context)
      policy.setLockTaskPackages(getAdminComponent(context), arrayOf(context.packageName))
      activity.runOnUiThread { activity.startLockTask() }
      true
    }

    AsyncFunction("stopKiosk") {
      val context = requireContext()
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      if (!isDeviceOwner(context)) return@AsyncFunction false
      activity.runOnUiThread { activity.stopLockTask() }
      true
    }
  }

  private fun requireContext(): Context = requireNotNull(appContext.reactContext)

  private fun getAdminComponent(context: Context): ComponentName =
    ComponentName(context, DeviceKioskAdminReceiver::class.java)

  private fun getPolicyManager(context: Context): DevicePolicyManager =
    context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager

  private fun isDeviceOwner(context: Context): Boolean =
    getPolicyManager(context).isDeviceOwnerApp(context.packageName)

  private fun isLockTaskRunning(context: Context): Boolean {
    val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    return manager.lockTaskModeState == ActivityManager.LOCK_TASK_MODE_LOCKED
  }

  private fun getStatus(): Map<String, Any> {
    val context = requireContext()
    val policy = getPolicyManager(context)
    val isOwner = policy.isDeviceOwnerApp(context.packageName)
    return mapOf(
      "isDeviceOwner" to isOwner,
      "isLockTaskPermitted" to policy.isLockTaskPermitted(context.packageName),
      "isLockTaskRunning" to isLockTaskRunning(context),
      "packageName" to context.packageName,
    )
  }
}
