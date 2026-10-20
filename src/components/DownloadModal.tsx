import React, { useState } from 'react';
import { TRANSLATIONS, Language } from '../data/translations';
import {
  Download,
  Check,
  Copy,
  Terminal,
  Github,
  FolderArchive,
  FileCode,
  Sparkles,
  Smartphone,
  CheckCircle2,
  ExternalLink,
  X
} from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, lang }) => {
  const [activeTab, setActiveTab] = useState<'zip' | 'apk' | 'git'>('apk');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const triggerDirectDownload = async () => {
    try {
      setDownloading(true);
      const res = await fetch('/tunis-rfr-timetables.zip', { cache: 'no-cache' });
      if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
        throw new Error('Static file regenerating');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tunis-rfr-timetables.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.location.href = '/tunis-rfr-timetables.zip';
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  const gitPushCommands = `# 1. إضافة كل التغييرات بما فيها ملفات Android و CI/CD
git add .
git commit -m "feat: setup GitHub Actions automated Android APK build"
git branch -M main

# 2. ربط المستودع الخاص بك على GitHub والرفع
git remote add origin https://github.com/<USERNAME>/<REPO_NAME>.git
git push -u origin main`;

  const tagReleaseCommands = `# إنشاء إصدار تلقائي يرفق ملف APK في صفحة Releases على GitHub
git tag v1.0.0
git push origin v1.0.0`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {lang === 'ar' ? 'تفعيل تطبيق Android APK و GitHub' : 'Activer Android APK & GitHub'}
              </h3>
              <p className="text-xs text-slate-300">
                Capacitor Native Android + GitHub Actions CI/CD جاهز
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('apk')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'apk'
                ? 'bg-white text-orange-600 border-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            {lang === 'ar' ? 'بناء APK في GitHub' : 'Build APK sur GitHub'}
          </button>
          <button
            onClick={() => setActiveTab('zip')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'zip'
                ? 'bg-white text-orange-600 border-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            {lang === 'ar' ? 'تنزيل الحزمة (ZIP)' : 'Télécharger ZIP'}
          </button>
          <button
            onClick={() => setActiveTab('git')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'git'
                ? 'bg-white text-orange-600 border-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Github className="w-4 h-4" />
            {lang === 'ar' ? 'أوامر Git' : 'Commandes Git'}
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">

          {/* TAB 1: APK Instructions */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-slate-800">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  {lang === 'ar' ? 'مشروع أندرويد و سير عمل GitHub Actions مفعّل بالكامل!' : 'Android & GitHub Actions prêts !'}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {lang === 'ar'
                    ? 'تم إعداد مشروع Capacitor Native Android داخل المجلد android/، مع إعداد ملف الأتمتة .github/workflows/build-apk.yml لتوليد ملف الـ APK وتنزيله تلقائياً في ثوانٍ دون الحاجة لتثبيت Android Studio على حاسوبك!'
                    : 'Le projet natif Android (Capacitor) et le workflow GitHub Actions sont configurés. Votre APK sera compilé automatiquement à chaque push.'}
                </p>
              </div>

              {/* Steps List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {lang === 'ar' ? 'كيف تحصل على ملف الـ APK من مستودعك؟' : 'Comment obtenir votre APK :'}
                </h4>
                
                <div className="grid grid-cols-1 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                    <div>
                      <strong className="text-slate-900 block">ارفع الكود إلى مستودع GitHub:</strong>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        قم بتنفيذ أوامر Git لرفع الكود وملف سير العمل إلى مستودعك.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                    <div>
                      <strong className="text-slate-900 block">انتقل إلى تبويب «Actions» في GitHub:</strong>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        ستجد مهمة باسم <span className="font-mono bg-slate-200 px-1 py-0.5 rounded">Build Android APK</span> تعمل تلقائياً. يمكنك أيضاً تشغيلها يدوياً بزر <span className="font-mono bg-slate-200 px-1 py-0.5 rounded">Run workflow</span>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                    <div>
                      <strong className="text-slate-900 block">تنزيل الـ APK (Artifacts):</strong>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        عند انتهاء المهمة (تستغرق نحو 2–3 دقائق)، اضغط عليها وستجد في أسفل الصفحة ملف الـ APK الجاهز باسم <span className="font-bold text-emerald-700">Tunis-RFR-Android-APK</span> للتثبيت الفوري على الهاتف.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tag Release helper */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-amber-400">
                    <Sparkles className="w-4 h-4" />
                    {lang === 'ar' ? 'توليد Release رسمي مع APK جاهز للمستخدمين:' : 'Générer une Release GitHub :'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(tagReleaseCommands, 'tag')}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300 flex items-center gap-1"
                  >
                    {copiedCmd === 'tag' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedCmd === 'tag' ? 'تم النسخ' : 'نسخ'}
                  </button>
                </div>
                <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto p-2 bg-black/40 rounded-lg" dir="ltr">
                  {tagReleaseCommands}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: Source ZIP Download */}
          {activeTab === 'zip' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-right">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    {lang === 'ar' ? 'حزمة الكود والمشروع بالكامل' : 'Archive complète du code source'}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {lang === 'ar'
                      ? 'تشمل كود React، وإعدادات Capacitor، ومشروع Android الأصلي، وملف GitHub Actions، والاختبارات.'
                      : 'Inclut le code React, le projet natif Android, le workflow GitHub Actions et les tests.'}
                  </p>
                </div>

                <button
                  onClick={triggerDirectDownload}
                  disabled={downloading}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0"
                >
                  {downloading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{lang === 'ar' ? 'جاري التحميل...' : 'Téléchargement...'}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'تنزيل الحزمة (ZIP)' : 'Télécharger ZIP'}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs px-2 text-slate-500">
                <span>{lang === 'ar' ? 'الرابط المباشر:' : 'Lien direct :'}</span>
                <a
                  href="/tunis-rfr-timetables.zip"
                  download="tunis-rfr-timetables.zip"
                  className="text-orange-600 font-bold hover:underline flex items-center gap-1 font-mono"
                >
                  /tunis-rfr-timetables.zip
                </a>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-slate-600" />
                  {lang === 'ar' ? 'هيكلة الملفات المضمنة:' : 'Contenu du projet :'}
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 font-mono">
                  <div>📁 <strong>android/</strong> - مشروع تطبيق أندرويد الأصلي</div>
                  <div>⚙️ <strong>.github/workflows/</strong> - بناء APK تلقائي</div>
                  <div>📁 <strong>src/data/rfrData.ts</strong> - جداول الخط A و D و E</div>
                  <div>🧪 <strong>src/__tests__/</strong> - 14 اختبار لـ Vitest</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Git Commands */}
          {activeTab === 'git' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Github className="w-4 h-4" />
                  {lang === 'ar' ? 'أوامر الرفع إلى مستودعك (Terminal)' : 'Commandes Git pour GitHub'}
                </span>
                <button
                  onClick={() => copyToClipboard(gitPushCommands, 'git')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                >
                  {copiedCmd === 'git' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">{lang === 'ar' ? 'تم النسخ!' : 'Copié !'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'نسخ الأوامر' : 'Copier'}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-2xl bg-slate-900 text-slate-200 p-4 font-mono text-[11px] overflow-x-auto text-left ltr" dir="ltr">
                <pre className="whitespace-pre">{gitPushCommands}</pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {lang === 'ar' ? 'نسخة 1.0.0 · متوافق مع Android 7.0+ (API 24+)' : 'Version 1.0.0 · Android 7.0+ (API 24+)'}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            {lang === 'ar' ? 'إغلاق' : 'Fermer'}
          </button>
        </div>

      </div>
    </div>
  );
};
