package com.dotynotes.overlay

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo Native Module bridge for FloatingDotOverlay.
 * 
 * Provides safe JS methods to query overlay permissions, open Android
 * Settings, and start or stop the native floating service.
 */
class FloatingDotModule : Module() {

    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("React Context is null")

    override fun definition() = ModuleDefinition {
        Name("FloatingDotOverlay")

        Function("isSupported") {
            // Overlay WindowManager is supported on Android
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
    }
}
