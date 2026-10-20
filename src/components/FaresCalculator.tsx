import React, { useState } from 'react';
import { LINES, calculateFare, FareTier } from '../data/rfrData';
import { TRANSLATIONS, Language } from '../data/translations';
import { Ticket, CreditCard, Award, GraduationCap, CheckCircle2 } from 'lucide-react';

interface FaresCalculatorProps {
  lang: Language;
}

export const FaresCalculator: React.FC<FaresCalculatorProps> = ({ lang }) => {
  const t = TRANSLATIONS[lang];
  const [lineId, setLineId] = useState<string>('D');
  const [fromStationId, setFromStationId] = useState<string>('gobaa');
  const [toStationId, setToStationId] = useState<string>(LINES.D.stations[LINES.D.stations.length - 1].id);

  const line = LINES[lineId];
  const fromStation = line.stations.find((s) => s.id === fromStationId) || line.stations[0];
  const toStation = line.stations.find((s) => s.id === toStationId) || line.stations[line.stations.length - 1];

  const fare: FareTier = calculateFare(fromStation.order, toStation.order);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-orange-600" />
          {t.faresTab} · SNCFT & RFR
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {lang === 'ar'
            ? 'احسب تسعيرة التذكرة أو الاشتراك بين أي محطتين في تونس الكبرى'
            : 'Estimez le tarif de votre trajet et découvrez les formules d\'abonnements'}
        </p>
      </div>

      {/* Line & Station Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.line}</label>
          <select
            value={lineId}
            onChange={(e) => {
              const newLine = e.target.value;
              setLineId(newLine);
              setFromStationId(LINES[newLine].stations[0].id);
              setToStationId(LINES[newLine].stations[LINES[newLine].stations.length - 1].id);
            }}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            {Object.values(LINES).map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} - {lang === 'ar' ? l.nameAr : l.nameFr}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.from}</label>
          <select
            value={fromStationId}
            onChange={(e) => setFromStationId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            {line.stations.map((st) => (
              <option key={st.id} value={st.id}>
                {lang === 'ar' ? st.nameAr : st.nameFr}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.to}</label>
          <select
            value={toStationId}
            onChange={(e) => setToStationId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            {line.stations.map((st) => (
              <option key={st.id} value={st.id}>
                {lang === 'ar' ? st.nameAr : st.nameFr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calculated Fare Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Single Ticket */}
        <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center mb-3">
              <Ticket className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-orange-900 block">{t.singleTicket}</span>
            <span className="text-[11px] text-orange-700/80">
              {lang === 'ar' ? 'رحلة واحدة صالحة لمدة ساعتين' : 'Valable pour un aller simple'}
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-orange-200/60 flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-black text-orange-600">{fare.singlePriceDT.toFixed(3)}</span>
            <span className="text-xs font-bold text-orange-800">{t.dinars}</span>
          </div>
        </div>

        {/* Carnet 10 */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-3">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-blue-900 block">{t.carnet10}</span>
            <span className="text-[11px] text-blue-700/80">
              {lang === 'ar' ? 'تخفيض 10% لكل تذكرة' : 'Économie de 10% par voyage'}
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-blue-200/60 flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-black text-blue-600">{fare.carnet10DT.toFixed(3)}</span>
            <span className="text-xs font-bold text-blue-800">{t.dinars}</span>
          </div>
        </div>

        {/* Monthly Subscription */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-emerald-900 block">{t.monthlySub}</span>
            <span className="text-[11px] text-emerald-700/80">
              {lang === 'ar' ? 'رحلات غير محدودة لمدة شهر' : 'Voyages illimités pendant 30 jours'}
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-black text-emerald-600">{fare.monthlySubDT.toFixed(3)}</span>
            <span className="text-xs font-bold text-emerald-800">{t.dinars}</span>
          </div>
        </div>

        {/* Student Pass */}
        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-3">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-purple-900 block">{t.studentSub}</span>
            <span className="text-[11px] text-purple-700/80">
              {lang === 'ar' ? 'سعر مدعوم للطلبة والتلاميذ' : 'Tarif subventionné scolarité'}
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-purple-200/60 flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-black text-purple-600">{fare.studentSubDT.toFixed(3)}</span>
            <span className="text-xs font-bold text-purple-800">{t.dinars}</span>
          </div>
        </div>
      </div>

      {/* Information Notes */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-2">
        <h4 className="font-bold text-slate-900">
          {lang === 'ar' ? 'معلومات التذاكر والاشتراكات :' : 'Modalités d\'achat & Abonnements :'}
        </h4>
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>
            {lang === 'ar'
              ? 'تتوفر التذاكر في جميع شبابيك المحطات المأهولة وأجهزة التوزيع الآلي.'
              : 'Les billets sont disponibles aux guichets et distributeurs automatiques.'}
          </li>
          <li>
            {lang === 'ar'
              ? 'يجب الاحتفاظ بالتذكرة إلى غاية الخروج من محطة الوصول لتقديمها عند المراقبة.'
              : 'Conservez votre titre de transport jusqu\'à la sortie de la gare de destination.'}
          </li>
          <li>
            {lang === 'ar'
              ? 'يتم إصدار الاشتراكات الشهرية والسنوية في محطات تونس، منوبة، باردو، بوقطفة، والرياض.'
              : 'Les cartes d\'abonnement se font aux guichets principaux (Tunis, Manouba, Le Bardo, Bougatfa, Erriadh).'}
          </li>
        </ul>
      </div>
    </div>
  );
};
