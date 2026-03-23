import React from 'react';
import { Ic } from './Icons';
import { validatePhoto, sanitizeForJS } from '../utils/helpers.js';
import { PHOTO_CATEGORIES } from '../constants/master.js';

export function PhotoEditor({ photo, onClose, onUpdate }) {
  if (!photo) return null;

  const errors = validatePhoto(photo);
  const errorMap = Object.fromEntries(errors.map(e => [e.field, e.message]));

  const handleChange = (e) => {
    const { name, value } = e.target;
    onUpdate({ ...photo, [name]: sanitizeForJS(value) });
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    onUpdate({ ...photo, [name]: value });
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    onUpdate({ ...photo, [name]: checked });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-50 flex flex-col border-l border-slate-100 anim-slide-left">
      <div className="px-6 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h3 className="text-lg font-black text-slate-800">詳細編集</h3>
          <p className="text-[10px] font-bold text-slate-400 truncate w-64">{photo.name}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
          <Ic k="close" size={20} cls="text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Preview Container */}
        <div className="aspect-video bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-inner group relative">
          {photo.file ? (
            <img 
              src={URL.createObjectURL(photo.file)} 
              alt={photo.name} 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Ic k="camera" size={32} cls="text-slate-300" />
              <span className="text-[9px] font-bold text-slate-400">NO PREVIEW</span>
            </div>
          )}
        </div>

        {/* Form Sections */}
        <div className="space-y-6">
          <section>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">基本情報</h4>
            <div className="space-y-4">
              <Field 
                label="写真タイトル" 
                error={errorMap["写真タイトル"]}
                required
              >
                <input 
                  type="text" 
                  name="title"
                  value={photo.title || ""} 
                  onChange={handleChange}
                  className="input-field font-bold"
                />
              </Field>

              <Field label="写真区分" error={errorMap["写真区分"]} required>
                <select 
                  name="category"
                  value={photo.category || ""} 
                  onChange={handleSelectChange}
                  className="input-field"
                >
                  <option value="">選択してください</option>
                  {PHOTO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="撮影年月日" error={errorMap["撮影年月日"]} required>
                <input 
                  type="date" 
                  name="shootingDate"
                  value={photo.shootingDate || ""} 
                  onChange={handleSelectChange}
                  className="input-field"
                />
              </Field>
            </div>
          </section>

          <section>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">撮影工種区分</h4>
            <div className="space-y-4">
              <Field label="工種" error={errorMap["工種"]} required>
                <input type="text" name="workType" value={photo.workType || ""} onChange={handleChange} className="input-field" />
              </Field>
              <Field label="種別" error={errorMap["種別"]}>
                <input type="text" name="type" value={photo.type || ""} onChange={handleChange} className="input-field" />
              </Field>
              <Field label="細別" error={errorMap["細別"]}>
                <input type="text" name="subdivision" value={photo.subdivision || ""} onChange={handleChange} className="input-field" />
              </Field>
            </div>
          </section>

          <section>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">技術仕様</h4>
            <div className="grid grid-cols-2 gap-4">
              <Field label="ファイルサイズ" error={errorMap["ファイルサイズ"]} type="warn">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-500">
                  {photo.fileSize ? `${(photo.fileSize / 1024).toFixed(0)} KB` : "-"}
                </div>
              </Field>
              <Field label="解像度" error={errorMap["解像度"]} type="warn">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-500">
                  {photo.width ? `${photo.width} x ${photo.height}` : "-"}
                </div>
              </Field>
            </div>
          </section>

          <section>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">提出設定</h4>
            <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isRepresentative" checked={photo.isRepresentative} onChange={handleCheckboxChange} className="rounded" />
                <span className="text-xs font-bold text-slate-600">代表写真</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isFrequency" checked={photo.isFrequency} onChange={handleCheckboxChange} className="rounded" />
                <span className="text-xs font-bold text-slate-600">提出頻度写真</span>
              </label>
            </div>
          </section>

          <section>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">付加情報（参考図）</h4>
            <div className="space-y-4">
              <Field label="参考図ファイル名" error={errorMap["参考図ファイル名"]}>
                <input type="text" name="referenceFileName" value={photo.referenceFileName || ""} onChange={handleChange} className="input-field" placeholder="例: R001.JPG" />
              </Field>
              <Field label="参考図タイトル" error={errorMap["参考図タイトル"]}>
                <input type="text" name="referenceTitle" value={photo.referenceTitle || ""} onChange={handleChange} className="input-field" placeholder="例: 位置図" />
              </Field>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, error, required, type = "error" }) {
  const isWarn = type === "warn";
  const colorCls = isWarn ? "text-amber-500 bg-amber-50" : "text-rose-500 bg-rose-50";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-black text-slate-500 tracking-wider">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {error && <span className={`text-[9px] font-bold ${colorCls} px-1.5 py-0.5 rounded leading-none`}>{error}</span>}
      </div>
      {children}
    </div>
  );
}
