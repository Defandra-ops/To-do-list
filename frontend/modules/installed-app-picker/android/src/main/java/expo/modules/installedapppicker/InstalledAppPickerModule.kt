package expo.modules.installedapppicker

import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

class InstalledAppPickerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("InstalledAppPicker")

    AsyncFunction("getInstalledAppsAsync") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, String>>()
      val packageManager = context.packageManager
      val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)

      queryLauncherApps(packageManager, launcherIntent)
        .mapNotNull { resolveInfo ->
          val activityInfo = resolveInfo.activityInfo ?: return@mapNotNull null
          val packageName = activityInfo.packageName
          if (packageName == context.packageName) return@mapNotNull null

          val label = resolveInfo.loadLabel(packageManager).toString().trim()
          if (label.isEmpty()) return@mapNotNull null

          mapOf("name" to label, "packageName" to packageName)
        }
        .distinctBy { it["packageName"] }
        .sortedBy { it["name"]?.lowercase(Locale.ROOT) }
    }
  }

  @Suppress("DEPRECATION")
  private fun queryLauncherApps(packageManager: PackageManager, intent: Intent): List<ResolveInfo> {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      packageManager.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0))
    } else {
      packageManager.queryIntentActivities(intent, 0)
    }
  }
}
