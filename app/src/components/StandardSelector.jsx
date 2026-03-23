import React, { useState, useMemo } from 'react';
import { Ic } from './Icons';

export const StandardSelector = ({ standards, selectedId, onSelect, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  // フィルタリングロジック
  const filteredStandards = useMemo(() => {
    return standards.filter(s => {
      const matchesSearch = s.standard_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          String(s.year).includes(searchTerm);
      return matchesSearch;
    });
  }, [standards, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Back */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Ic k="info" size={24} cls="text-blue-500" />
          基準の選択
        </h2>
        {onBack && (
          <button 
            onClick={onBack}
            className="btn-ghost px-2 py-1 text-slate-400 hover:text-blue-600"
          >
            <Ic k="logOut" size={16} />
            戻る
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Ic k="search" size={18} cls="text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="基準名、年度などで検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all outline-none"
        />
      </div>


      {/* List */}
      <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
        {filteredStandards.length > 0 ? (
          filteredStandards.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`
                group relative w-full text-left p-4 rounded-2xl border-2 transition-all duration-200
                ${selectedId === s.id 
                  ? 'border-blue-500 bg-blue-50/20 shadow-lg shadow-blue-500/5' 
                  : 'border-slate-100 bg-white/50 hover:border-blue-200 hover:bg-white'
                }
              `}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`
                      text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider
                      ${s.type === 'photo' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}
                    `}>
                      {s.type}
                    </span>
                    <span className="text-[11px] font-black text-slate-400">{s.year ? `${s.year}年度` : '基準不明'}</span>
                  </div>
                  <div className={`font-bold text-sm leading-tight transition-colors ${selectedId === s.id ? 'text-blue-700' : 'text-slate-700 group-hover:text-blue-600'}`}>
                    {s.standard_name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {s.period}
                  </div>
                </div>
                
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all
                  ${selectedId === s.id ? 'bg-blue-500 text-white shadow-inner' : 'bg-slate-100 text-slate-300 group-hover:bg-blue-100 group-hover:text-blue-500'}
                `}>
                  <Ic k="check" size={16} stroke={3} />
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="py-12 text-center">
            <div className="text-slate-300 mb-2 flex justify-center">
              <Ic k="alertCircle" size={40} />
            </div>
            <p className="text-sm font-bold text-slate-400">該当する基準が見つかりません</p>
          </div>
        )}
      </div>

      {/* Guide Card */}
      <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50">
        <div className="flex gap-3">
          <Ic k="alertCircle" size={18} cls="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-blue-800">
            <p className="font-bold mb-1">基準の選び方</p>
            <p>工事契約図書の「適用要領」を確認し、適切な年度とカテゴリを選択してください。写真は通常「デジタル写真」カテゴリの最新版を使用します。</p>
          </div>
        </div>
      </div>
    </div>
  );
};
