package com.saltnpepperstaff

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.os.Build
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import java.nio.charset.Charset
import java.util.UUID
import java.util.concurrent.Executors

class SaltNPepperPrinterModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val worker = Executors.newSingleThreadExecutor()
  private val sppUuid = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

  override fun getName() = "SaltNPepperPrinter"

  private fun adapter(): BluetoothAdapter? =
    (context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter

  @SuppressLint("MissingPermission")
  @ReactMethod
  fun getBondedPrinters(promise: Promise) {
    try {
      val bluetooth = adapter() ?: return promise.reject("BLUETOOTH_UNSUPPORTED", "Bluetooth is not supported on this device.")
      if (!bluetooth.isEnabled) return promise.reject("BLUETOOTH_DISABLED", "Turn on Bluetooth and retry.")
      val printers = WritableNativeArray()
      bluetooth.bondedDevices.sortedBy { it.name ?: it.address }.forEach { device ->
        printers.pushMap(WritableNativeMap().apply {
          putString("name", device.name ?: "Bluetooth printer")
          putString("address", device.address)
        })
      }
      promise.resolve(printers)
    } catch (error: SecurityException) {
      promise.reject("BLUETOOTH_PERMISSION", "Nearby devices permission is required.", error)
    }
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  fun printEscPos(address: String, receipt: String, paperWidth: Int, autoCut: Boolean, promise: Promise) {
    worker.execute {
      try {
        val bluetooth = adapter() ?: throw IllegalStateException("Bluetooth is not supported on this device.")
        if (!bluetooth.isEnabled) throw IllegalStateException("Turn on Bluetooth and retry.")
        val device = bluetooth.bondedDevices.firstOrNull { it.address == address }
          ?: throw IllegalArgumentException("Printer is not paired. Pair it in Android Settings first.")
        device.createRfcommSocketToServiceRecord(sppUuid).use { socket ->
          socket.connect()
          socket.outputStream.use { output ->
            output.write(byteArrayOf(0x1B, 0x40))
            output.write(receipt.toByteArray(Charset.forName("CP437")))
            output.write(byteArrayOf(0x0A, 0x0A))
            if (autoCut) output.write(byteArrayOf(0x1D, 0x56, 0x00))
            output.flush()
          }
        }
        promise.resolve(null)
      } catch (error: SecurityException) {
        promise.reject("BLUETOOTH_PERMISSION", "Nearby devices permission is required.", error)
      } catch (error: Exception) {
        promise.reject("PRINT_FAILED", error.message ?: "Could not print the receipt.", error)
      }
    }
  }

  @ReactMethod
  fun printDocument(receipt: String, documentName: String, paperWidth: Int, promise: Promise) {
    val activity = reactApplicationContext.currentActivity ?: return promise.reject("NO_ACTIVITY", "Open the app before printing.")
    activity.runOnUiThread {
      val escaped = receipt.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
      val webView = WebView(activity)
      webView.webViewClient = object : WebViewClient() {
        override fun onPageFinished(view: WebView, url: String) {
          val manager = activity.getSystemService(Context.PRINT_SERVICE) as PrintManager
          val adapter = if (Build.VERSION.SDK_INT >= 21) view.createPrintDocumentAdapter(documentName) else view.createPrintDocumentAdapter()
          val widthMils = if (paperWidth == 80) 3150 else 2283
          val heightMils = (receipt.trimEnd().lineSequence().count() * 125 + 240).coerceAtLeast(1200)
          val mediaSize = PrintAttributes.MediaSize("THERMAL_$paperWidth", "$paperWidth mm receipt", widthMils, heightMils)
          val attributes = PrintAttributes.Builder()
            .setMediaSize(mediaSize)
            .setMinMargins(PrintAttributes.Margins(80, 80, 80, 80))
            .setColorMode(PrintAttributes.COLOR_MODE_MONOCHROME)
            .build()
          manager.print("Zambiel-$documentName", adapter, attributes)
          promise.resolve(null)
        }
      }
      webView.loadDataWithBaseURL(
        null,
        "<html><head><style>@page{margin:0}body{font:7pt/1.25 monospace;white-space:pre-wrap;margin:1mm}</style></head><body>$escaped</body></html>",
        "text/html",
        "UTF-8",
        null,
      )
    }
  }

  override fun invalidate() {
    worker.shutdownNow()
    super.invalidate()
  }
}
