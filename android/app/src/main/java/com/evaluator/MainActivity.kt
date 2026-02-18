package com.evaluator

import android.view.KeyEvent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.github.kevinejohn.keyevent.KeyEventModule

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "evaluator"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  // Use dispatchKeyEvent instead of onKeyDown — intercepts BEFORE Android swallows volume keys
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
      if (event.action == KeyEvent.ACTION_DOWN) {
          KeyEventModule.getInstance().onKeyDownEvent(event.keyCode, event)
      } else if (event.action == KeyEvent.ACTION_UP) {
          KeyEventModule.getInstance().onKeyUpEvent(event.keyCode, event)
      }
      return super.dispatchKeyEvent(event)
  }

  override fun onKeyMultiple(keyCode: Int, repeatCount: Int, event: KeyEvent?): Boolean {
      KeyEventModule.getInstance().onKeyMultipleEvent(keyCode, repeatCount, event)
      return super.onKeyMultiple(keyCode, repeatCount, event)
  }
}