import React from 'react';
import { Station, LINES } from '../data/rfrData';
import { TRANSLATIONS, Language } from '../data/translations';
import { X, MapPin, Bus, CheckCircle2, Navigation, ArrowRight } from 'lucide-react';

interface StationModalProps {
  station: Station | null;
  onClose: () => void;
  lang: Language;
  onSetAsOrigin: (station: Station) => void;
  onSetAsDestination: (station: Station) => void;
}

export const StationModal: React.FC<StationModalProps> = ({
  station,
  onClose,
  lang,
  onSetAsOrigin,
  onSetAsDestination
}) => {
  if (!station) return null;
  const t = TRANSLATIONS[lang];
  const line = LINES[station.lineId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div
          className="p-5 text-white flex items-center justify-between"
          style={{ backgroundColor: line.bgHex }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm">
              {line.code}
            </span>
            <div>
              <h3 className="text-lg font-bold">
                {lang === 'ar' ? station.nameAr : station.nameFr}
              </h3>
              <p className="text-xs text-white/80">
                {lang === 'ar' ? line.nameAr : line.nameFr} · {station.order} / {line.stations.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Connections */}
          {station.connections && station.connections.length > 0 && (
            <div>
              <span className="font-bold text-slate-800 block mb-2">{t.connections}</span>
              <div className="flex flex-wrap gap-1.5">
                {station.connections.map((c) => (
                  <span
                    key={c}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200 flex items-center gap-1"
                  >
                    <Bus className="w-3 h-3 text-slate-500" />
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Facilities */}
          {station.facilities && station.facilities.length > 0 && (
            <div>
              <span className="font-bold text-slate-800 block mb-2">{t.facilities}</span>
              <div className="flex flex-wrap gap-1.5">
                {station.facilities.map((f) => (
                  <span
                    key={f}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-200 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onSetAsOrigin(station);
                onClose();
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{t.from}</span>
              <Navigation className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                onSetAsDestination(station);
                onClose();
              }}
              className="py-2.5 px-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-500 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{t.to}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
