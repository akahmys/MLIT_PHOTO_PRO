        import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { STANDARDS, PHOTO_CATEGORIES, WORK_MASTER } from './constants/master.js';
import { sanitizeForJS, esc, dateToXml, dateFromXml, toSerial, makeFileName, parseFileNum, parseSerialNum, dateToStr, readExifDate, findDiscipline, getPhotoDir, buildXmlMapFromNodes, readPhotoXmlNodes, CONCURRENCY_LIMIT, executeChunked, ITEMS_PER_PAGE, validatePhoto } from './utils/helpers.js';
import { buildPhotoXml, saveXmlToDir, saveDtdToFolder } from './utils/xml-builder.js';
import { icons, Ic } from './components/Icons.jsx';
import { LazyImage } from './components/LazyImage.jsx';
import './App.css';

        /* ======================================================
           定数・マスタデータ
           ====================================================== */

        /**
         * ============================================================
         * 基準定義
         * 出典: ZH005-00-19-A（H31.4）、ZH005-00-24-A（R6.4）、
         *       H30kaitei_shinkyu_06.pdf（新旧対照表）
         * ============================================================
         *
         * 【適用要領基準タグ値の根拠】
         * H30系: "土木201603-01"
         *   → ZH005-00-19-A 表5-1「本要領が準拠する国交省基準の版
         *      （土木201603-01で固定）を記入する」より
         * R06系: "土木202303-01"
         *   → H30kaitei_shinkyu_06.pdf 新旧対照表「土木202303-01（固定）」
         *      ZH005-00-24-A 1章「国交省基準令和5年3月版に準拠」より
         *
         * 【DTDファイル】
         *   両系統ともPHOTO05.DTD（変更なし）
         *   出典: ZH005-00-24-A 図2-1 PHOTOフォルダ構成
         *
         * 【XML宣言】
         *   ルート要素: <photodata DTD_version="05">
         *   出典: 国交省「デジタル写真管理情報基準R5.3月版」付属資料1 PHOTO05.DTD
         */
        /* ======================================================
           メインアプリ
           ====================================================== */
        function App() {
            const [mode, setMode] = useState('welcome');
            const [selectedStandard, setSelectedStandard] = useState(null);
            const [rootHandle, setRootHandle] = useState(null);
            const [tempHandle, setTempHandle] = useState(null);
            const [standardSelectMode, setStandardSelectMode] = useState(null);
            const [isChangeStdModalOpen, setIsChangeStdModalOpen] = useState(false);
            const [photos, setPhotos] = useState([]);
            const [selectedIds, setSelectedIds] = useState(new Set());
            const [lastSelectedId, setLastSelectedId] = useState(null);

            // テキスト入力の一時保管（IME変換中に photos を書き換えないため）
            // onBlur / Enter で applyDraft() を呼ぶことで確定反映する
            const [editDraft, setEditDraft] = useState({});

            const [isProcessing, setIsProcessing] = useState(false);
            const [processMsg, setProcessMsg] = useState("");
            const [toast, setToast] = useState(null);
            const [previewPhoto, setPreviewPhoto] = useState(null);
            const [isDragOver, setIsDragOver] = useState(false);
            const [draggedId, setDraggedId] = useState(null);
            const [fCategory, setFCategory] = useState("");
            const [fWorkType, setFWorkType] = useState("");
            const [fType, setFType] = useState("");
            const [fSubdivision, setFSubdivision] = useState("");
            const [fErr, setFErr] = useState(false);
            const [currentPage, setCurrentPage] = useState(1);
            const pageChangeTimerRef = useRef(null);
            const saveQueueRef = useRef(Promise.resolve());
            const isSavingRef = useRef(false);
            const toastTimerRef = useRef(null);

            const showToast = (message, type = 'success') => {
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                setToast({ message, type });
                toastTimerRef.current = setTimeout(() => setToast(null), 3500);
            };

            const autoSave = useCallback((currentPhotos, handle, stdId) => {
                if (!handle || !stdId) return;
                saveQueueRef.current = saveQueueRef.current.then(async () => {
                    while (isSavingRef.current) await new Promise(r => setTimeout(r, 80));
                    isSavingRef.current = true;
                    try { await saveXmlToDir(currentPhotos, handle, stdId); }
                    catch (e) { console.error("AutoSave failed:", e); }
                    finally { isSavingRef.current = false; }
                });
            }, []);

            useEffect(() => {
                if (rootHandle && selectedStandard && photos.length >= 0) {
                    const t = setTimeout(() => autoSave(photos, rootHandle, selectedStandard), 1200);
                    return () => clearTimeout(t);
                }
            }, [photos, rootHandle, selectedStandard, autoSave]);

            // 選択が変わったら editDraft をリセット（前の選択の未確定入力を捨てる）
            useEffect(() => { setEditDraft({}); }, [selectedIds]);

            const loadFolder = async (handle, stdId) => {
                setIsProcessing(true); setProcessMsg("フォルダを読み込み中...");
                setSelectedIds(new Set()); setLastSelectedId(null);
                try {
                    const std = STANDARDS[stdId];
                    // PHOTOフォルダ取得（存在しない場合はルートをそのまま使用）
                    let photoDir = handle.name === std.photoFolder ? handle
                        : await handle.getDirectoryHandle(std.photoFolder, { create: false }).catch(() => handle);

                    await saveDtdToFolder(photoDir, stdId);
                    const picDir = await photoDir.getDirectoryHandle(std.picFolder, { create: true });
                    await photoDir.getDirectoryHandle(std.drawfFolder, { create: true });

                    // PHOTO.XML 読み込み
                    let xmlMap = {};
                    let legacyFormatDetected = false;
                    try {
                        const { decoded, nodes } = await readPhotoXmlNodes(photoDir);
                        // 旧形式検出
                        if (/<photo[\s>]/i.test(decoded) && !/<photodata/i.test(decoded)) legacyFormatDetected = true;
                        if (decoded.includes("下水道工事200603") || decoded.includes("下水道工事R06") ||
                            (decoded.includes("土木201603") && decoded.includes("P000"))) legacyFormatDetected = true;
                        if (/><シリアル番号>P\d{7}<\/シリアル番号>/.test(decoded)) legacyFormatDetected = true;
                        if (/><撮影年月日>\d{8}<\/撮影年月日>/.test(decoded)) legacyFormatDetected = true;
                        xmlMap = buildXmlMapFromNodes(nodes);
                    } catch { }

                    // PICフォルダのファイルを列挙してphotoオブジェクト配列を構築
                    const found = [];
                    for await (const entry of picDir.values()) {
                        if (entry.kind !== 'file' || !std.acceptExt.test(entry.name)) continue;
                        const file = await entry.getFile();
                        const x = xmlMap[entry.name.toUpperCase()] || {};

                        // 撮影年月日: XML → EXIF → 空文字の優先順
                        // lastModifiedフォールバックは廃止（実際の撮影日と乖離するため）
                        let sDate = x.shootingDate || await readExifDate(file);

                        found.push({
                            id: entry.name + '_' + file.size, name: entry.name, handle: entry, file, size: file.size,
                            serialNo: x.serialNo || toSerial(found.length + 1),
                            category: x.category || "施工状況写真",
                            workType: x.workType || "",
                            type: x.type || "",
                            subdivision: x.subdivision || "",
                            discipline: findDiscipline(x.workType),
                            title: x.title || "",
                            shootingDate: sDate,
                            isRepresentative: x.isRepresentative || false,
                            isFrequency: x.isFrequency || false,
                            referenceFileName: x.referenceFileName || "",
                            referenceTitle: x.referenceTitle || "",
                        });
                    }
                    found.sort((a, b) => (parseInt(a.serialNo) || 0) - (parseInt(b.serialNo) || 0));
                    setPhotos(found); setRootHandle(handle); setSelectedStandard(stdId);
                    setCurrentPage(1); setMode('main');
                    showToast(
                        legacyFormatDetected
                            ? `${found.length}枚を読み込みました（次回保存時に正式形式へ変換）`
                            : `${found.length}枚の写真を読み込みました`,
                        'success'
                    );
                } catch (e) { console.error(e); showToast("読み込みに失敗しました: " + e.message, 'error'); }
                finally { setIsProcessing(false); }
            };

            const handleOpenFolder = async () => {
                try {
                    const h = await window.showDirectoryPicker({ mode: 'readwrite' });
                    let autoStd = null;
                    try {
                        const pDir = h.name === 'PHOTO' ? h : await h.getDirectoryHandle('PHOTO');
                        const f = await (await pDir.getFileHandle('PHOTO.XML')).getFile();
                        if (window.Encoding) {
                            const d = window.Encoding.codeToString(window.Encoding.convert(new Uint8Array(await f.arrayBuffer()), 'UNICODE', 'AUTO'));
                            if (d.includes("202303")) autoStd = "R06";
                            else if (d.includes("201603") || d.includes("202003") || d.includes("PHOTO05")) autoStd = "H30";
                        }
                    } catch { }
                    if (autoStd) { await loadFolder(h, autoStd); }
                    else { setTempHandle(h); setStandardSelectMode('existing'); setMode('select_std'); }
                } catch { }
            };

            const handleNewProject = async () => {
                try {
                    const h = await window.showDirectoryPicker({ mode: 'readwrite' });
                    setTempHandle(h); setStandardSelectMode('new'); setMode('select_std');
                } catch { }
            };

            const handleStandardChosen = async (stdId) => {
                if (standardSelectMode === 'new') {
                    setIsProcessing(true); setProcessMsg("プロジェクト構造を作成中...");
                    try {
                        const std = STANDARDS[stdId];
                        const pDir = await tempHandle.getDirectoryHandle(std.photoFolder, { create: true });
                        await pDir.getDirectoryHandle(std.picFolder, { create: true });
                        await pDir.getDirectoryHandle(std.drawfFolder, { create: true });
                        await saveDtdToFolder(pDir, stdId);
                        setPhotos([]); setRootHandle(tempHandle); setSelectedStandard(stdId);
                        setCurrentPage(1); setMode('main');
                        await saveXmlToDir([], tempHandle, stdId);
                        showToast("新規プロジェクトを作成しました", 'success');
                    } catch (e) { showToast("作成に失敗: " + e.message, 'error'); }
                    finally { setIsProcessing(false); }
                } else { await loadFolder(tempHandle, stdId); }
            };

            const handleStandardChange = async (newStdId) => {
                setIsProcessing(true); setProcessMsg("基準を切り替え中...");
                try {
                    setSelectedStandard(newStdId);
                    const std = STANDARDS[newStdId];
                    const photoDir = await getPhotoDir(rootHandle, std);
                    await saveDtdToFolder(photoDir, newStdId);
                    await saveXmlToDir(photos, rootHandle, newStdId);
                    showToast(`基準を ${std.label} に変更しました`, 'success');
                } catch (e) { showToast("基準の変更に失敗: " + e.message, 'error'); }
                finally { setIsProcessing(false); }
            };

            const processDropFiles = async (files) => {
                if (!rootHandle) return;
                setIsProcessing(true); setProcessMsg("写真を取り込み中...");
                try {
                    const std = STANDARDS[selectedStandard];
                    const photoDir = await getPhotoDir(rootHandle, std);
                    const picDir = await photoDir.getDirectoryHandle(std.picFolder);
                    const valid = Array.from(files).filter(f => std.acceptExt.test(f.name));
                    if (!valid.length) { showToast("対応形式のファイルがありません", 'error'); return; }

                    const maxSerial = photos.length > 0 ? Math.max(...photos.map(p => parseInt(p.serialNo) || 0)) : 0;
                    const maxNum = photos.length > 0 ? Math.max(...photos.map(p => parseFileNum(p.name))) : 0;
                    const added = [];

                    for (let i = 0; i < valid.length; i++) {
                        const f = valid[i];
                        const name = makeFileName(maxNum + i + 1, selectedStandard);
                        const h = await picDir.getFileHandle(name, { create: true });
                        const w = await h.createWritable(); await w.write(f); await w.close();
                        const nf = await h.getFile();

                        // EXIFから撮影日を取得。EXIFがない場合は空文字（バリデーションエラーとして明示）
                        const shootingDateStr = await readExifDate(f);
                        added.push({
                            id: name + '_' + f.size + '_' + Date.now(), name, handle: h, file: nf, size: f.size,
                            serialNo: toSerial(maxSerial + i + 1),
                            category: "施工状況写真", workType: "", type: "", subdivision: "", discipline: "",
                            title: "", shootingDate: shootingDateStr,
                            isRepresentative: false, isFrequency: false,
                            referenceFileName: "", referenceTitle: "",
                        });
                    }
                    setPhotos(p => [...p, ...added]);
                    showToast(`${added.length}枚を追加しました`, 'success');
                } catch (e) { showToast("取込み失敗: " + e.message, 'error'); }
                finally { setIsProcessing(false); }
            };

            const handleDelete = async () => {
                if (!selectedIds.size) return;
                if (!confirm(`選択した ${selectedIds.size} 枚の写真を完全に削除しますか？\nこの操作は元に戻せません。`)) return;
                setIsProcessing(true); setProcessMsg("削除中...");
                try {
                    const std = STANDARDS[selectedStandard];
                    const photoDir = await getPhotoDir(rootHandle, std);
                    const picDir = await photoDir.getDirectoryHandle(std.picFolder);
                    for (const id of selectedIds) {
                        const p = photos.find(x => x.id === id);
                        if (p) { try { await picDir.removeEntry(p.name); } catch { } }
                    }
                    const next = photos.filter(x => !selectedIds.has(x.id)).map((p, i) => ({ ...p, serialNo: toSerial(i + 1) }));
                    setPhotos(next); setSelectedIds(new Set());
                    showToast(`${selectedIds.size}枚を削除しました`, 'success');
                } catch (e) { showToast("削除失敗: " + e.message, 'error'); }
                finally { setIsProcessing(false); }
            };

            const handleRename = async () => {
                if (!confirm(`表示順に従ってファイル名を ${makeFileName(1, selectedStandard)} 形式で再構成します。\n実際のファイルが書き換えられます。続けますか？`)) return;
                setIsProcessing(true); setProcessMsg("リネーム中...");
                try {
                    const std = STANDARDS[selectedStandard];
                    const photoDir = await getPhotoDir(rootHandle, std);
                    const picDir = await photoDir.getDirectoryHandle(std.picFolder);
                    const drawfDir = await photoDir.getDirectoryHandle(std.drawfFolder).catch(() => null);
                    const nList = [...photos];
                    const useMoveAPI = typeof FileSystemFileHandle.prototype.move === 'function';

                    // 参考図リネーム
                    const refFinalMap = new Map();
                    const refTasks = [];
                    if (drawfDir) {
                        const uniqueRefs = [...new Set(nList.map(p => p.referenceFileName).filter(Boolean))];
                        let refCounter = 1;
                        for (let i = 0; i < uniqueRefs.length; i++) {
                            const oldName = uniqueRefs[i];
                            const ext = oldName.includes('.') ? oldName.substring(oldName.lastIndexOf('.')) : '';
                            const finalName = `D${String(refCounter).padStart(7, '0')}${ext.toUpperCase()}`;
                            refFinalMap.set(oldName, finalName);
                            refCounter++;
                            if (oldName !== finalName) refTasks.push({ oldName, tmpName: `_tmp_ref_${Date.now()}_${i}${ext}`, finalName });
                        }
                    }

                    // 写真リネームタスク生成
                    const photoTasks = [];
                    for (let i = 0; i < nList.length; i++) {
                        if (nList[i].referenceFileName && refFinalMap.has(nList[i].referenceFileName)) {
                            nList[i].referenceFileName = refFinalMap.get(nList[i].referenceFileName);
                        }
                        const finalName = makeFileName(i + 1, selectedStandard);
                        if (nList[i].name !== finalName) {
                            photoTasks.push({ index: i, oldName: nList[i].name, tmpName: `_tmp_p_${Date.now()}_${i}.jpg`, finalName, handle: nList[i].handle });
                        } else {
                            nList[i].serialNo = toSerial(i + 1);
                        }
                    }

                    if (refTasks.length === 0 && photoTasks.length === 0) {
                        setIsProcessing(false);
                        showToast("すべてのファイル名が既に最適な状態です（スキップ）", 'success');
                        return;
                    }

                    // 参考図: temp → final
                    if (drawfDir && refTasks.length > 0) {
                        await executeChunked(refTasks, async (task) => {
                            try {
                                const fh = await drawfDir.getFileHandle(task.oldName);
                                if (useMoveAPI) { await fh.move(task.tmpName); }
                                else {
                                    const f = await fh.getFile();
                                    const th = await drawfDir.getFileHandle(task.tmpName, { create: true });
                                    const w = await th.createWritable(); await w.write(f); await w.close();
                                    await drawfDir.removeEntry(task.oldName);
                                }
                            } catch (e) { }
                        });
                        await executeChunked(refTasks, async (task) => {
                            try {
                                const th = await drawfDir.getFileHandle(task.tmpName);
                                if (useMoveAPI) { await th.move(task.finalName); }
                                else {
                                    const f = await th.getFile();
                                    const fh = await drawfDir.getFileHandle(task.finalName, { create: true });
                                    const w = await fh.createWritable(); await w.write(f); await w.close();
                                    await drawfDir.removeEntry(task.tmpName);
                                }
                            } catch (e) { }
                        });
                    }

                    // 写真: temp → final
                    if (photoTasks.length > 0) {
                        await executeChunked(photoTasks, async (task) => {
                            if (useMoveAPI) { await task.handle.move(task.tmpName); }
                            else {
                                const f = await task.handle.getFile();
                                const th = await picDir.getFileHandle(task.tmpName, { create: true });
                                const w = await th.createWritable(); await w.write(f); await w.close();
                                await picDir.removeEntry(task.oldName);
                                task.handle = th;
                            }
                        });
                        await executeChunked(photoTasks, async (task) => {
                            let finalHandle;
                            if (useMoveAPI) { await task.handle.move(task.finalName); finalHandle = task.handle; }
                            else {
                                const f = await task.handle.getFile();
                                finalHandle = await picDir.getFileHandle(task.finalName, { create: true });
                                const w = await finalHandle.createWritable(); await w.write(f); await w.close();
                                await picDir.removeEntry(task.tmpName);
                            }
                            const pItem = nList[task.index];
                            pItem.name = task.finalName;
                            pItem.serialNo = toSerial(task.index + 1);
                            pItem.handle = finalHandle;
                            pItem.file = await finalHandle.getFile();
                            pItem.id = task.finalName + '_' + pItem.file.size;
                        });
                    }
                    setPhotos(nList); setSelectedIds(new Set());
                    showToast("リネーム完了", 'success');
                } catch (e) { showToast("リネーム失敗: " + e.message, 'error'); }
                finally { setIsProcessing(false); }
            };

            const handleMerge = async () => {
                try {
                    const srcHandle = await window.showDirectoryPicker();
                    setIsProcessing(true); setProcessMsg("プロジェクトを結合中...");
                    const std = STANDARDS[selectedStandard];
                    let srcPhotoDir;
                    try { srcPhotoDir = srcHandle.name === std.photoFolder ? srcHandle : await srcHandle.getDirectoryHandle(std.photoFolder); }
                    catch { srcPhotoDir = srcHandle; }
                    const srcPicDir = await srcPhotoDir.getDirectoryHandle(std.picFolder);

                    // 結合元PHOTO.XMLをパース（失敗してもファイルは取り込む）
                    let srcXmlMap = {};
                    try {
                        const { nodes } = await readPhotoXmlNodes(srcPhotoDir);
                        srcXmlMap = buildXmlMapFromNodes(nodes);
                    } catch { }

                    const photoDir = await getPhotoDir(rootHandle, std);
                    const destPicDir = await photoDir.getDirectoryHandle(std.picFolder);
                    const maxSerial = photos.length > 0 ? Math.max(...photos.map(p => parseInt(p.serialNo) || 0)) : 0;
                    const maxNum = photos.length > 0 ? Math.max(...photos.map(p => parseFileNum(p.name))) : 0;
                    const existingSizes = new Set(photos.map(p => p.size));
                    const pendingFiles = [];

                    for await (const entry of srcPicDir.values()) {
                        if (entry.kind !== 'file' || !std.acceptExt.test(entry.name)) continue;
                        const file = await entry.getFile();
                        if (existingSizes.has(file.size)) continue;
                        const x = srcXmlMap[entry.name.toUpperCase()] || {};
                        pendingFiles.push({ entry, file, originalSerial: parseInt(x.serialNo) || 9999999, xmlData: x });
                    }
                    pendingFiles.sort((a, b) => a.originalSerial - b.originalSerial);

                    const newPhotos = [];
                    for (let i = 0; i < pendingFiles.length; i += CONCURRENCY_LIMIT) {
                        const chunk = pendingFiles.slice(i, i + CONCURRENCY_LIMIT);
                        const results = await Promise.all(chunk.map(async (item, idx) => {
                            const globalIndex = i + idx;
                            const name = makeFileName(maxNum + globalIndex + 1, selectedStandard);
                            const th = await destPicDir.getFileHandle(name, { create: true });
                            const w = await th.createWritable(); await w.write(item.file); await w.close();
                            const nf = await th.getFile();
                            const x = item.xmlData;

                            // 撮影日: XML → EXIF → 空文字（lastModifiedフォールバック廃止）
                            const sDate = x.shootingDate || await readExifDate(item.file);

                            return {
                                id: name + '_' + nf.size + '_' + Date.now(), name, handle: th, file: nf, size: nf.size,
                                serialNo: toSerial(maxSerial + globalIndex + 1),
                                category: x.category || "施工状況写真",
                                workType: x.workType || "",
                                type: x.type || "",
                                subdivision: x.subdivision || "",
                                discipline: findDiscipline(x.workType),
                                title: x.title || "",
                                shootingDate: sDate,
                                isRepresentative: x.isRepresentative || false,
                                isFrequency: x.isFrequency || false,
                                referenceFileName: x.referenceFileName || "",
                                referenceTitle: x.referenceTitle || "",
                            };
                        }));
                        newPhotos.push(...results);
                    }
                    setPhotos(p => [...p, ...newPhotos]);
                    showToast(`${pendingFiles.length}枚を結合しました`, 'success');
                } catch (e) { if (e.name !== 'AbortError') showToast("結合失敗: " + e.message, 'error'); }
                finally { setIsProcessing(false); }
            };

            const handleSelectReferenceFile = async () => {
                if (!rootHandle || !selectedIds.size) return;
                try {
                    const [fileHandle] = await window.showOpenFilePicker({
                        types: [{ description: '参考図ファイル', accept: { '*/*': ['.pdf', '.jpg', '.jpeg', '.tif', '.tiff', '.sfc', '.p21', '.jww', '.dwg', '.dxf'] } }]
                    });
                    const file = await fileHandle.getFile();
                    setIsProcessing(true); setProcessMsg("参考図をコピー中...");
                    const std = STANDARDS[selectedStandard];
                    const photoDir = await getPhotoDir(rootHandle, std);
                    const drawfDir = await photoDir.getDirectoryHandle(std.drawfFolder, { create: true });
                    const destHandle = await drawfDir.getFileHandle(file.name, { create: true });
                    const w = await destHandle.createWritable();
                    await w.write(file); await w.close();
                    const vName = sanitizeForJS(file.name);
                    const vTitle = sanitizeForJS(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
                    setPhotos(prev => prev.map(p => {
                        if (!selectedIds.has(p.id)) return p;
                        return { ...p, referenceFileName: vName, referenceTitle: p.referenceTitle || vTitle };
                    }));
                    showToast(`参考図 ${file.name} を登録しました`, 'success');
                } catch (e) { if (e.name !== 'AbortError') showToast("参考図の追加に失敗: " + e.message, 'error'); }
                finally { setIsProcessing(false); }
            };

            const handlePageDragOver = (e, direction) => {
                e.preventDefault();
                if (!draggedId) return;
                if (!pageChangeTimerRef.current) {
                    pageChangeTimerRef.current = setTimeout(() => {
                        setCurrentPage(p => {
                            const next = direction === 'next' ? p + 1 : p - 1;
                            return Math.max(1, Math.min(totalPages, next));
                        });
                        pageChangeTimerRef.current = null;
                    }, 1000);  // 800ms → 1000ms
                }
            };
            const handlePageDragLeave = () => {
                if (pageChangeTimerRef.current) { clearTimeout(pageChangeTimerRef.current); pageChangeTimerRef.current = null; }
            };

            // __EMPTY__ は「未入力のみ」フィルタ
            const isMatch = (itemVal, filterVal) => {
                if (!filterVal) return true;
                if (filterVal === '__EMPTY__') return !itemVal;
                return itemVal === filterVal;
            };

            const filteredPhotos = useMemo(() => photos.filter(p => {
                if (!isMatch(p.category, fCategory)) return false;
                if (!isMatch(p.workType, fWorkType)) return false;
                if (!isMatch(p.type, fType)) return false;
                if (!isMatch(p.subdivision, fSubdivision)) return false;
                if (fErr && validatePhoto(p).length === 0) return false;
                return true;
            }), [photos, fCategory, fWorkType, fType, fSubdivision, fErr]);

            useEffect(() => { setCurrentPage(1); }, [fCategory, fWorkType, fType, fSubdivision, fErr]);

            const totalPages = Math.max(1, Math.ceil(filteredPhotos.length / ITEMS_PER_PAGE));
            useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [totalPages, currentPage]);

            const paginatedPhotos = useMemo(() => {
                const start = (currentPage - 1) * ITEMS_PER_PAGE;
                return filteredPhotos.slice(start, start + ITEMS_PER_PAGE);
            }, [filteredPhotos, currentPage]);

            const handlePhotoClick = (e, id) => {
                const next = new Set(selectedIds);
                if (e.shiftKey && lastSelectedId) {
                    const a = paginatedPhotos.findIndex(p => p.id === lastSelectedId);
                    const b = paginatedPhotos.findIndex(p => p.id === id);
                    if (a !== -1 && b !== -1) {
                        const [s, end] = a < b ? [a, b] : [b, a];
                        paginatedPhotos.slice(s, end + 1).forEach(p => next.add(p.id));
                    } else { next.add(id); }
                } else if (e.ctrlKey || e.metaKey) {
                    if (next.has(id)) next.delete(id); else next.add(id);
                    setLastSelectedId(id);
                } else { next.clear(); next.add(id); setLastSelectedId(id); }
                setSelectedIds(next);
            };

            // updateField: フラグ等の即時反映（テキスト入力はeditDraftパターンを使う）
            const updateField = (field, value) => {
                setPhotos(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, [field]: value } : p));
            };

            // 選択中写真の共通値を返す（値が混在する場合は "MIXED"）
            const commonVal = (field) => {
                const sel = photos.filter(p => selectedIds.has(p.id));
                if (!sel.length) return "";
                const first = sel[0][field];
                return sel.every(p => p[field] === first) ? (first ?? "") : "MIXED";
            };

            // editDraftパターン: テキスト入力のIME安全化
            // onChange → editDraft に仮保存（photos は変更しない）
            // onBlur / Enter → applyDraft() で sanitize して photos に確定反映
            const getDraftVal = (field) => editDraft[field] !== undefined ? editDraft[field] : commonVal(field);
            const handleDraftChange = (field, val) => setEditDraft(prev => ({ ...prev, [field]: val }));
            const applyDraft = (field) => {
                if (editDraft[field] === undefined) return;
                const SANITIZE_FIELDS = ['title', 'workType', 'type', 'subdivision', 'referenceTitle'];
                const finalVal = SANITIZE_FIELDS.includes(field) ? sanitizeForJS(editDraft[field]) : editDraft[field];
                setPhotos(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, [field]: finalVal } : p));
                setEditDraft(prev => { const next = { ...prev }; delete next[field]; return next; });
            };
            const handleKeyDown = (e) => { if (e.key === 'Enter') e.target.blur(); };

            const selDisc = getDraftVal('discipline');
            const _selCat = getDraftVal('category');
            const _isMechElec = ["機械", "電気"].includes(selDisc);
            // 工種は全写真区分で必須（ZH005-00-24-A 表5-1）のため常にtrue
            const needsSubdiv = _isMechElec
                ? ["施工状況写真", "機器製作写真", "使用材料写真", "品質管理写真", "出来形管理写真", "着手前及び完成写真"].includes(_selCat)
                : ["施工状況写真", "品質管理写真", "出来形管理写真"].includes(_selCat);
            const errorCount = useMemo(() => photos.filter(p => validatePhoto(p).length > 0).length, [photos]);

            const renderPaginationControls = (extraClass = "") => {
                if (totalPages <= 1) return null;
                return (
                    <div className={`flex items-center justify-center gap-4 w-full no-print ${extraClass}`}>
                        <button className={`btn ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'btn-ghost'}`}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                            onDragOver={e => handlePageDragOver(e, 'prev')} onDragLeave={handlePageDragLeave} onDrop={handlePageDragLeave}>
                            <Ic k="chevronLeft" size={16} /> 前の100件
                        </button>
                        <div className="text-sm font-bold text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                            {currentPage} <span className="text-slate-400 font-normal mx-1">/</span> {totalPages} ページ
                        </div>
                        <button className={`btn ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'btn-ghost'}`}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                            onDragOver={e => handlePageDragOver(e, 'next')} onDragLeave={handlePageDragLeave} onDrop={handlePageDragLeave}>
                            次の100件 <Ic k="chevronRight" size={16} />
                        </button>
                    </div>
                );
            };

            if (mode === 'welcome' || mode === 'select_std') {
                return (
                    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#001d4a] to-[#003580]">
                        {isProcessing && <ProcessingOverlay msg={processMsg} />}
                        <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-lg mx-4 anim-fadeup">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="bg-[#002d6e] rounded-xl p-3"><Ic k="camera" size={28} cls="text-white" /></div>
                                <div>
                                    <h1 className="text-xl font-black text-[#002d6e] tracking-tight">MLIT PHOTO PRO</h1>
                                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">v0.1 — 国土交通省 電子納品対応</p>
                                </div>
                            </div>
                            {mode === 'welcome' && (
                                <>
                                    <p className="text-sm text-slate-500 mb-8 leading-relaxed">JS工事記録写真電子管理要領に完全準拠した写真管理・PHOTO.XML生成ツールです。<br />写真データはすべてローカルフォルダに直接保存されます。</p>
                                    <div className="space-y-3">
                                        <button className="btn btn-blue w-full py-3 text-sm justify-center" onClick={handleOpenFolder}><Ic k="folderOpen" size={18} /> 既存フォルダを開く</button>
                                        <button className="btn btn-ghost w-full py-3 text-sm justify-center" onClick={handleNewProject}><Ic k="plus" size={18} /> 新規プロジェクト作成</button>
                                    </div>
                                    <div className="mt-8 bg-blue-50 rounded-xl p-4 text-xs text-blue-700 font-medium leading-relaxed border border-blue-100">
                                        <strong className="font-bold">基準の選択について</strong><br />
                                        ・<span className="text-orange-600 font-bold">H30年度基準</span>：H30.4.1 〜 R6.3.31 契約分<br />
                                        ・<span className="text-blue-600 font-bold">R6年度基準</span>：R6.4.1 以降 契約分<br />
                                        既存フォルダはPHOTO.XMLの内容から自動判定します。
                                    </div>
                                </>
                            )}
                            {mode === 'select_std' && (
                                <>
                                    <p className="text-sm font-bold text-slate-600 mb-5">{standardSelectMode === 'new' ? "新規プロジェクトの基準を選択" : "適用する基準を選択してください"}</p>
                                    <div className="space-y-3">
                                        {Object.values(STANDARDS).map(s => (
                                            <button key={s.id} className="w-full text-left p-4 border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl transition-all group" onClick={() => handleStandardChosen(s.id)}>
                                                <div className="flex items-center justify-between">
                                                    <div><div className="font-bold text-slate-800 group-hover:text-blue-700">{s.fullLabel}</div><div className="text-xs text-slate-400 mt-1">{s.period}</div><div className="text-[10px] font-mono text-slate-400 mt-0.5">{s.versionTag}</div></div>
                                                    <span className={`badge ${s.color} text-[10px]`}>{s.dtdName}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <button className="text-xs text-slate-400 mt-6 underline block mx-auto" onClick={() => setMode('welcome')}>← 戻る</button>
                                </>
                            )}
                        </div>
                    </div>
                );
            }

            return (
                <div className="flex flex-col h-screen overflow-hidden">
                    {isProcessing && <ProcessingOverlay msg={processMsg} />}
                    {isDragOver && <div className="drop-overlay"><div className="bg-white p-12 rounded-2xl shadow-2xl text-center"><Ic k="upload" size={48} cls="text-blue-600 mx-auto mb-4" /><p className="font-bold text-slate-700">写真をドロップ</p></div></div>}

                    {isChangeStdModalOpen && (
                        <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center no-print">
                            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 anim-fadeup">
                                <p className="text-sm font-bold text-slate-600 mb-5">適用する基準を選択してください</p>
                                <div className="space-y-3">
                                    {Object.values(STANDARDS).map(s => (
                                        <button key={s.id} className="w-full text-left p-4 border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl transition-all group" onClick={() => { handleStandardChange(s.id); setIsChangeStdModalOpen(false); }}>
                                            <div className="flex items-center justify-between">
                                                <div><div className="font-bold text-slate-800 group-hover:text-blue-700">{s.fullLabel}</div><div className="text-xs text-slate-400 mt-1">{s.period}</div><div className="text-[10px] font-mono text-slate-400 mt-0.5">{s.versionTag}</div></div>
                                                <span className={`badge ${s.color} text-[10px]`}>{s.dtdName}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <button className="text-xs text-slate-400 mt-6 underline block mx-auto hover:text-slate-600" onClick={() => setIsChangeStdModalOpen(false)}>キャンセル</button>
                            </div>
                        </div>
                    )}

                    <header className="app-header no-print">
                        <div className="flex items-center gap-3">
                            <div className="bg-[#0055b3] rounded-lg p-1.5"><Ic k="camera" size={20} cls="text-white" /></div>
                            <span className="font-black text-lg tracking-tight">MLIT PHOTO PRO</span>
                            <button onClick={() => setIsChangeStdModalOpen(true)} className={`badge ${STANDARDS[selectedStandard]?.color} text-[11px] px-2.5 py-1 hover:opacity-80 transition-opacity ml-2 cursor-pointer`} title="適用基準を変更">
                                {STANDARDS[selectedStandard]?.label} <span className="ml-1 text-[9px]">▼</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="btn btn-warn" onClick={handleRename} data-tip="表示順でファイル名を一括連番化"><Ic k="sortNum" size={14} /> リネーム</button>
                            <button className="btn btn-green" onClick={handleMerge} data-tip="他フォルダの写真を結合"><Ic k="merge" size={14} /> 結合</button>
                            <button className="btn bg-white text-slate-700 hover:bg-slate-100" onClick={() => window.print()} data-tip="写真台帳を印刷・PDF保存"><Ic k="printer" size={14} cls="text-slate-600" /> 印刷</button>
                            <button className="btn btn-ghost text-white border-white/20 hover:bg-white/10" onClick={() => { if (confirm("プロジェクトを閉じますか？")) { setMode('welcome'); setPhotos([]); setRootHandle(null); setSelectedStandard(null); } }}><Ic k="logOut" size={14} /></button>
                        </div>
                    </header>

                    <div className="flex flex-1 overflow-hidden"
                        onDragOver={e => { e.preventDefault(); const hasFiles = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files'); if (!isProcessing && hasFiles && !draggedId) setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={e => { e.preventDefault(); setIsDragOver(false); if (!draggedId && e.dataTransfer.files.length) processDropFiles(e.dataTransfer.files); }}>

                        <main className="flex-1 flex flex-col overflow-hidden bg-slate-100">
                            <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center gap-4 flex-shrink-0 no-print overflow-x-auto no-sb">
                                <div className="flex items-center gap-2 mr-2 flex-shrink-0"><Ic k="folder" size={18} cls="text-blue-500" /><span className="text-base font-bold text-slate-700">{rootHandle?.name}</span><span className="badge badge-blue text-[10px] ml-1">{filteredPhotos.length}/{photos.length}枚</span></div>
                                <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
                                <Ic k="filter" size={14} cls="text-slate-400 flex-shrink-0" />
                                <FilterSelect value={fCategory} onChange={setFCategory} options={PHOTO_CATEGORIES} placeholder="区分: すべて" />
                                <FilterSelect value={fWorkType} onChange={setFWorkType} options={[...new Set(photos.map(p => p.workType))].filter(Boolean).sort()} placeholder="工種: すべて" />
                                <FilterSelect value={fType} onChange={setFType} options={[...new Set(photos.map(p => p.type))].filter(Boolean).sort()} placeholder="種別: すべて" />
                                <FilterSelect value={fSubdivision} onChange={setFSubdivision} options={[...new Set(photos.map(p => p.subdivision))].filter(Boolean).sort()} placeholder="細別: すべて" />
                                <button className={`btn flex-shrink-0 ${fErr ? 'btn-danger' : 'btn-ghost'}`} onClick={() => setFErr(v => !v)}>
                                    <Ic k="alertCircle" size={13} /> 未完了 {errorCount > 0 && <span className={`badge ${fErr ? 'bg-red-700 text-white' : 'badge-orange'}`}>{errorCount}</span>}
                                </button>
                                <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                                    <button className="text-xs font-bold text-blue-600 hover:underline" onClick={() => setSelectedIds(new Set(filteredPhotos.map(p => p.id)))}>全選択</button>
                                    <span className="text-slate-300">|</span>
                                    <button className="text-xs font-bold text-slate-500 hover:underline" onClick={() => setSelectedIds(new Set())}>解除</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5">
                                {photos.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full py-24 text-center">
                                        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-100"><Ic k="camera" size={36} cls="text-blue-400" /></div>
                                        <h3 className="text-lg font-bold text-slate-600 mb-2">写真がありません</h3>
                                        <p className="text-sm text-slate-400">JPEGファイルをここにドラッグ＆ドロップしてください</p>
                                    </div>
                                ) : filteredPhotos.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Ic k="filter" size={40} cls="mb-4 opacity-30" /><p className="font-bold">フィルタ条件に一致する写真がありません</p></div>
                                ) : (
                                    <>
                                        {renderPaginationControls("mb-4")}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                            {paginatedPhotos.map(p => {
                                                const errs = validatePhoto(p); const isErr = errs.length > 0; const isSel = selectedIds.has(p.id);
                                                return (
                                                    <div key={p.id} draggable
                                                        onDragStart={e => { setDraggedId(p.id); e.dataTransfer.setData('text/plain', p.id); }}
                                                        onDragEnd={() => { setDraggedId(null); handlePageDragLeave(); }}
                                                        onDragOver={e => e.preventDefault()}
                                                        onDrop={e => {
                                                            e.preventDefault();
                                                            if (!draggedId || draggedId === p.id) return;
                                                            const items = [...photos];
                                                            const di = items.findIndex(i => i.id === draggedId);
                                                            const ti = items.findIndex(i => i.id === p.id);
                                                            const [di2] = items.splice(di, 1);
                                                            items.splice(ti, 0, di2);
                                                            setPhotos(items.map((it, i) => ({ ...it, serialNo: toSerial(i + 1) })));
                                                            setDraggedId(null); handlePageDragLeave();
                                                        }}
                                                        onClick={e => handlePhotoClick(e, p.id)}
                                                        onDoubleClick={() => setPreviewPhoto(p)}
                                                        className={`photo-card ${isSel ? 'selected' : ''} ${isErr && !isSel ? 'error-card' : ''}`}>
                                                        <div className="aspect-[4/3] relative overflow-hidden bg-slate-200 rounded-t-xl">
                                                            <LazyImage file={p.file} className="w-full h-full object-cover" />
                                                            {isErr && <div className="absolute top-2 left-2 badge badge-orange text-[9px]"><Ic k="alertCircle" size={10} /> 要修正</div>}
                                                            <div className="absolute top-2 right-2 flex gap-1">
                                                                {p.referenceFileName && <div className="w-5 h-5 bg-purple-600 rounded-md flex items-center justify-center" title="参考図あり"><Ic k="list" size={10} cls="text-white" /></div>}
                                                                {p.isRepresentative && <div className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center"><Ic k="star" size={10} cls="text-white" fill="white" /></div>}
                                                                {p.isFrequency && <div className="w-5 h-5 bg-emerald-600 rounded-md flex items-center justify-center"><Ic k="checkCircle" size={10} cls="text-white" /></div>}
                                                            </div>
                                                        </div>
                                                        <div className="p-2.5">
                                                            <div className="flex items-center justify-between mb-1"><span className="mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{p.serialNo}</span><span className="mono text-[9px] text-slate-400">{p.shootingDate}</span></div>
                                                            <p className={`text-[11px] font-bold line-clamp-2 leading-tight ${!p.title ? 'text-orange-500 italic' : 'text-slate-700'}`}>{p.title || "（タイトル未入力）"}</p>
                                                            {p.category && <div className="mt-1.5"><span className="badge badge-slate text-[9px]">{p.category}</span></div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {renderPaginationControls("mt-8 pt-4 pb-4")}
                                    </>
                                )}
                            </div>
                        </main>

                        <aside className="w-[340px] bg-white border-l border-slate-200 flex flex-col overflow-hidden flex-shrink-0 no-print">
                            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                                <div className="flex items-center gap-2"><Ic k="edit" size={16} cls="text-blue-600" /><span className="text-sm font-bold text-slate-700 uppercase tracking-wide">属性編集</span>{selectedIds.size > 0 && <span className="badge badge-blue text-[10px]">{selectedIds.size}枚</span>}</div>
                                {selectedIds.size > 0 && <button className="btn btn-danger py-1 px-2.5 text-[11px]" onClick={handleDelete}><Ic k="trash" size={12} /> 削除</button>}
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {selectedIds.size === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center py-12"><Ic k="cursor" size={40} cls="mb-4 opacity-40" /><p className="text-xs font-bold uppercase tracking-widest leading-relaxed">写真をクリックして<br />選択してください</p></div>
                                ) : (
                                    <>
                                        {selectedIds.size > 1 && <div className="validation-banner"><Ic k="info" size={14} cls="text-amber-600 flex-shrink-0" /><span>{selectedIds.size}枚に一括適用されます</span></div>}
                                        {selectedIds.size === 1 && (() => {
                                            const p = photos.find(x => selectedIds.has(x.id));
                                            const errs = p ? validatePhoto(p) : [];
                                            return errs.length > 0
                                                ? <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs font-bold text-orange-700"><div className="flex items-center gap-1.5 mb-1"><Ic k="alertTri" size={13} cls="text-orange-500" /> 未入力の必須項目</div><div className="text-orange-600">{errs.join("、")}</div></div>
                                                : <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs font-bold text-green-700 flex items-center gap-1.5"><Ic k="checkCircle" size={13} cls="text-green-500" /> 全項目入力済み</div>;
                                        })()}
                                        <Section title="基本情報">
                                            <div><label className="field-label required">写真タイトル</label><input type="text" value={getDraftVal('title') === 'MIXED' ? '' : getDraftVal('title')} placeholder={getDraftVal('title') === 'MIXED' ? '（複数の値）' : '撮影内容・場所・状況を入力'} onChange={e => handleDraftChange('title', e.target.value)} onBlur={() => applyDraft('title')} onKeyDown={handleKeyDown} className={`field-input text-sm ${!getDraftVal('title') && getDraftVal('title') !== 'MIXED' ? 'err' : ''}`} /></div>
                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                <div>
                                                    <label className="field-label required">撮影年月日</label>
                                                    <input type="date" value={commonVal('shootingDate') === 'MIXED' ? '' : commonVal('shootingDate')} readOnly disabled className={`field-input text-sm opacity-70 cursor-not-allowed ${!commonVal('shootingDate') && commonVal('shootingDate') !== 'MIXED' ? 'err' : ''}`} title="撮影年月日はEXIFから自動取得されます（写真編集不可の原則）" />
                                                </div>
                                                <div><label className="field-label required">写真区分</label><select value={getDraftVal('category') === 'MIXED' ? '' : getDraftVal('category')} onChange={e => handleDraftChange('category', e.target.value)} onBlur={() => applyDraft('category')} className="field-input text-sm"><option value="">選択</option>{PHOTO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                            </div>
                                        </Section>
                                        <Section title="工種分類" subtitle="JS要領 5章参照">
                                            <div><label className="field-label">工事種別</label><select value={getDraftVal('discipline') === 'MIXED' ? '' : getDraftVal('discipline')} onChange={e => handleDraftChange('discipline', e.target.value)} onBlur={() => applyDraft('discipline')} className="field-input text-sm"><option value="">未選択</option>{WORK_MASTER.map(m => <option key={m.discipline} value={m.discipline}>{m.discipline}</option>)}</select></div>
                                            <div className="mt-3"><label className={`field-label required`}>工種</label><input type="text" list="wt-list" value={getDraftVal('workType') === 'MIXED' ? '' : getDraftVal('workType')} placeholder={getDraftVal('workType') === 'MIXED' ? '（複数）' : '工種を選択または入力'} onChange={e => handleDraftChange('workType', e.target.value)} onBlur={() => applyDraft('workType')} onKeyDown={handleKeyDown} className={`field-input text-sm ${!getDraftVal('workType') ? 'err' : ''}`} /><datalist id="wt-list">{WORK_MASTER.find(m => m.discipline === selDisc)?.workTypes?.map(w => <option key={w.name} value={w.name} />)}</datalist></div>
                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                <div><label className={`field-label required`}>種別</label><input type="text" list="type-list" value={getDraftVal('type') === 'MIXED' ? '' : getDraftVal('type')} placeholder={getDraftVal('type') === 'MIXED' ? '（複数）' : '種別'} onChange={e => handleDraftChange('type', e.target.value)} onBlur={() => applyDraft('type')} onKeyDown={handleKeyDown} className={`field-input text-sm ${!getDraftVal('type') ? 'err' : ''}`} /><datalist id="type-list">{WORK_MASTER.find(m => m.discipline === selDisc)?.workTypes?.find(w => w.name === getDraftVal('workType'))?.types?.map(t => <option key={t.name} value={t.name} />)}</datalist></div>
                                                <div><label className={`field-label ${needsSubdiv ? 'required' : ''}`}>細別</label><input type="text" list="sub-list" value={getDraftVal('subdivision') === 'MIXED' ? '' : getDraftVal('subdivision')} placeholder={getDraftVal('subdivision') === 'MIXED' ? '（複数）' : '細別'} onChange={e => handleDraftChange('subdivision', e.target.value)} onBlur={() => applyDraft('subdivision')} onKeyDown={handleKeyDown} className={`field-input text-sm ${needsSubdiv && !getDraftVal('subdivision') ? 'err' : ''}`} /><datalist id="sub-list">{WORK_MASTER.find(m => m.discipline === selDisc)?.workTypes?.find(w => w.name === getDraftVal('workType'))?.types?.find(t => t.name === getDraftVal('type'))?.subdivisions?.map(s => <option key={s} value={s} />)}</datalist></div>
                                            </div>
                                        </Section>
                                        <Section title="参考図・付加情報" subtitle="ZH005-00-24-A 表5-1 条件付必須">
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className={`field-label mb-0 ${getDraftVal('referenceTitle') ? 'required' : ''}`}>参考図ファイル名</label>
                                                    <button className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition-colors" onClick={handleSelectReferenceFile}>
                                                        <Ic k="upload" size={10} /> ファイル選択
                                                    </button>
                                                </div>
                                                <input type="text" value={commonVal('referenceFileName') === 'MIXED' ? '' : commonVal('referenceFileName')} readOnly disabled
                                                    placeholder={commonVal('referenceFileName') === 'MIXED' ? '（複数の値）' : 'ボタンから追加'}
                                                    className={`field-input text-sm opacity-70 cursor-not-allowed ${getDraftVal('referenceTitle') && !commonVal('referenceFileName') ? 'err' : ''}`} />
                                            </div>
                                            <div className="mt-3">
                                                <label className={`field-label ${commonVal('referenceFileName') ? 'required' : ''}`}>参考図タイトル</label>
                                                <input type="text" value={getDraftVal('referenceTitle') === 'MIXED' ? '' : getDraftVal('referenceTitle')}
                                                    placeholder={getDraftVal('referenceTitle') === 'MIXED' ? '（複数の値）' : '例: 反応タンク配筋図'}
                                                    onChange={e => handleDraftChange('referenceTitle', e.target.value)}
                                                    onBlur={() => applyDraft('referenceTitle')}
                                                    onKeyDown={handleKeyDown}
                                                    className={`field-input text-sm ${commonVal('referenceFileName') && !getDraftVal('referenceTitle') ? 'err' : ''}`} />
                                            </div>
                                        </Section>
                                        <Section title="フラグ設定">
                                            <div className="grid grid-cols-2 gap-3">
                                                <FlagButton active={commonVal('isRepresentative') === true} onClick={() => updateField('isRepresentative', !commonVal('isRepresentative'))} icon="star" label="代表写真" activeColor="bg-blue-600 text-white border-blue-600" />
                                                <FlagButton active={commonVal('isFrequency') === true} onClick={() => updateField('isFrequency', !commonVal('isFrequency'))} icon="checkCircle" label="提出頻度" activeColor="bg-emerald-600 text-white border-emerald-600" />
                                            </div>
                                        </Section>
                                        {selectedIds.size === 1 && (() => {
                                            const p = photos.find(x => selectedIds.has(x.id));
                                            return p ? (
                                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ファイル情報</p>
                                                    {[['シリアル番号', p.serialNo], ['ファイル名', p.name], ['ファイルサイズ', `${(p.size / 1024).toFixed(0)} KB`]].map(([k, v]) => (
                                                        <div key={k} className="flex justify-between items-center"><span className="text-xs text-slate-500">{k}</span><span className="mono text-xs font-bold text-slate-700">{v}</span></div>
                                                    ))}
                                                </div>
                                            ) : null;
                                        })()}
                                    </>
                                )}
                            </div>
                            <div className="border-t border-slate-200 px-4 py-3 flex items-center gap-2 bg-slate-50 no-print flex-shrink-0">
                                <div className="autosave-dot flex-shrink-0" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">XML 自動保存: 有効</span>
                                <span className="ml-auto mono text-[10px] text-slate-300">{STANDARDS[selectedStandard]?.dtdName}</span>
                            </div>
                        </aside>
                    </div>

                    <div className="status-bar no-print">
                        <div className="flex items-center gap-6">
                            <span className="flex items-center gap-1.5 text-emerald-400"><Ic k="check" size={12} /> JS基準適合</span>
                            <span className="flex items-center gap-1.5"><Ic k="hardDrive" size={12} /> {rootHandle?.name}</span>
                            <span className="flex items-center gap-1.5"><Ic k="camera" size={12} /> {photos.length}枚</span>
                            {errorCount > 0 && <span className="flex items-center gap-1.5 text-orange-400"><Ic k="alertCircle" size={12} /> 未完了 {errorCount}件</span>}
                        </div>
                        <div className="flex items-center gap-4"><span>{STANDARDS[selectedStandard]?.versionTag}</span><span>v0.1</span></div>
                    </div>

                    {previewPhoto && (
                        <div className="fixed inset-0 z-[2000] bg-black/95 flex flex-col no-print" onClick={() => setPreviewPhoto(null)}>
                            <div className="flex items-center justify-between p-6 border-b border-white/10" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center gap-4"><span className="mono badge badge-blue text-sm">{previewPhoto.serialNo}</span><h3 className="text-white font-bold text-lg">{previewPhoto.title || "（タイトル未設定）"}</h3></div>
                                <button className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setPreviewPhoto(null)}><Ic k="close" size={24} /></button>
                            </div>
                            <div className="flex-1 flex items-center justify-center p-8"><LazyImage file={previewPhoto.file} forceLoad={true} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" /></div>
                            <div className="p-4 border-t border-white/10 flex items-center gap-6 text-xs text-white/50 font-bold" onClick={e => e.stopPropagation()}>
                                <span>{previewPhoto.category}</span>{previewPhoto.workType && <span>{previewPhoto.workType} / {previewPhoto.type}</span>}
                                <span className="ml-auto mono">{previewPhoto.name} · {previewPhoto.shootingDate}</span>
                            </div>
                        </div>
                    )}

                    {toast && <div className={`toast no-print ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'} text-white`}><Ic k={toast.type === 'error' ? 'alertCircle' : 'check'} size={16} />{toast.message}</div>}

                    <div className="hidden print:block"><PrintLedger photos={photos} std={STANDARDS[selectedStandard]} /></div>
                </div>
            );
        }

        const ProcessingOverlay = ({ msg }) => (<div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center no-print"><div className="spinner mb-4" /><span className="text-white text-sm font-bold tracking-widest uppercase">{msg}</span></div>);
        const Section = ({ title, subtitle, children }) => (<div className="bg-slate-50 rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 mb-3"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</span>{subtitle && <span className="text-[9px] text-slate-400">{subtitle}</span>}</div>{children}</div>);
        const FlagButton = ({ active, onClick, icon, label, activeColor }) => (<button onClick={onClick} className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all font-bold text-[11px] ${active ? activeColor + ' shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}><Ic k={icon} size={22} fill={active && icon === 'star' ? 'currentColor' : 'none'} />{label}</button>);
        const FilterSelect = ({ value, onChange, options, placeholder }) => (<select value={value} onChange={e => onChange(e.target.value)} className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-pointer hover:border-blue-300 transition-colors max-w-[160px] flex-shrink-0" style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '12px', paddingRight: '24px' }}><option value="">{placeholder}</option>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>);

        const PrintLedger = ({ photos, std }) => (
            <>
                <div className="print-cover" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>
                    <div style={{ borderBottom: '3px solid #002d6e', paddingBottom: '8mm', marginBottom: '10mm' }}><h1 style={{ fontSize: '22pt', fontWeight: 900, color: '#002d6e' }}>工事写真台帳</h1></div>
                    <table style={{ borderCollapse: 'collapse', fontSize: '10pt', width: '100%' }}><tbody>
                        {[['適用基準', std?.versionTag || ''], ['DTD', std?.dtdName || ''], ['写真フォルダ', `${std?.photoFolder}/${std?.picFolder}`], ['総枚数', `${photos.length} 枚`], ['出力日', new Date().toLocaleDateString('ja-JP')]].map(([k, v]) => (
                            <tr key={k}><td style={{ padding: '4mm 6mm', fontWeight: 700, background: '#f0f4f8', width: '40mm', borderBottom: '1px solid #dde3ec' }}>{k}</td><td style={{ padding: '4mm 6mm', borderBottom: '1px solid #dde3ec' }}>{v}</td></tr>
                        ))}
                    </tbody></table>
                </div>
                {Array.from({ length: Math.ceil(photos.length / 2) }).map((_, pageIdx) => (
                    <div key={pageIdx} className="ledger-page">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #002d6e', paddingBottom: '2mm', marginBottom: '4mm', fontFamily: 'Noto Sans JP, sans-serif' }}>
                            <span style={{ fontWeight: 900, fontSize: '9pt', color: '#002d6e' }}>工事写真台帳</span>
                            <span style={{ fontSize: '8pt', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>Page {pageIdx + 1}</span>
                        </div>
                        {photos.slice(pageIdx * 2, pageIdx * 2 + 2).map(p => (
                            <div key={p.id} className="ledger-item">
                                <div className="ledger-photo"><LazyImage file={p.file} forceLoad={true} /></div>
                                <div className="ledger-meta">
                                    <div className="meta-row"><div className="meta-key">シリアル番号</div><div className="meta-serial">{p.serialNo}</div></div>
                                    <div className="meta-row"><div className="meta-key">写真区分</div><div className="meta-val">{p.category}</div></div>
                                    <div className="meta-row"><div className="meta-key">写真タイトル</div><div className="meta-val" style={{ fontSize: '10pt' }}>{p.title || '（未入力）'}</div></div>
                                    <div className="meta-row"><div className="meta-key">工種 / 種別 / 細別</div><div className="meta-val">{[p.workType, p.type, p.subdivision].filter(Boolean).join(' / ') || '—'}</div></div>
                                    <div className="meta-row" style={{ borderBottom: 'none' }}><div className="meta-key">撮影年月日</div><div className="meta-val" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{p.shootingDate}</div></div>
                                    <div style={{ marginTop: 'auto', display: 'flex', gap: '4mm', paddingTop: '2mm' }}>
                                        {p.isRepresentative && <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '1mm 3mm', borderRadius: '3px', fontSize: '7.5pt', fontWeight: 700 }}>代表写真</span>}
                                        {p.isFrequency && <span style={{ background: '#d1fae5', color: '#065f46', padding: '1mm 3mm', borderRadius: '3px', fontSize: '7.5pt', fontWeight: 700 }}>提出頻度</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </>
        );

export default App;
    