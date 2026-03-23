import React, { useState, useMemo } from 'react';
import { BulkEditModal } from './BulkEditModal';
import { PhotoEditor } from './PhotoEditor';
import { PHOTO_CATEGORIES } from '../constants/master.js';
import { Ic } from './Icons';
import { validatePhoto, sanitizeForJS } from '../utils/helpers.js';

export function PhotoList({ photos, onSelect, onUpdatePhoto, editingPhotoId }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  const handleApplyBulkEdit = (updates) => {
    const sanitized = {};
    Object.keys(updates).forEach(key => { sanitized[key] = sanitizeForJS(updates[key]); });
    const nextPhotos = photos.map(p => selectedIds.has(p.id) ? { ...p, ...sanitized } : p);
    onUpdatePhoto(nextPhotos);
    setSelectedIds(new Set());
  };
/* ... (filteredPhotos and toggleSelect/handleSelectAll same as before) ... */
  const filteredPhotos = useMemo(() => {
    return photos.filter(p => 
      (p.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [photos, searchTerm]);

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredPhotos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPhotos.map(p => p.id)));
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/20">
      {/* Action Bar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white/60 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Ic k="search" size={16} cls="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="写真を検索..."
              className="pl-10 pr-4 py-2 bg-slate-100/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <span className="text-xs font-bold text-slate-400">合計 {photos.length} 件</span>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button 
              onClick={() => setIsBulkEditOpen(true)}
              className="btn-primary bg-blue-500 hover:bg-blue-600 border-none shadow-blue-100"
            >
              <Ic k="edit" size={18} />
              <span>一括編集 ({selectedIds.size})</span>
            </button>
          )}
        </div>
      </div>

      <BulkEditModal 
        isOpen={isBulkEditOpen}
        categories={PHOTO_CATEGORIES}
        onClose={() => setIsBulkEditOpen(false)}
        onApply={handleApplyBulkEdit}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-[48px_80px_1fr_120px_100px_100px_100px_80px] gap-4 px-6 py-4 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
          <div className="flex justify-center">
            <input 
              type="checkbox" 
              checked={selectedIds.size > 0 && selectedIds.size === filteredPhotos.length}
              onChange={handleSelectAll}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div>プレビュー</div>
          <div>ファイル名 / タイトル</div>
          <div>工種</div>
          <div>種別</div>
          <div>細別</div>
          <div>撮影日</div>
          <div className="text-center">状態</div>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {filteredPhotos.map((photo) => {
            const errors = validatePhoto(photo);
            const isValid = errors.length === 0;

            return (
              <div 
                key={photo.id}
                className={`grid grid-cols-[48px_80px_1fr_120px_100px_100px_100px_80px] gap-4 px-4 py-3 rounded-2xl mb-1 transition-all group cursor-pointer ${
                  selectedIds.has(photo.id) ? 'bg-blue-50/50 ring-1 ring-blue-100' : 'hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm'
                } ${editingPhotoId === photo.id ? 'bg-white ring-2 ring-blue-500/20 shadow-md' : ''}`}
                onClick={() => onSelect(photo.id)}
              >
                <div className="flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(photo.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(photo.id);
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="w-16 h-12 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                  {photo.file ? (
                    <img src={URL.createObjectURL(photo.file)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Ic k="camera" size={20} cls="text-slate-300" />
                  )}
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <div className="text-[11px] font-bold text-slate-400 mb-0.5 tracking-tight truncate">{photo.name}</div>
                  <div className="text-sm font-bold text-slate-700 truncate">{photo.title || "（タイトル未入力）"}</div>
                </div>
                <div className="flex items-center text-xs font-bold text-slate-600 truncate">{photo.workType || "-"}</div>
                <div className="flex items-center text-xs font-medium text-slate-500 truncate">{photo.type || "-"}</div>
                <div className="flex items-center text-xs font-medium text-slate-400 truncate">{photo.subdivision || "-"}</div>
                <div className="flex items-center text-xs font-bold text-slate-600">{photo.shootingDate || "-"}</div>
                <div className="flex items-center justify-center">
                  {isValid ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100">
                      <Ic k="check" size={14} stroke={3} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
                      <Ic k="alertTri" size={14} stroke={3} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
