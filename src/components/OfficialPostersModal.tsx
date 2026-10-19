import React, { useState } from 'react';
import { LINES, ALL_SCHEDULES } from '../data/rfrData';
import { TRANSLATIONS, Language } from '../data/translations';
import { X, Download, Printer, Check, Info } from 'lucide-react';

interface OfficialPostersModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  defaultLine?: string;
}

export const OfficialPostersModal: React.FC<OfficialPostersModalProps> = ({
  isOpen,
  onClose,
  lang,
  defaultLine = 'D'
}) => {
  const t = TRANSLATIONS[lang];
  const [activeLine, setActiveLine] = useState<string>(defaultLine);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentLine = LINES[activeLine];
  const outboundTrains = ALL_SCHEDULES.filter(s => s.lineId === activeLine && s.direction === 'outbound');
  const inboundTrains = ALL_SCHEDULES.filter(s => s.lineId === activeLine && s.direction === 'inbound');

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Trigger browser print to PDF
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-white"
              style={{ backgroundColor: currentLine.bgHex }}
            >
              {currentLine.code}
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'ar' ? `الملصق الرسمي لمواعيد ${currentLine.nameAr}` : `Affiche officielle - ${currentLine.nameFr}`}
              </h3>
              <p className="text-xs text-slate-300">
                SNCFT · Réseau Ferroviaire Rapide & Banlieue de Tunis · Hiver 2026–2027
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Printer className="w-4 h-4" />}
              <span>{copied ? 'جاهز للطباعة' : 'طباعة / حفظ PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Line Switcher */}
        <div className="px-6 py-3 bg-slate-100 flex items-center gap-2 border-b border-slate-200 shrink-0">
          {Object.values(LINES).map((line) => (
            <button
              key={line.id}
              onClick={() => setActiveLine(line.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeLine === line.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: line.bgHex }}></span>
              <span>{line.code} · {lang === 'ar' ? line.nameAr : line.nameFr}</span>
            </button>
          ))}
        </div>

        {/* Poster Reproduction Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Header Banner replicating official SNCFT poster style */}
          <div
            className="p-6 rounded-2xl text-white shadow-sm flex flex-col md:flex-row items-center justify-between text-center md:text-right gap-4"
            style={{
              background: `linear-gradient(135deg, ${currentLine.bgHex} 0%, #0f172a 100%)`
            }}
          >
            <div>
              <span className="text-xs uppercase tracking-widest text-white/80 font-semibold block mb-1">
                الشركة الوطنية للسكك الحديدية التونسية · وحدة أعمال أحواز تونس
              </span>
              <h2 className="text-2xl font-black">
                أوقات قطارات {lang === 'ar' ? currentLine.terminusAr : currentLine.terminusFr} ⇄ تونس
              </h2>
              <p className="text-xs text-white/90 mt-1">
                سارية المفعول من 01 سبتمبر 2026 إلى 30 جوان 2027 (شتاء 2026-2027)
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 text-xs font-mono">
              <span className="font-bold block text-sm">HIVER 2026-2027</span>
              <span className="text-white/80">SNCFT & RFR</span>
            </div>
          </div>

          {/* Two-column view: Outbound & Inbound */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Outbound Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <div
                className="py-2.5 px-4 text-xs font-bold text-white flex items-center justify-between"
                style={{ backgroundColor: currentLine.bgHex }}
              >
                <span>{lang === 'ar' ? currentLine.terminusAr : currentLine.terminusFr} ➔ تونس (Tunis)</span>
                <span className="text-[11px] opacity-90">{outboundTrains.length} قطار</span>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                <table className="w-full text-center text-xs">
                  <thead className="bg-slate-50 sticky top-0 text-[11px] text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2">رقم القطار</th>
                      <th className="py-2 px-2">أيام السير</th>
                      <th className="py-2 px-2">الانطلاق</th>
                      <th className="py-2 px-2">الوصول</th>
                      <th className="py-2 px-2">المدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {outboundTrains.map((tr) => (
                      <tr key={tr.trainNumber} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2 font-bold text-slate-800">{tr.trainNumber}</td>
                        <td className="py-1.5 px-2 font-sans text-[10px]">
                          <span className={`px-1 rounded ${tr.days === '-' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {tr.days === '-' ? 'Tous' : tr.days}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 font-semibold text-slate-900">{tr.departureTime}</td>
                        <td className="py-1.5 px-2 text-slate-700">{tr.arrivalTime}</td>
                        <td className="py-1.5 px-2 text-slate-500 font-sans text-[11px]">
                          {parseDuration(tr.departureTime, tr.arrivalTime)} د
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inbound Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <div
                className="py-2.5 px-4 text-xs font-bold text-white flex items-center justify-between"
                style={{ backgroundColor: currentLine.bgHex }}
              >
                <span>تونس (Tunis) ➔ {lang === 'ar' ? currentLine.terminusAr : currentLine.terminusFr}</span>
                <span className="text-[11px] opacity-90">{inboundTrains.length} قطار</span>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                <table className="w-full text-center text-xs">
                  <thead className="bg-slate-50 sticky top-0 text-[11px] text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2">رقم القطار</th>
                      <th className="py-2 px-2">أيام السير</th>
                      <th className="py-2 px-2">الانطلاق</th>
                      <th className="py-2 px-2">الوصول</th>
                      <th className="py-2 px-2">المدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {inboundTrains.map((tr) => (
                      <tr key={tr.trainNumber} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2 font-bold text-slate-800">{tr.trainNumber}</td>
                        <td className="py-1.5 px-2 font-sans text-[10px]">
                          <span className={`px-1 rounded ${tr.days === '-' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {tr.days === '-' ? 'Tous' : tr.days}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 font-semibold text-slate-900">{tr.departureTime}</td>
                        <td className="py-1.5 px-2 text-slate-700">{tr.arrivalTime}</td>
                        <td className="py-1.5 px-2 text-slate-500 font-sans text-[11px]">
                          {parseDuration(tr.departureTime, tr.arrivalTime)} د
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Notes & Legend */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
            <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-700" />
              ملاحظات وتعليمات السير الرسمية:
            </div>
            <p><strong>(-) :</strong> قطار يسير كامل أيام الأسبوع (Tous les jours).</p>
            <p><strong>(A) :</strong> قطار يسير كامل أيام الأسبوع ما عدا الأحد والأعياد الرسمية (Sauf Dimanches & Fêtes).</p>
            <p><strong>(B) :</strong> قطار يسير أيام الأحد والأعياد الرسمية فقط (Dimanches & Fêtes seulement).</p>
            {activeLine === 'A' && (
              <>
                <p><strong>(C) :</strong> ما عدا السبت والأحد والأعياد (Sauf Samedi, Dimanche & Fêtes).</p>
                <p><strong>(D) :</strong> ما عدا السبت (Sauf Samedi).</p>
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

function parseDuration(dep: string, arr: string): number {
  const [dh, dm] = dep.split(':').map(Number);
  const [ah, am] = arr.split(':').map(Number);
  const totalD = dh * 60 + dm;
  const totalA = ah * 60 + am;
  return totalA >= totalD ? totalA - totalD : 1440 - totalD + totalA;
}
