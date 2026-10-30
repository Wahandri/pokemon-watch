/*
 * Puente entre los sensores de Wear OS y la app web.
 *
 * El contenedor nativo (MainActivity.java) expone los valores del sensor de
 * rotacion y del acelerometro en window.PokeSensor. Este script los transforma
 * en eventos deviceorientation / devicemotion normales para que el juego
 * funcione igual que en un navegador de movil.
 *
 * Solo emite eventos sinteticos si el WebView no entrega eventos reales, para
 * no duplicar lecturas.
 */
(function () {
  'use strict';

  if (window.__pwSensorBridge) {
    return;
  }
  window.__pwSensorBridge = true;

  var realOrientation = 0;
  var realMotion = 0;

  // Algunos WebView de Wear OS no exponen los constructores aunque si
  // entreguen los eventos.
  if (!('DeviceOrientationEvent' in window)) {
    window.DeviceOrientationEvent = function DeviceOrientationEvent() {};
  }
  if (!('DeviceMotionEvent' in window)) {
    window.DeviceMotionEvent = function DeviceMotionEvent() {};
  }

  window.addEventListener('deviceorientation', function (e) {
    if (!e.__pwSynthetic && e.beta != null && e.gamma != null) {
      realOrientation++;
    }
  }, true);

  window.addEventListener('devicemotion', function (e) {
    if (!e.__pwSynthetic && e.accelerationIncludingGravity != null) {
      realMotion++;
    }
  }, true);

  function dispatch(type, props) {
    var event = new Event(type);
    for (var key in props) {
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        try {
          event[key] = props[key];
        } catch (err) {
          // Propiedad de solo lectura: se ignora.
        }
      }
    }
    event.__pwSynthetic = true;
    window.dispatchEvent(event);
  }

  // En GeckoView no hay puente nativo de JavaScript: los sensores se leen del
  // servidor local (/sensors) que arranca la app.
  var httpSensors = null;

  function pollHttpSensors() {
    fetch('/sensors', { cache: 'no-store' })
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (data) {
        if (data) {
          httpSensors = data;
        }
      })
      .catch(function () {
        // Sin servidor local (WebView): se ignora.
      });
  }

  setInterval(pollHttpSensors, 80);

  function sensorValue(name) {
    var native = window.PokeSensor;
    if (native) {
      if (name === 'hasGyro') return native.hasGyroscope();
      if (name === 'beta') return native.getBeta();
      if (name === 'gamma') return native.getGamma();
      if (name === 'ax') return native.getAccelX();
      if (name === 'ay') return native.getAccelY();
      if (name === 'az') return native.getAccelZ();
    }
    if (httpSensors) {
      return httpSensors[name];
    }
    return null;
  }

  setInterval(function () {
    // Orientacion (giroscopio / vector de rotacion)
    if (realOrientation === 0 && sensorValue('hasGyro')) {
      dispatch('deviceorientation', {
        alpha: 0,
        beta: sensorValue('beta'),
        gamma: sensorValue('gamma'),
        absolute: false
      });
    }

    // Aceleracion (podometro del juego: detecta pasos > 12.5 m/s^2)
    if (realMotion === 0) {
      dispatch('devicemotion', {
        acceleration: { x: 0, y: 0, z: 0 },
        accelerationIncludingGravity: {
          x: sensorValue('ax'),
          y: sensorValue('ay'),
          z: sensorValue('az')
        },
        rotationRate: { alpha: null, beta: null, gamma: null },
        interval: 60
      });
    }
  }, 60);
})();
