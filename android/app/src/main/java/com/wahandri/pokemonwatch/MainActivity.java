package com.wahandri.pokemonwatch;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;

import org.mozilla.geckoview.GeckoRuntime;
import org.mozilla.geckoview.GeckoRuntimeSettings;
import org.mozilla.geckoview.GeckoSession;
import org.mozilla.geckoview.GeckoSessionSettings;
import org.mozilla.geckoview.GeckoView;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

import fi.iki.elonen.NanoHTTPD;

/**
 * Contenedor Wear OS de PokeWatch.
 *
 * Wear OS no soporta WebView, asi que la app embebe GeckoView (motor de
 * Firefox). La web se sirve desde un servidor local (NanoHTTPD) para tener un
 * origen http real: asi funcionan localStorage, fetch y las rutas relativas.
 *
 * Los sensores se publican en /sensors y el puente JS (pw-bridge.js) los lee
 * por fetch. No hace falta puente nativo de JavaScript.
 */
public class MainActivity extends Activity implements SensorEventListener {

    private static final String TAG = "PokeWatch";
    private static final int BASE_PORT = 8765;

    private GeckoRuntime geckoRuntime;
    private GeckoSession geckoSession;
    private GeckoView geckoView;
    private AssetServer server;
    private int port = BASE_PORT;

    private SensorManager sensorManager;
    private final float[] rotationMatrix = new float[9];
    private final float[] orientation = new float[3];

    private volatile float beta = 0f;
    private volatile float gamma = 0f;
    private volatile float accelX = 0f;
    private volatile float accelY = 0f;
    private volatile float accelZ = SensorManager.GRAVITY_EARTH;
    private volatile boolean hasRotationSensor = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);

        if (!startServer()) {
            Log.e(TAG, "No se pudo arrancar el servidor local");
        }

        try {
            GeckoRuntimeSettings runtimeSettings = new GeckoRuntimeSettings.Builder()
                    .consoleOutput(true)
                    .build();
            geckoRuntime = GeckoRuntime.create(this, runtimeSettings);

            GeckoSessionSettings sessionSettings = new GeckoSessionSettings.Builder()
                    .userAgentMode(GeckoSessionSettings.USER_AGENT_MODE_MOBILE)
                    .build();

            geckoSession = new GeckoSession(sessionSettings);
            geckoSession.open(geckoRuntime);

            geckoView = new GeckoView(this);
            geckoView.setSession(geckoSession);
            geckoView.setBackgroundColor(Color.BLACK);

            setContentView(geckoView);
            hideSystemUi();

            geckoSession.loadUri("http://127.0.0.1:" + port + "/index.html");
        } catch (Throwable t) {
            Log.e(TAG, "No se pudo iniciar GeckoView", t);
            showError(t);
        }
    }

    // ------------------------------------------------------------- servidor

    private boolean startServer() {
        for (int candidate = BASE_PORT; candidate < BASE_PORT + 5; candidate++) {
            try {
                AssetServer candidateServer = new AssetServer(candidate);
                candidateServer.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false);
                server = candidateServer;
                port = candidate;
                return true;
            } catch (IOException e) {
                Log.w(TAG, "Puerto " + candidate + " ocupado");
            }
        }
        return false;
    }

    private class AssetServer extends NanoHTTPD {

        AssetServer(int port) {
            super(port);
        }

        @Override
        public Response serve(IHTTPSession session) {
            String uri = session.getUri();
            if (uri == null || uri.isEmpty() || "/".equals(uri)) {
                uri = "/index.html";
            }

            if ("/sensors".equals(uri)) {
                String json = String.format(
                        Locale.US,
                        "{\"beta\":%.2f,\"gamma\":%.2f,\"ax\":%.2f,\"ay\":%.2f,\"az\":%.2f,\"hasGyro\":%s}",
                        beta, gamma, accelX, accelY, accelZ, hasRotationSensor);
                Response response = newFixedLengthResponse(Response.Status.OK, "application/json", json);
                response.addHeader("Cache-Control", "no-store");
                return response;
            }

            try {
                InputStream stream = getAssets().open("www" + uri);
                Response response = newChunkedResponse(Response.Status.OK, guessMimeType(uri), stream);
                response.addHeader("Cache-Control", "no-store");
                return response;
            } catch (IOException e) {
                return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "404");
            }
        }
    }

    private void showError(Throwable t) {
        android.widget.TextView error = new android.widget.TextView(this);
        error.setText("No se pudo arrancar el motor del juego.\n\n"
                + "Detalle: " + t.getClass().getSimpleName() + ": " + t.getMessage());
        error.setTextColor(Color.WHITE);
        error.setBackgroundColor(Color.BLACK);
        error.setPadding(24, 24, 24, 24);
        setContentView(error);
        hideSystemUi();
    }

    private static String guessMimeType(String path) {
        String clean = path.toLowerCase(Locale.US);
        int dot = clean.lastIndexOf('.');
        String ext = dot >= 0 ? clean.substring(dot + 1) : "";
        switch (ext) {
            case "html":
            case "htm":
                return "text/html";
            case "js":
            case "mjs":
                return "text/javascript";
            case "css":
                return "text/css";
            case "json":
                return "application/json";
            case "svg":
                return "image/svg+xml";
            case "png":
                return "image/png";
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "webp":
                return "image/webp";
            case "gif":
                return "image/gif";
            case "ico":
                return "image/x-icon";
            case "woff":
                return "font/woff";
            case "woff2":
                return "font/woff2";
            case "ttf":
                return "font/ttf";
            case "mp3":
                return "audio/mpeg";
            case "wav":
                return "audio/wav";
            case "ogg":
                return "audio/ogg";
            default:
                return "application/octet-stream";
        }
    }

    // ------------------------------------------------------------- sensores

    private void registerSensors() {
        if (sensorManager == null) {
            return;
        }
        Sensor rotation = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        if (rotation == null) {
            rotation = sensorManager.getDefaultSensor(Sensor.TYPE_GAME_ROTATION_VECTOR);
        }
        hasRotationSensor = rotation != null;
        if (rotation != null) {
            sensorManager.registerListener(this, rotation, SensorManager.SENSOR_DELAY_GAME);
        }

        Sensor accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        if (accelerometer != null) {
            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_UI);
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_ROTATION_VECTOR
                || event.sensor.getType() == Sensor.TYPE_GAME_ROTATION_VECTOR) {
            SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values);
            SensorManager.getOrientation(rotationMatrix, orientation);

            float pitch = (float) Math.toDegrees(orientation[1]);
            float roll = (float) Math.toDegrees(orientation[2]);

            while (roll > 180f) roll -= 360f;
            while (roll < -180f) roll += 360f;
            if (roll > 90f) roll = 180f - roll;
            if (roll < -90f) roll = -180f - roll;

            beta = pitch;
            gamma = roll;
        } else if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            accelX = event.values[0];
            accelY = event.values[1];
            accelZ = event.values[2];
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // Sin uso.
    }

    // --------------------------------------------------------- ciclo de vida

    @Override
    protected void onResume() {
        super.onResume();
        registerSensors();
        if (geckoSession != null) {
            geckoSession.setActive(true);
            geckoSession.setFocused(true);
        }
        hideSystemUi();
    }

    @Override
    protected void onPause() {
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        if (geckoSession != null) {
            geckoSession.setActive(false);
            geckoSession.setFocused(false);
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (server != null) {
            server.stop();
            server = null;
        }
        if (geckoSession != null) {
            geckoSession.close();
            geckoSession = null;
        }
        if (geckoRuntime != null) {
            geckoRuntime.shutdown();
            geckoRuntime = null;
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUi();
        }
    }

    private void hideSystemUi() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                getWindow().setDecorFitsSystemWindows(false);
                View decor = getWindow().getDecorView();
                WindowInsetsController controller = decor != null ? decor.getWindowInsetsController() : null;
                if (controller != null) {
                    controller.hide(WindowInsets.Type.systemBars());
                    controller.setSystemBarsBehavior(
                            WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                }
            } else {
                View decor = getWindow().getDecorView();
                if (decor != null) {
                    decor.setSystemUiVisibility(
                            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
                }
            }
        } catch (Throwable ignored) {
            // Sin barras ocultas se juega igual.
        }
    }
}
