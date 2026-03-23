import React, { useState } from 'react';
import { Ic } from './Icons';

export function BulkEditModal({ isOpen, onClose, onApply, categories = [] }) {
  const [formData, setFormData] = useState({
    category: '',
    workType: '',
    type: '',
    subdivision: '',
    title: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Filter out empty fields so we only apply what was filled
    const updates = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== '')
    );
    onApply(updates);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm anim-fadein">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden anim-fadeup border border-white/20">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-800">一括編集</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">選択中の写真にメタデータを適用</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <Ic k="close" size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">写真区分</label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none font-bold text-slate-700"
              >
                <option value="">（変更なし）</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">工種</label>
                <input 
                  type="text" 
                  name="workType"
                  placeholder="例: 共通工事"
                  value={formData.workType}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-slate-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">種別</label>
                <input 
                  type="text" 
                  name="type"
                  placeholder="例: 施工現場"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">細別</label>
              <input 
                type="text" 
                name="subdivision"
                placeholder="例: 全景"
                value={formData.subdivision}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">写真タイトル</label>
              <input 
                type="text" 
                name="title"
                placeholder="例: 着手前写真"
                value={formData.title}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-800"
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-400 italic bg-amber-50 p-3 rounded-lg border border-amber-100">
            ※入力された項目のみが上書きされます。空欄の項目は元のデータが保持されます。
          </p>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-ghost py-4 border-slate-200 justify-center">キャンセル</button>
            <button type="submit" className="flex-[2] btn-primary py-4 justify-center shadow-blue-200">設定を適用する</button>
          </div>
        </form>
      </div>
    </div>
  );
}
