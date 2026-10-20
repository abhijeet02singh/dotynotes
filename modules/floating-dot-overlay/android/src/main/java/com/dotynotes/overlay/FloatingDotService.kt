package com.dotynotes.overlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

/**
 * Android Foreground Service managing the Floating Dot & Quick Notes Overlay.
 * 
 * Ensures continuous visibility across other applications when the user
 * explicitly grants SYSTEM_ALERT_WINDOW permission.
 */
class FloatingDotService : Service() {

    companion object {
        const val ACTION_START = "com.dotynotes.overlay.ACTION_START"
        const val ACTION_STOP = "com.dotynotes.overlay.ACTION_STOP"
        const val NOTIFICATION_CHANNEL_ID = "dotynotes_floating_channel"
        const val NOTIFICATION_ID = 4040

        var isRunning: Boolean = false
            private set
    }

    private lateinit var windowManager: WindowManager
    private lateinit var dbHelper: OverlayDatabaseHelper
    private var floatingDotView: FloatingDotView? = null
    private var quickNotesView: QuickNotesOverlayView? = null
    private var isPanelOpen = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        dbHelper = OverlayDatabaseHelper(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }

        // Verify overlay permission before starting
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopSelf()
            return START_NOT_STICKY
        }

        startForegroundServiceNotification()
        showFloatingDot()
        isRunning = true

        return START_STICKY
    }

    private fun startForegroundServiceNotification() {
        val stopIntent = Intent(this, FloatingDotService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            0,
            stopIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )

        // Try to launch MainActivity on notification click
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val launchPendingIntent = if (launchIntent != null) {
            PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
            )
        } else null

        val notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("DotyNotes Floating Dot is Active")
            .setContentText("Tap the floating dot on your screen to access quick notes")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(launchPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop Dot", stopPendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val serviceType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            } else {
                0
            }
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, serviceType)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "DotyNotes Overlay Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows active status when the floating dot overlay is on screen"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun showFloatingDot() {
        if (floatingDotView != null) return

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val dotParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 20
            y = 300
        }

        floatingDotView = FloatingDotView(this, windowManager, dotParams) {
            toggleQuickNotesPanel()
        }

        try {
            windowManager.addView(floatingDotView, dotParams)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun toggleQuickNotesPanel() {
        if (isPanelOpen) {
            closeQuickNotesPanel()
        } else {
            openQuickNotesPanel()
        }
    }

    private fun openQuickNotesPanel() {
        if (quickNotesView != null) return

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        // Panel requires focus so user can type into inputs
        val panelParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
            softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
        }

        quickNotesView = QuickNotesOverlayView(
            context = this,
            dbHelper = dbHelper,
            onClose = { closeQuickNotesPanel() },
            onNoteSavedCallback = {
                // Refresh panel notes after saving
            }
        )

        try {
            windowManager.addView(quickNotesView, panelParams)
            isPanelOpen = true
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun closeQuickNotesPanel() {
        if (quickNotesView != null) {
            try {
                windowManager.removeView(quickNotesView)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            quickNotesView = null
            isPanelOpen = false
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        closeQuickNotesPanel()
        if (floatingDotView != null) {
            try {
                windowManager.removeView(floatingDotView)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            floatingDotView = null
        }
        isRunning = false
    }
}
