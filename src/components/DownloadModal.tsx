import React, { useState } from 'react';
import { TRANSLATIONS, Language } from '../data/translations';
import { Download, Check, Copy, Terminal, Github, FolderArchive, FileCode, Sparkles, X } from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, lang }) => {
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
    } catch (e) {
      // Direct window location trigger as fallback
      window.location.href = '/tunis-rfr-timetables.zip';
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  const gitCommands = `# 1. فك ضغط الملف والدخول إلى المجلد
unzip tunis-rfr-timetables.zip -d tunis-rfr
cd tunis-rfr

# 2. تهيئة Git ورفع المشروع إلى مستودعك
git init
git add .
git commit -m "feat: Tunis RFR Timetables Web App"
git branch -M main
git remote add origin https://github.com/<USERNAME>/<REPO_NAME>.git
git push -u origin main`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {lang === 'ar' ? 'تحميل مشروع RFR تونس بالكامل' : 'Télécharger le projet complet'}
              </h3>
              <p className="text-xs text-slate-300">
                tunis-rfr-timetables.zip · 2.0 MB · جاهز للتشغيل والرفع
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

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {/* Main Download Action Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-right">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
                <Sparkles className="w-4 h-4 text-orange-600" />
                {lang === 'ar' ? 'الحزمة الجاهزة (Source Code & Assets)' : 'Archive complète du code source'}
              </h4>
              <p className="text-xs text-slate-600">
                {lang === 'ar'
                  ? 'تحتوي على كل ملفات الكود ومواعيد شتاء 2026-2027 والصور والتصميم الكامل.'
                  : 'Inclut tous les composants React, CSS Tailwind, images et données horaires.'}
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
                  <span>{lang === 'ar' ? 'تنزيل الحزمة (2.0 MB)' : 'Télécharger ZIP'}</span>
                </>
              )}
            </button>
          </div>

          {/* Direct Link Fallback */}
          <div className="flex items-center justify-between text-xs px-2 text-slate-500">
            <span>{lang === 'ar' ? 'أو عبر الرابط المباشر للمتصفح:' : 'Ou lien direct :'}</span>
            <a
              href="/tunis-rfr-timetables.zip"
              download="tunis-rfr-timetables.zip"
              className="text-orange-600 font-bold hover:underline flex items-center gap-1 font-mono"
            >
              /tunis-rfr-timetables.zip
            </a>
          </div>

          {/* GitHub Instructions Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Github className="w-4 h-4" />
                {lang === 'ar' ? 'أوامر الرفع إلى GitHub (Terminal)' : 'Commandes Git pour GitHub'}
              </span>
              <button
                onClick={() => copyToClipboard(gitCommands, 'git')}
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
              <pre className="whitespace-pre">{gitCommands}</pre>
            </div>
          </div>

          {/* Project Structure Summary */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-slate-600" />
              {lang === 'ar' ? 'محتويات المشروع المحمّل:' : 'Contenu du projet :'}
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 font-mono">
              <div>📁 <strong>src/data/rfrData.ts</strong> - جداول الخط A و D و E</div>
              <div>📁 <strong>src/data/translations.ts</strong> - الترجمة (عربي/فرنسي/إنجليزي)</div>
              <div>📁 <strong>src/components/</strong> - مكونات الرحلات والجدول والمخطط</div>
              <div>📁 <strong>src/assets/</strong> - الصور الرسمية لقطار RFR</div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end">
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
