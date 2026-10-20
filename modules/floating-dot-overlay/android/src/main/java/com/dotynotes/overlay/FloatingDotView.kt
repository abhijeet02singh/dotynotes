package com.dotynotes.overlay

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.DisplayMetrics
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.WindowManager
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * Native Android Draggable Floating Dot View.
 * 
 * Rendered using a custom Canvas with DotyNotes purple brand colors.
 * Supports smooth touch dragging with strict screen-boundary clamping
 * and tap-to-toggle detection.
 */
class FloatingDotView(
    context: Context,
    private val windowManager: WindowManager,
    val layoutParams: WindowManager.LayoutParams,
    private val onDotClicked: () -> Unit
) : View(context) {

    private val density = resources.displayMetrics.density
    val dotSizePx = (56 * density).toInt()

    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var isDragging = false
    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop

    // Paints for custom circular Doty logo
    private val outerShadowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#334C1D95")
        style = Paint.Style.FILL
    }
    private val outerCirclePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#6D28D9") // Brand primary purple
        style = Paint.Style.FILL
    }
    private val noteBodyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.FILL
    }
    private val noteLinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#8B5CF6")
        strokeWidth = 2.5f * density
        strokeCap = Paint.Cap.ROUND
    }
    private val dotyGlowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#EDE9FE")
        style = Paint.Style.FILL
    }
    private val dotyCorePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#10B981") // Active dot green
        style = Paint.Style.FILL
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        setMeasuredDimension(dotSizePx, dotSizePx)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val cx = width / 2f
        val cy = height / 2f
        val radius = (width / 2f) - (2 * density)

        // Outer circular background
        canvas.drawCircle(cx, cy, radius, outerCirclePaint)

        // Mini note sheet inside
        val noteW = 18 * density
        val noteH = 22 * density
        val noteLeft = cx - (noteW / 2f)
        val noteTop = cy - (noteH / 2f)
        val noteRect = RectF(noteLeft, noteTop, noteLeft + noteW, noteTop + noteH)
        canvas.drawRoundRect(noteRect, 3 * density, 3 * density, noteBodyPaint)

        // Note lines
        val lineXStart = noteLeft + (4 * density)
        val lineXEndLong = noteLeft + noteW - (4 * density)
        val lineXEndShort = noteLeft + (noteW * 0.65f)
        val line1Y = noteTop + (7 * density)
        val line2Y = noteTop + (13 * density)
        canvas.drawLine(lineXStart, line1Y, lineXEndLong, line1Y, noteLinePaint)
        canvas.drawLine(lineXStart, line2Y, lineXEndShort, line2Y, noteLinePaint)

        // Signature floating Doty dot in top right
        val dotGlowRadius = 6 * density
        val dotCoreRadius = 3.5f * density
        val dotCenterX = cx + (radius * 0.55f)
        val dotCenterY = cy - (radius * 0.55f)
        canvas.drawCircle(dotCenterX, dotCenterY, dotGlowRadius, dotyGlowPaint)
        canvas.drawCircle(dotCenterX, dotCenterY, dotCoreRadius, dotyCorePaint)
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

                    // Clamp to visible screen boundaries
                    newX = max(0, min(newX, screenWidth - dotSizePx))
                    newY = max(60, min(newY, screenHeight - dotSizePx - 80))

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
                    // Tap detected!
                    onDotClicked()
                } else {
                    // Snap to closest screen edge (left or right)
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

        val targetX = if (layoutParams.x + (dotSizePx / 2) < screenWidth / 2) {
            10 // Snap to left edge with small margin
        } else {
            screenWidth - dotSizePx - 10 // Snap to right edge
        }

        layoutParams.x = targetX
        try {
            windowManager.updateViewLayout(this, layoutParams)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
