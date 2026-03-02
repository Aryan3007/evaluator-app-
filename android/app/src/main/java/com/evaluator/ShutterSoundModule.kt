package com.evaluator

import android.media.AudioManager
import android.media.MediaActionSound
import android.media.ToneGenerator
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ShutterSoundModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var mediaActionSound: MediaActionSound? = null
    private var toneGenerator: ToneGenerator? = null

    override fun getName(): String = "ShutterSound"

    override fun initialize() {
        super.initialize()
        mediaActionSound = MediaActionSound().apply {
            load(MediaActionSound.SHUTTER_CLICK)
        }
        toneGenerator = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
    }

    @ReactMethod
    fun play() {
        mediaActionSound?.play(MediaActionSound.SHUTTER_CLICK)
    }

    @ReactMethod
    fun playPopup() {
        toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP, 300)
    }

    @ReactMethod
    fun playConfirm() {
        toneGenerator?.startTone(ToneGenerator.TONE_PROP_ACK, 200)
    }

    @ReactMethod
    fun playSuccess() {
        toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP2, 400)
    }

    @ReactMethod
    fun playError() {
        toneGenerator?.startTone(ToneGenerator.TONE_PROP_NACK, 500)
    }

    override fun invalidate() {
        mediaActionSound?.release()
        mediaActionSound = null
        toneGenerator?.release()
        toneGenerator = null
        super.invalidate()
    }
}
