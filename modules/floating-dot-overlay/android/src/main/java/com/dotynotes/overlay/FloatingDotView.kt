package com.dotynotes.overlay

import android.content.Context
import android.content.res.Configuration
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.os.Handler
import android.os.Looper
import android.util.DisplayMetrics
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.WindowManager
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * Modern Edge-Attached Floating Handle for DotyNotes.
 * 
 * Replaces the circular dot with a slim, rounded, edge tab
 * that automatically follows the active DotyNotes color theme.
 * Stays flush against the left or right screen edge, supports
 * smooth vertical dragging, remembers its last position, and
 * cleanly distinguishes taps from drag gestures.
 */
class FloatingDotView(
    context: Context,
    private val windowManager: WindowManager,
    val layoutParams: WindowManager.LayoutParams,
    private val repository: OverlayNoteRepository? = null,
    private val onDotClicked: () -> Unit
) : View(context) {

    private val density = resources.displayMetrics.density
    val handleWidth = (20 * density).toInt()
    val handleHeight = (78 * density).toInt()

    private val mainHandler = Handler(Looper.getMainLooper())
    private val prefs = context.getSharedPreferences("dotynotes_floating_prefs", Context.MODE_PRIVATE)

    var isLeftEdge: Boolean = prefs.getBoolean("is_left_edge", true)
        private set

    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var isDragging = false
    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop

    // Paints
    private val tabPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }
    private val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 1.2f * density
    }
    private val gripPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }
    private val dotGlowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }
    private val dotCorePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }

    private val path = Path()
    private val rect = RectF()

    private fun isSystemDark(): Boolean {
        val uiMode = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
        return uiMode == Configuration.UI_MODE_NIGHT_YES
    }

    private fun getCurrentTheme(): OverlayTheme {
        return repository?.getResolvedTheme(isSystemDark())
            ?: OverlayTheme.resolveTheme(null, isSystemDark())
    }

    fun updateThemePaints() {
        val theme = getCurrentTheme()
        val h = if (height > 0) height.toFloat() else handleHeight.toFloat()

        tabPaint.color = theme.colors.primary
        tabPaint.shader = LinearGradient(
            0f, 0f, 0f, h,
            theme.colors.primary,
            theme.colors.primaryDark,
            Shader.TileMode.CLAMP
        )
        borderPaint.color = theme.colors.primaryLight

        // Tactile grip bar: Crisp translucent white gives premium contrast across all 7 color themes
        gripPaint.color = if (theme.isDark) Color.parseColor("#E2E8F0") else Color.parseColor("#FFFFFF")
        gripPaint.alpha = 210

        // Status accent indicator dot: On green/mint backgrounds use pure white contrast, otherwise signature emerald
        val isGreenish = theme.colorTheme.equals("mint", ignoreCase = true) || theme.colorTheme.equals("green", ignoreCase = true)
        dotGlowPaint.color = theme.colors.primarySoft
        dotCorePaint.color = if (isGreenish) Color.parseColor("#FFFFFF") else Color.parseColor("#10B981")

        invalidate()
    }

    private val themeListener: () -> Unit = {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            updateThemePaints()
        } else {
            mainHandler.post { updateThemePaints() }
        }
        Unit
    }

    init {
        // Restore last known position
        val savedY = prefs.getInt("saved_y", (160 * density).toInt())
        layoutParams.width = handleWidth
        layoutParams.height = handleHeight
        layoutParams.y = savedY
        updateEdgePosition(isLeftEdge, save = false)

        updateThemePaints()
        repository?.addThemeUpdatedListener(themeListener)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        repository?.addThemeUpdatedListener(themeListener)
        updateThemePaints()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        repository?.removeThemeUpdatedListener(themeListener)
    }

    override fun onVisibilityChanged(changedView: View, visibility: Int) {
        super.onVisibilityChanged(changedView, visibility)
        if (visibility == View.VISIBLE) {
            updateThemePaints()
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        if (Looper.myLooper() == Looper.getMainLooper()) {
            updateThemePaints()
        } else {
            mainHandler.post { updateThemePaints() }
        }
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        setMeasuredDimension(handleWidth, handleHeight)
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        updateThemePaints()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (tabPaint.shader == null) {
            updateThemePaints()
        }
        val w = width.toFloat()
        val h = height.toFloat()
        val radius = 12f * density

        rect.set(0f, 0f, w, h)
        path.reset()

        val radii = if (isLeftEdge) {
            // Flat on left edge, rounded on right edge
            floatArrayOf(
                0f, 0f,                 // Top-Left
                radius, radius,         // Top-Right
                radius, radius,         // Bottom-Right
                0f, 0f                  // Bottom-Left
            )
        } else {
            // Flat on right edge, rounded on left edge
            floatArrayOf(
                radius, radius,         // Top-Left
                0f, 0f,                 // Top-Right
                0f, 0f,                 // Bottom-Right
                radius, radius          // Bottom-Left
            )
        }

        path.addRoundRect(rect, radii, Path.Direction.CW)
        canvas.drawPath(path, tabPaint)
        canvas.drawPath(path, borderPaint)

        // Draw Doty brand elements inside the handle
        val centerX = if (isLeftEdge) w * 0.45f else w * 0.55f

        // 1. Signature Doty mini-dot near top
        val dotY = 18f * density
        val dotRadius = 3.2f * density
        canvas.drawCircle(centerX, dotY, dotRadius + (2f * density), dotGlowPaint)
        canvas.drawCircle(centerX, dotY, dotRadius, dotCorePaint)

        // 2. Slim tactile grip bar in the center
        val gripW = 3f * density
        val gripH = 26f * density
        val gripTop = dotY + (10f * density)
        val gripRect = RectF(
            centerX - (gripW / 2f),
            gripTop,
            centerX + (gripW / 2f),
            gripTop + gripH
        )
        canvas.drawRoundRect(gripRect, gripW / 2f, gripW / 2f, gripPaint)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                initialX = layoutParams.x
                initialY = layoutParams.y
                initialTouchX = event.rawX
                initialTouchY = event.rawY
                isDragging = false
                return true
            }

            MotionEvent.ACTION_MOVE -> {
                val dx = event.rawX - initialTouchX
                val dy = event.rawY - initialTouchY

                if (!isDragging && (abs(dx) > touchSlop || abs(dy) > touchSlop)) {
                    isDragging = true
                }

                if (isDragging) {
                    val displayMetrics = DisplayMetrics()
                    @Suppress("DEPRECATION")
                    windowManager.defaultDisplay.getMetrics(displayMetrics)

                    val screenWidth = displayMetrics.widthPixels
                    val screenHeight = displayMetrics.heightPixels

                    var newX = initialX + dx.toInt()
                    var newY = initialY + dy.toInt()

                    // Clamp to visible vertical screen boundaries so it doesn't block status or nav bar
                    val minY = (48 * density).toInt()
                    val maxY = screenHeight - handleHeight - (64 * density).toInt()
                    newX = max(0, min(newX, screenWidth - handleWidth))
                    newY = max(minY, min(newY, maxY))

                    layoutParams.x = newX
                    layoutParams.y = newY
                    try {
                        windowManager.updateViewLayout(this, layoutParams)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                return true
            }

            MotionEvent.ACTION_UP -> {
                if (!isDragging) {
                    // Tap detected! Open Quick Pad
                    onDotClicked()
                } else {
                    // Snap to closest screen edge (flush left or flush right)
                    snapToEdge()
                }
                return true
            }
        }
        return super.onTouchEvent(event)
    }

    private fun snapToEdge() {
        val displayMetrics = DisplayMetrics()
        @Suppress("DEPRECATION")
        windowManager.defaultDisplay.getMetrics(displayMetrics)
        val screenWidth = displayMetrics.widthPixels

        val shouldBeLeft = (layoutParams.x + (handleWidth / 2)) < (screenWidth / 2)
        updateEdgePosition(shouldBeLeft, save = true)
    }

    private fun updateEdgePosition(leftEdge: Boolean, save: Boolean) {
        val displayMetrics = DisplayMetrics()
        @Suppress("DEPRECATION")
        windowManager.defaultDisplay.getMetrics(displayMetrics)
        val screenWidth = displayMetrics.widthPixels

        isLeftEdge = leftEdge
        layoutParams.x = if (isLeftEdge) 0 else screenWidth - handleWidth

        if (save) {
            prefs.edit()
                .putBoolean("is_left_edge", isLeftEdge)
                .putInt("saved_y", layoutParams.y)
                .apply()
        }

        invalidate()

        try {
            windowManager.updateViewLayout(this, layoutParams)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
