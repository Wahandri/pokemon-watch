import React from 'react';
import { Smartphone, Download, X, Watch, Check, ExternalLink } from 'lucide-react';

interface InstallGuideModalProps {
  onClose: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ onClose }) => {
  return (
    <div className="watch-safe absolute inset-0 bg-slate-950/95 z-50 flex flex-col p-3 sm:p-5 text-white overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Watch className="w-4 h-4 text-emerald-400" />
          <h2
            className="text-xs sm:text-sm font-bold text-emerald-400 tracking-wider"
            style={{ fontFamily: '"Press Start 2P", monospace' }}
          >
            Xiaomi Watch 2
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar guía de instalación"
          className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Guide Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1 text-xs text-slate-300 leading-relaxed scrollbar-thin">
        {/* Method 1: Web PWA (Fastest) */}
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">1</span>
            <span>Método Rápido: Navegador Wear OS</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Abre el navegador en tu Xiaomi Watch 2 (como Samsung Internet para Wear OS o Wear Browser) e ingresa a este enlace. Puedes agregarlo a la pantalla de inicio como acceso directo a pantalla completa.
          </p>
        </div>

        {/* Method 2: Convert to Standalone APK */}
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
            <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">2</span>
            <span>Instalar como APK Nativo (Sideloading)</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
            <li>Usa <strong>PWABuilder</strong> o <strong>Bubblewrap</strong> introduciendo la URL de esta app para generar el archivo <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">.apk</code> para Android/Wear OS.</li>
            <li>En tu Xiaomi Watch 2, activa las <em>Opciones de desarrollador</em> y activa <em>Depuración ADB</em> por Wi-Fi.</li>
            <li>Desde tu teléfono Android con la app <strong>Easy Fire Tools</strong> o desde tu PC mediante <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">adb install pokewatch.apk</code>.</li>
          </ol>
        </div>

        {/* Sensor notes */}
        <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30 text-[10px] text-amber-200">
          <strong>Tip de Giroscopio:</strong> Al abrir el juego en el reloj, mantén la muñeca en posición cómoda y pulsa el botón de la brújula para <strong>Calibrar</strong> el punto cero de tu inclinación.
        </div>
      </div>

      {/* Close button */}
      <div className="pt-2">
        <button
          onClick={onClose}
          aria-label="Entendido"
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs active:scale-98 transition-transform cursor-pointer"
        >
          ¡Entendido, a jugar!
        </button>
      </div>
    </div>
  );
};
