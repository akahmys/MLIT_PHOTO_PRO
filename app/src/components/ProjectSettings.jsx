import React from 'react';
import { Ic } from './Icons';

export function ProjectSettings({ settings, onUpdate }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onUpdate({ ...settings, [name]: value });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
      <div className="max-w-3xl mx-auto space-y-12">
        <header>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">プロジェクト設定</h2>
          <p className="text-sm font-bold text-slate-400 mt-1">電子納品成果物（INDEX_C.XML）の共通情報を定義します。</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">工事基本情報</h3>
            <div className="space-y-4">
              <Field label="工事名称">
                <input type="text" name="projectName" value={settings.projectName || ""} onChange={handleChange} className="input-field" placeholder="例：令和〇年度 〇〇工事" />
              </Field>
              <Field label="工事個所">
                <input type="text" name="location" value={settings.location || ""} onChange={handleChange} className="input-field" placeholder="例：〇〇県〇〇市〇〇地内" />
              </Field>
              <Field label="発注者名">
                <input type="text" name="client" value={settings.client || ""} onChange={handleChange} className="input-field" placeholder="例：国土交通省 〇〇地方整備局 〇〇事務所" />
              </Field>
              <Field label="受注者名">
                <input type="text" name="contractor" value={settings.contractor || ""} onChange={handleChange} className="input-field" placeholder="例：株式会社〇〇建設" />
              </Field>
            </div>
          </section>

          <section className="space-y-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">工期・担当者</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="着工年月日">
                  <input type="date" name="startDate" value={settings.startDate || ""} onChange={handleChange} className="input-field" />
                </Field>
                <Field label="竣工年月日">
                  <input type="date" name="endDate" value={settings.endDate || ""} onChange={handleChange} className="input-field" />
                </Field>
              </div>
              <Field label="管理技術者名">
                <input type="text" name="manager" value={settings.manager || ""} onChange={handleChange} className="input-field" />
              </Field>
              <Field label="主任技術者名">
                <input type="text" name="engineer" value={settings.engineer || ""} onChange={handleChange} className="input-field" />
              </Field>
            </div>
          </section>
        </div>

        <section className="bg-amber-50 rounded-2xl p-6 border border-amber-100 text-amber-800">
          <div className="flex gap-3">
            <Ic k="info" size={20} cls="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-black">INDEX_C.XML の役割</p>
              <p className="text-[11px] font-bold opacity-80 leading-relaxed">
                本画面で入力された情報は、成果物フォルダの最上位に配置される INDEX_C.XML に書き込まれます。
                写真情報の他にも、図面や報告書などが納品対象に含まれる場合、このインデックスがすべての情報を束ねる役割を果たします。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 tracking-wider px-1 uppercase">{label}</label>
      {children}
    </div>
  );
}
