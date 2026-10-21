package com.dotynotes.overlay

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.os.bundleOf
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo Native Module bridge for FloatingDotOverlay.
 * 
 * Provides safe JS methods to query overlay permissions, open Android
 * Settings, start or stop the native floating service, synchronize note data,
 * and execute automated database recovery.
 */
class FloatingDotModule : Module() {

    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("React Context is null")

    override fun definition() = ModuleDefinition {
        Name("FloatingDotOverlay")

        Events("onQuickNoteSaved", "onQuickNoteMutation")

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
    }
}
