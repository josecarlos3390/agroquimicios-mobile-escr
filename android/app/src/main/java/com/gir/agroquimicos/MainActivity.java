package com.gir.agroquimicos;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onBackPressed() {
    getBridge().getWebView().evaluateJavascript(
      "(function(){ return window._backPresionado === true; })()",
      result -> {
        if ("true".equals(result)) {
          // Segunda pulsación — cerrar normalmente
          runOnUiThread(() -> super.onBackPressed());
        } else {
          // Primera pulsación — dejar que JS maneje
          getBridge().getWebView().post(() ->
            getBridge().getWebView().evaluateJavascript(
              "window._manejarBack && window._manejarBack();", null
            )
          );
        }
      }
    );
  }
}