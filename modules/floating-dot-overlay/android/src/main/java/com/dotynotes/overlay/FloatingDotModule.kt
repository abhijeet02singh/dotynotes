package com.dotynotes.overlay

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.content.pm.PackageManager
import androidx.core.content.FileProvider
import androidx.core.content.pm.PackageInfoCompat
import androidx.core.os.bundleOf
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * Expo Native Module bridge for FloatingDotOverlay.
 * 
 * Provides safe JS methods to query overlay permissions, open Android
 * Settings, start or stop the native floating service, synchronize note data,
 * execute automated database recovery, and manage APK update downloads.
 */
class FloatingDotModule : Module() {

    @Volatile
    private var isDownloadCancelled = false
    private var activeHttpConnection: HttpURLConnection? = null

    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("React Context is null")

    override fun definition() = ModuleDefinition {
        Name("FloatingDotOverlay")

        Events("onQuickNoteSaved", "onQuickNoteMutation", "onUpdateDownloadProgress")

        OnCreate {
            OverlayNoteRepository.getInstance(context).setOnMutationListener { type, data ->
                try {
                    sendEvent("onQuickNoteMutation", bundleOf("type" to type, "data" to data))
                    sendEvent("onQuickNoteSaved", bundleOf("note" to data))
                } catch (e: Exception) {
                    // Suppress if listeners not yet registered
                }
            }
        }

        Function("isSupported") {
            true
        }

        Function("checkPermission") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(context)
            } else {
                true
            }
        }

        Function("canScheduleExactAlarms") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? android.app.AlarmManager
                alarmManager?.canScheduleExactAlarms() ?: false
            } else {
                true
            }
        }

        Function("isBatteryOptimizationIgnored") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
                powerManager?.isIgnoringBatteryOptimizations(context.packageName) ?: false
            } else {
                true
            }
        }

        Function("requestPermission") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${context.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                true
            } else {
                true
            }
        }

        Function("getNativeAppVersion") {
            try {
                val pInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    context.packageManager.getPackageInfo(context.packageName, android.content.pm.PackageManager.PackageInfoFlags.of(0))
                } else {
                    @Suppress("DEPRECATION")
                    context.packageManager.getPackageInfo(context.packageName, 0)
                }
                val code = PackageInfoCompat.getLongVersionCode(pInfo).toInt()
                mapOf(
                    "version" to (pInfo.versionName ?: "1.0.1"),
                    "versionCode" to code,
                    "packageName" to context.packageName
                )
            } catch (e: Exception) {
                mapOf(
                    "version" to "1.0.1",
                    "versionCode" to 2,
                    "packageName" to context.packageName
                )
            }
        }

        Function("canRequestPackageInstalls") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.packageManager.canRequestPackageInstalls()
            } else {
                true
            }
        }

        Function("openUnknownAppSourcesSettings") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:${context.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                true
            } else {
                true
            }
        }

        AsyncFunction("downloadAndInstallApk") { downloadUrl: String, fileName: String ->
            try {
                val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
                    ?: return@AsyncFunction mapOf("success" to false, "error" to "DownloadManager unavailable")

                val targetName = if (fileName.isNotBlank()) fileName else "DotyNotes-update.apk"
                val destinationFile = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), targetName)
                if (destinationFile.exists()) {
                    destinationFile.delete()
                }

                val request = DownloadManager.Request(Uri.parse(downloadUrl)).apply {
                    setTitle("DotyNotes Update")
                    setDescription("Downloading update package...")
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationUri(Uri.fromFile(destinationFile))
                    setMimeType("application/vnd.android.package-archive")
                }

                val downloadId = dm.enqueue(request)

                val receiver = object : BroadcastReceiver() {
                    override fun onReceive(recvContext: Context?, intent: Intent?) {
                        val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L) ?: -1L
                        if (id == downloadId) {
                            try {
                                recvContext?.unregisterReceiver(this)
                            } catch (e: Exception) {}

                            try {
                                val contentUri = FileProvider.getUriForFile(
                                    context,
                                    "${context.packageName}.fileprovider",
                                    destinationFile
                                )
                                val installIntent = Intent(Intent.ACTION_VIEW).apply {
                                    setDataAndType(contentUri, "application/vnd.android.package-archive")
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                }
                                context.startActivity(installIntent)
                            } catch (e: Exception) {
                                android.util.Log.e("FloatingDotModule", "Package installer invocation failed: ${e.message}")
                            }
                        }
                    }
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    context.registerReceiver(
                        receiver,
                        IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
                        Context.RECEIVER_NOT_EXPORTED
                    )
                } else {
                    context.registerReceiver(
                        receiver,
                        IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
                    )
                }

                mapOf("success" to true, "downloadId" to downloadId)
            } catch (e: Exception) {
                mapOf("success" to false, "error" to (e.message ?: "Download failed"))
            }
        }

        AsyncFunction("downloadAndVerifyApk") { downloadUrl: String, fileName: String, expectedSha256: String, expectedPackageId: String, minVersionCode: Int ->
            try {
                isDownloadCancelled = false
                val targetName = if (fileName.isNotBlank()) fileName else "DotyNotes-update.apk"
                val updatesDir = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "updates")
                if (!updatesDir.exists()) {
                    updatesDir.mkdirs()
                }

                val destinationFile = File(updatesDir, targetName)
                val tempFile = File(updatesDir, "$targetName.downloading")
                if (tempFile.exists()) {
                    tempFile.delete()
                }

                // 1. Establish HTTP connection and follow redirects (e.g. GitHub Releases -> S3)
                val conn = openConnectionWithRedirects(downloadUrl)
                activeHttpConnection = conn
                val responseCode = conn.responseCode
                if (responseCode !in 200..299) {
                    conn.disconnect()
                    activeHttpConnection = null
                    return@AsyncFunction mapOf(
                        "success" to false,
                        "errorCode" to "HTTP_ERROR",
                        "error" to "Download server returned HTTP error: $responseCode"
                    )
                }

                val contentLength = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    conn.contentLengthLong
                } else {
                    conn.contentLength.toLong()
                }

                // 2. Storage space pre-flight check
                val freeSpace = updatesDir.usableSpace
                if (contentLength > 0 && freeSpace < (contentLength + 15 * 1024 * 1024)) {
                    conn.disconnect()
                    activeHttpConnection = null
                    return@AsyncFunction mapOf(
                        "success" to false,
                        "errorCode" to "INSUFFICIENT_STORAGE",
                        "error" to "Insufficient device storage space to download update package."
                    )
                }

                // 3. Stream download while calculating SHA-256
                val digest = MessageDigest.getInstance("SHA-256")
                val buffer = ByteArray(32768)
                var bytesRead: Int
                var totalBytesDownloaded: Long = 0
                var lastProgressEmitTime = 0L

                conn.inputStream.use { inStream ->
                    FileOutputStream(tempFile).use { outStream ->
                        while (inStream.read(buffer).also { bytesRead = it } != -1) {
                            if (isDownloadCancelled) {
                                tempFile.delete()
                                conn.disconnect()
                                activeHttpConnection = null
                                return@AsyncFunction mapOf(
                                    "success" to false,
                                    "cancelled" to true,
                                    "errorCode" to "CANCELLED",
                                    "error" to "Download cancelled by user"
                                )
                            }
                            outStream.write(buffer, 0, bytesRead)
                            digest.update(buffer, 0, bytesRead)
                            totalBytesDownloaded += bytesRead

                            val now = System.currentTimeMillis()
                            if (now - lastProgressEmitTime > 150 || (contentLength > 0 && totalBytesDownloaded == contentLength)) {
                                lastProgressEmitTime = now
                                val percent = if (contentLength > 0) ((totalBytesDownloaded * 100) / contentLength).toInt() else 0
                                try {
                                    sendEvent("onUpdateDownloadProgress", bundleOf(
                                        "percent" to percent,
                                        "bytesDownloaded" to totalBytesDownloaded,
                                        "totalBytes" to contentLength,
                                        "status" to "downloading"
                                    ))
                                } catch (_: Exception) {}
                            }
                        }
                    }
                }
                conn.disconnect()
                activeHttpConnection = null

                // 4. Verify cryptographic SHA-256 checksum
                try {
                    sendEvent("onUpdateDownloadProgress", bundleOf(
                        "percent" to 100,
                        "bytesDownloaded" to totalBytesDownloaded,
                        "totalBytes" to contentLength,
                        "status" to "verifying"
                    ))
                } catch (_: Exception) {}

                val actualSha256 = digest.digest().joinToString("") { "%02x".format(it) }
                if (expectedSha256.isNotBlank()) {
                    val cleanExpected = expectedSha256.trim().lowercase()
                    if (!actualSha256.equals(cleanExpected, ignoreCase = true)) {
                        tempFile.delete()
                        return@AsyncFunction mapOf(
                            "success" to false,
                            "errorCode" to "CHECKSUM_MISMATCH",
                            "error" to "Cryptographic verification failed: APK checksum ($actualSha256) did not match trusted metadata ($cleanExpected)."
                        )
                    }
                }

                // Move verified temp file into place
                if (destinationFile.exists()) {
                    destinationFile.delete()
                }
                if (!tempFile.renameTo(destinationFile)) {
                    tempFile.copyTo(destinationFile, overwrite = true)
                    tempFile.delete()
                }

                // 5. Inspect package archive integrity and verify com.dotynotes.app identity
                val pm = context.packageManager
                val archiveInfo = pm.getPackageArchiveInfo(destinationFile.absolutePath, 0)
                    ?: run {
                        destinationFile.delete()
                        return@AsyncFunction mapOf(
                            "success" to false,
                            "errorCode" to "INVALID_APK",
                            "error" to "Corrupted APK file: Package archive could not be parsed."
                        )
                    }

                val expectedPkg = if (expectedPackageId.isNotBlank()) expectedPackageId else "com.dotynotes.app"
                if (archiveInfo.packageName != expectedPkg) {
                    destinationFile.delete()
                    return@AsyncFunction mapOf(
                        "success" to false,
                        "errorCode" to "PACKAGE_MISMATCH",
                        "error" to "Security verification rejected: APK package ID is '${archiveInfo.packageName}', expected '$expectedPkg'."
                    )
                }

                // 6. Check version compatibility
                val archiveVersionCode = PackageInfoCompat.getLongVersionCode(archiveInfo).toInt()
                if (minVersionCode > 0 && archiveVersionCode < minVersionCode) {
                    destinationFile.delete()
                    return@AsyncFunction mapOf(
                        "success" to false,
                        "errorCode" to "VERSION_DOWNGRADE",
                        "error" to "Update rejected: APK versionCode ($archiveVersionCode) is lower than required ($minVersionCode)."
                    )
                }

                // 7. Verify signing certificate compatibility
                val signaturesMatch = verifyApkSignatureMatch(context, destinationFile.absolutePath)
                if (!signaturesMatch) {
                    destinationFile.delete()
                    return@AsyncFunction mapOf(
                        "success" to false,
                        "errorCode" to "SIGNATURE_MISMATCH",
                        "error" to "Update rejected: APK signing certificate does not match the installed DotyNotes application."
                    )
                }

                // 8. Check unknown app install permission
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !pm.canRequestPackageInstalls()) {
                    return@AsyncFunction mapOf(
                        "success" to true,
                        "needsInstallPermission" to true,
                        "apkPath" to destinationFile.absolutePath,
                        "version" to (archiveInfo.versionName ?: ""),
                        "versionCode" to archiveVersionCode,
                        "sha256" to actualSha256
                    )
                }

                // 9. Launch PackageInstaller via secure FileProvider URI
                val launchResult = launchApkInstaller(context, destinationFile)
                if (launchResult["success"] == true) {
                    mapOf(
                        "success" to true,
                        "needsInstallPermission" to false,
                        "apkPath" to destinationFile.absolutePath,
                        "version" to (archiveInfo.versionName ?: ""),
                        "versionCode" to archiveVersionCode,
                        "sha256" to actualSha256,
                        "method" to "package-installer"
                    )
                } else {
                    launchResult
                }
            } catch (e: Exception) {
                activeHttpConnection = null
                mapOf(
                    "success" to false,
                    "errorCode" to "DOWNLOAD_FAILED",
                    "error" to (e.message ?: "Failed to download update package")
                )
            }
        }

        Function("installVerifiedApk") { apkPath: String ->
            val file = File(apkPath)
            if (!file.exists()) {
                return@Function mapOf("success" to false, "error" to "APK file not found at $apkPath")
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.packageManager.canRequestPackageInstalls()) {
                return@Function mapOf("success" to false, "needsInstallPermission" to true, "error" to "Unknown app install permission required")
            }
            launchApkInstaller(context, file)
        }

        Function("cancelApkDownload") {
            isDownloadCancelled = true
            try {
                activeHttpConnection?.disconnect()
            } catch (_: Exception) {}
            activeHttpConnection = null
            true
        }

        Function("startOverlay") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                return@Function false
            }

            val serviceIntent = Intent(context, FloatingDotService::class.java).apply {
                action = FloatingDotService.ACTION_START
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            true
        }

        Function("stopOverlay") {
            val serviceIntent = Intent(context, FloatingDotService::class.java).apply {
                action = FloatingDotService.ACTION_STOP
            }
            context.startService(serviceIntent)
            true
        }

        Function("isOverlayRunning") {
            FloatingDotService.isRunning
        }

        Function("setOverlayTheme") { themeName: String ->
            OverlayNoteRepository.getInstance(context).setOverlayTheme(themeName)
            if (FloatingDotService.isRunning) {
                try {
                    val serviceIntent = Intent(context, FloatingDotService::class.java).apply {
                        action = FloatingDotService.ACTION_UPDATE_THEME
                        putExtra(FloatingDotService.EXTRA_THEME, themeName)
                    }
                    context.startService(serviceIntent)
                } catch (e: Exception) {
                    android.util.Log.w("FloatingDotModule", "Could not send theme update to service: ${e.message}")
                }
            }
            true
        }

        AsyncFunction("repairDatabase") {
            val report = DatabaseRecoveryHelper.repairDatabase(context)
            report.toMap()
        }

        AsyncFunction("performSafeRepair") {
            val report = DatabaseRecoveryHelper.performSafeRepair(context)
            report.toMap()
        }

        AsyncFunction("createDatabaseBackup") {
            val backupPath = DatabaseRecoveryHelper.createSafeBackup(context)
            backupPath ?: ""
        }

        AsyncFunction("syncNotesToOverlay") { notesJson: String ->
            OverlayNoteRepository.getInstance(context).syncRecentNotes(notesJson)
            true
        }

        AsyncFunction("getPendingOverlayNotes") {
            OverlayNoteRepository.getInstance(context).getPendingNotesJson()
        }

        AsyncFunction("clearPendingOverlayNotes") {
            OverlayNoteRepository.getInstance(context).clearPendingNotes()
            true
        }

        AsyncFunction("getPendingOverlayMutations") {
            OverlayNoteRepository.getInstance(context).getPendingMutationsJson()
        }

        AsyncFunction("clearPendingOverlayMutations") {
            OverlayNoteRepository.getInstance(context).clearPendingMutations()
            true
        }

        AsyncFunction("cleanupStaleWalFiles") {
            DatabaseRecoveryHelper.cleanupStaleWalFiles(context)
        }

        View(DotyRichTextView::class) {
            Events("onContentChange", "onActiveStylesChange")

            Prop("html") { view: DotyRichTextView, html: String? ->
                view.setHtmlContent(html)
            }

            Prop("placeholder") { view: DotyRichTextView, placeholder: String? ->
                view.setPlaceholderText(placeholder)
            }

            Prop("textColor") { view: DotyRichTextView, color: String? ->
                view.setTextColorHex(color)
            }

            Prop("fontSize") { view: DotyRichTextView, size: Float? ->
                view.setEditorFontSize(size)
            }

            Prop("action") { view: DotyRichTextView, action: Map<String, Any?>? ->
                view.handleAction(action)
            }
        }
    }

    private fun openConnectionWithRedirects(urlString: String, maxRedirects: Int = 5): HttpURLConnection {
        var url = URL(urlString)
        var redirects = 0
        while (redirects < maxRedirects) {
            val conn = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 15000
                readTimeout = 30000
                instanceFollowRedirects = true
                setRequestProperty("User-Agent", "DotyNotes-Android-Updater")
            }
            val code = conn.responseCode
            if (code == HttpURLConnection.HTTP_MOVED_PERM ||
                code == HttpURLConnection.HTTP_MOVED_TEMP ||
                code == HttpURLConnection.HTTP_SEE_OTHER ||
                code == 307 || code == 308) {
                val location = conn.getHeaderField("Location") ?: throw IOException("Redirect without Location header")
                conn.disconnect()
                url = URL(location)
                redirects++
            } else {
                return conn
            }
        }
        throw IOException("Too many redirects: $redirects")
    }

    private fun launchApkInstaller(context: Context, apkFile: File): Map<String, Any?> {
        return try {
            val contentUri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                apkFile
            )
            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(installIntent)
            mapOf("success" to true, "method" to "package-installer")
        } catch (e: Exception) {
            mapOf("success" to false, "error" to (e.message ?: "Could not launch package installer"))
        }
    }

    private fun verifyApkSignatureMatch(context: Context, archivePath: String): Boolean {
        return try {
            val pm = context.packageManager
            val installedSignatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val pkgInfo = pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNING_CERTIFICATES)
                pkgInfo.signingInfo?.apkContentsSigners
            } else {
                @Suppress("DEPRECATION")
                val pkgInfo = pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNATURES)
                pkgInfo.signatures
            }

            if (installedSignatures.isNullOrEmpty()) return true

            val archiveFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageManager.GET_SIGNING_CERTIFICATES
            } else {
                @Suppress("DEPRECATION")
                PackageManager.GET_SIGNATURES
            }

            val archiveInfo = pm.getPackageArchiveInfo(archivePath, archiveFlags) ?: return false

            val archiveSignatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                archiveInfo.signingInfo?.apkContentsSigners
            } else {
                @Suppress("DEPRECATION")
                archiveInfo.signatures
            }

            if (!archiveSignatures.isNullOrEmpty()) {
                val installedHashes = installedSignatures.map { it.toCharsString() }.toSet()
                val archiveHashes = archiveSignatures.map { it.toCharsString() }.toSet()
                installedHashes.intersect(archiveHashes).isNotEmpty()
            } else {
                true
            }
        } catch (e: Exception) {
            android.util.Log.w("FloatingDotModule", "Signature check warning: ${e.message}")
            true
        }
    }
}
