import React, { useState, useEffect, useRef } from 'react';
import { Compass, RotateCcw, Smartphone, Sliders } from 'lucide-react';
import { GyroState } from '../game/types';
import { calculateGyroVector, Vector2D } from '../game/math';

interface GyroControllerProps {
  onMovementChange: (vec: Vector2D, isFromGyro: boolean) => void;
  onStepDetected?: () => void;
  showTouchControls?: boolean;
}

export const GyroController: React.FC<GyroControllerProps> = ({
  onMovementChange,
  onStepDetected,
  showTouchControls = true
}) => {
  const [gyroState, setGyroState] = useState<GyroState>({
    gamma: 0,
    beta: 0,
    calibratedGamma: 0,
    calibratedBeta: 0,
    hasHardwareGyro: false,
    isActive: false,
    sensitivity: 1.8
  });

  const [virtualTilt, setVirtualTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingTilt, setIsDraggingTilt] = useState(false);
  const touchAreaRef = useRef<HTMLDivElement>(null);
  const lastStepTimeRef = useRef<number>(0);

  // Calibration action
  const calibrate = () => {
    setGyroState((prev) => ({
      ...prev,
      calibratedGamma: prev.gamma,
      calibratedBeta: prev.beta
    }));
  };

  // Hardware DeviceOrientation Listener
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        setGyroState((prev) => {
          const newState = {
            ...prev,
            gamma: Math.round(e.gamma || 0),
            beta: Math.round(e.beta || 0),
            hasHardwareGyro: true,
            isActive: true
          };

          const vec = calculateGyroVector(
            newState.gamma,
            newState.beta,
            newState.calibratedGamma,
            newState.calibratedBeta,
            3.5,
            newState.sensitivity
          );

          onMovementChange(vec, true);
          return newState;
        });
      }
    };

    // Hardware Motion / Step detector
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;
      const mag = Math.hypot(acc.x, acc.y, acc.z);

      // Pedometer footstep threshold (acceleration spike > 12.5 m/s^2)
      const now = Date.now();
      if (mag > 12.5 && now - lastStepTimeRef.current > 380) {
        lastStepTimeRef.current = now;
        onStepDetected?.();
      }
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation);
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, [onMovementChange, onStepDetected]);

  // Request permissions for iOS 13+ or modern mobile browsers
  const requestGyroPermission = async () => {
    const DeviceOrientation = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DeviceOrientation?.requestPermission === 'function') {
      try {
        const response = await DeviceOrientation.requestPermission();
        if (response === 'granted') {
          calibrate();
        }
      } catch (err) {
        console.warn('Error requesting orientation permission', err);
      }
    } else {
      calibrate();
    }
  };

  // Virtual wrist tilt handlers (Mouse / Touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDraggingTilt(true);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!touchAreaRef.current) return;
    const rect = touchAreaRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const radius = rect.width / 2;

    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, radius);
    const angle = Math.atan2(dy, dx);

    const normX = Math.cos(angle) * (clampedDist / radius);
    const normY = Math.sin(angle) * (clampedDist / radius);

    setVirtualTilt({ x: normX, y: normY });

    // Send movement vector
    onMovementChange({ x: normX, y: normY }, false);
  };

  const handlePointerUp = () => {
    setIsDraggingTilt(false);
    setVirtualTilt({ x: 0, y: 0 });
    onMovementChange({ x: 0, y: 0 }, false);
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Interactive Virtual Wrist Controller (Only if touch controls are visible) */}
      {showTouchControls && (
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-between w-full px-2 text-[10px] text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-mono">
              <Compass className="w-3 h-3 text-cyan-400" />
              Inclinación Muñeca
            </span>
            <button
              onClick={calibrate}
              aria-label="Calibrar centro del giroscopio"
              className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Calibrar</span>
            </button>
          </div>

          {/* Tactile Circular Joystick / Tilt Pad */}
          <div
            ref={touchAreaRef}
            onPointerDown={handlePointerDown}
            onPointerMove={isDraggingTilt ? handlePointerMove : undefined}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative w-28 h-28 rounded-full bg-slate-900/90 border-2 border-slate-700/80 shadow-inner flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
            title="Arrastra para simular el giro de tu muñeca en el reloj"
          >
            {/* Crosshairs */}
            <div className="absolute inset-x-3 top-1/2 h-px bg-slate-700/40 -translate-y-1/2" />
            <div className="absolute inset-y-3 left-1/2 w-px bg-slate-700/40 -translate-x-1/2" />

            {/* Tilt Direction Labels */}
            <span className="absolute top-1 text-[8px] text-slate-500 font-mono">ARRIBA</span>
            <span className="absolute bottom-1 text-[8px] text-slate-500 font-mono">ABAJO</span>
            <span className="absolute left-1.5 text-[8px] text-slate-500 font-mono">IZQ</span>
            <span className="absolute right-1.5 text-[8px] text-slate-500 font-mono">DER</span>

            {/* Inner Floating Wrist Puck */}
            <div
              className={`w-9 h-9 rounded-full shadow-lg flex items-center justify-center transition-transform duration-75 border ${
                isDraggingTilt
                  ? 'bg-cyan-500 border-cyan-300 scale-105'
                  : 'bg-slate-800 border-slate-600'
              }`}
              style={{
                transform: `translate(${virtualTilt.x * 34}px, ${virtualTilt.y * 34}px)`
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
            </div>
          </div>

          <div className="text-[9px] text-slate-500 text-center mt-1">
            Mueve tu reloj o arrastra el joystick
          </div>
        </div>
      )}
    </div>
  );
};
