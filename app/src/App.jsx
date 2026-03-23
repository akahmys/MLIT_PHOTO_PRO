import React, { useState, useEffect } from 'react';
import { PHOTO_STANDARDS, STANDARDS_MAP } from './constants/standards.js';
import { PHOTO_CATEGORIES, WORK_MASTER } from './constants/master.js';
import { StandardSelector } from './components/StandardSelector';
import { Ic } from './components/Icons';
import { PhotoList } from './components/PhotoList';
import { PhotoEditor } from './components/PhotoEditor';
import { ProjectSettings } from './components/ProjectSettings';
import { saveXmlToDir } from './utils/xml-builder.js';
import { saveIndexXmlToDir } from './utils/index-builder.js';
import { readExifDate, makeFileName, getPhotoDir } from './utils/helpers.js';

function App() {
  const [mode, setMode] = useState('welcome'); // welcome, select, main
  const [selectedStandardId, setSelectedStandardId] = useState(null);
  const [rootHandle, setRootHandle] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [editingPhotoId, setEditingPhotoId] = useState(null);
  const [view, setView] = useState('photos'); // 'photos' | 'settings'
  const [projectSettings, setProjectSettings] = useState({
    projectName: "",
    location: "",
    client: "",
    contractor: "",
    startDate: "",
    endDate: "",
    manager: "",
    engineer: ""
  });

  // Mock data for initial UI check
  useEffect(() => {
    if (mode === 'main' && photos.length === 0) {
      setPhotos([
        { id: '1', name: 'P0000001.JPG', serialNo: '1', title: '着手前工事写真', category: '工事写真', workType: '共通工事', type: '施工現場', subdivision: '全景', shootingDate: '2024-03-20', isRepresentative: true },
        { id: '2', name: 'P0000002.JPG', serialNo: '2', title: '地盤削孔状況', category: '工事写真', workType: '法面工', type: '削孔', subdivision: '状況', shootingDate: '2024-03-21', isRepresentative: false },
        { id: '3', name: 'P0000003.JPG', serialNo: '3', title: '', category: '工事写真', workType: '', type: '', subdivision: '', shootingDate: '2024-03-22', isRepresentative: false },
      ]);
    }
  }, [mode]);

  const currentStandard = selectedStandardId ? STANDARDS_MAP[selectedStandardId] : null;

  const handleStart = () => {
    setMode('select');
  };

  const handleSelectStandard = (id) => {
    setSelectedStandardId(id);
    setMode('main'); // Proceed to main management view
  };

  const handleOpenFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setRootHandle(handle);
      
      // 基準の初期選択（あれば）
      setMode('select');

      // ディレクトリ走査とファイル読み込み（簡略化：ルートの直下のJPGを対象）
      const loadedPhotos = [];
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && /\.(jpe?g)$/i.test(entry.name)) {
          const file = await entry.getFile();
          const p = {
            id: crypto.randomUUID(),
            name: entry.name,
            file: file,
            serialNo: String(loadedPhotos.length + 1),
            title: "",
            category: "工事写真",
            workType: "",
            type: "",
            subdivision: "",
            shootingDate: await readExifDate(file) || new Date(file.lastModified).toISOString().split('T')[0],
            isRepresentative: false,
            isFrequency: false
          };
          loadedPhotos.push(p);
        }
      }
      if (loadedPhotos.length > 0) setPhotos(loadedPhotos);
      
    } catch (err) {
      console.error('File Picker Error:', err);
    }
  };

  const handleSaveXml = async () => {
    if (!rootHandle || !selectedStandardId) {
      alert("保存先のフォルダと基準を選択してください。");
      return;
    }
    try {
      const std = STANDARDS_MAP[selectedStandardId];
      // 1. INDEX_C.XML (成果物ルート) の保存
      await saveIndexXmlToDir(projectSettings, rootHandle, std.versionTag);
      
      // 2. PHOTO.XML (写真フォルダ内) の保存
      await saveXmlToDir(photos, rootHandle, selectedStandardId);
      
      alert("成果物構成（INDEX_C.XML および PHOTO フォルダ）を正常に保存しました。");
    } catch (err) {
      console.error("Save Error:", err);
      alert("保存に失敗しました: " + err.message);
    }
  };

  return (
    <div className="app-container">
      {/* Dynamic Background Overlay */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-400/10 blur-[120px] rounded-full" />
      </div>

      <header className="app-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Ic k="camera" size={24} cls="text-white" stroke={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black text-primary tracking-tight leading-none mb-1">
              MLIT PHOTO PRO
            </h1>
            <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">
              v0.2 — Infrastructure Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentStandard && (
            <div className={`px-3 py-1.5 rounded-full text-[11px] font-bold border flex items-center gap-2 ${
              currentStandard.type === 'photo' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                currentStandard.type === 'photo' ? 'bg-orange-500' : 'bg-blue-500'
              }`} />
              {currentStandard.standard_name}
            </div>
          )}
          <button className="btn-ghost">
            <Ic k="info" size={18} />
          </button>
        </div>
      </header>

      <main className="main-content flex items-center justify-center">
        {mode === 'welcome' && (
          <div className="max-w-md w-full glass-panel p-10 rounded-[2.5rem] anim-fadeup text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-blue-100/50">
              <Ic k="folder" size={40} cls="text-blue-500" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 mb-3">
              現場写真を、正しく、美しく。
            </h2>
            <p className="text-sm text-slate-500 mb-10 leading-relaxed font-medium">
              国土交通省の電子納品基準に完全準拠。<br />
              あなたのブラウザが、最新の写真管理システムに変わります。
            </p>

            <div className="space-y-4">
              <button 
                onClick={handleOpenFolder}
                className="w-full btn-primary py-4 justify-center text-lg"
              >
                <Ic k="folderOpen" size={22} />
                工事フォルダを開く
              </button>
              
              <button 
                onClick={handleStart}
                className="w-full btn-ghost py-4 justify-center text-slate-600 hover:text-blue-600"
              >
                <Ic k="plus" size={20} />
                新規基準から開始
              </button>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-100 flex justify-center gap-8">
              <div className="text-center">
                <div className="text-lg font-black text-slate-700">R5/R6</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">最新基準対応</div>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="text-center">
                <div className="text-lg font-black text-slate-700">100%</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">ローカル完結</div>
              </div>
            </div>
          </div>
        )}

        {mode === 'select' && (
          <div className="max-w-xl w-full glass-panel p-8 rounded-[2rem] anim-fadeup">
            <StandardSelector 
              standards={PHOTO_STANDARDS}
              selectedId={selectedStandardId}
              onSelect={handleSelectStandard}
              onBack={() => setMode('welcome')}
            />
          </div>
        )}

        {mode === 'main' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Nav */}
            <div className="w-16 bg-white border-r border-slate-100 flex flex-col items-center py-6 gap-6">
              <NavButton 
                active={view === 'photos'} 
                onClick={() => setView('photos')} 
                icon="camera" 
                label="写真" 
              />
              <NavButton 
                active={view === 'settings'} 
                onClick={() => setView('settings')} 
                icon="settings" 
                label="設定" 
              />
            </div>

            {view === 'photos' ? (
              <PhotoList 
                photos={photos} 
                onSelect={setEditingPhotoId} 
                onUpdatePhoto={(updated) => setPhotos(prev => prev.map(p => p.id === updated.id ? updated : p))}
              />
            ) : (
              <ProjectSettings 
                settings={projectSettings} 
                onUpdate={setProjectSettings} 
              />
            )}
            
            {editingPhotoId && (
              <PhotoEditor 
                photo={photos.find(p => p.id === editingPhotoId)}
                onClose={() => setEditingPhotoId(null)}
                onUpdate={(updated) => setPhotos(prev => prev.map(p => p.id === updated.id ? updated : p))}
              />
            )}
          </div>
        )}
      </main>

      <footer className="px-8 py-4 border-t border-white/20 glass-panel mt-auto flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            System Ready
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Ic k="hardDrive" size={12} />
            Pure Local Storage
          </div>
        </div>
        <div className="text-[10px] font-bold text-slate-300">
          © 2026 MLIT Photo Pro Project
        </div>
      </footer>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`group flex flex-col items-center gap-1 transition-all ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <div className={`p-2.5 rounded-2xl transition-all ${active ? 'bg-blue-50 shadow-sm' : 'bg-slate-50 group-hover:bg-slate-100'}`}>
        <Ic k={icon} size={20} cls={active ? "text-blue-600" : ""} />
      </div>
      <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}

export default App;