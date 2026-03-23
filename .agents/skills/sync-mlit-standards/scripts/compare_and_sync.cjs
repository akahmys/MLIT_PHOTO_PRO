const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = "/Users/jun/.gemini/antigravity/scratch/mlit-photo-pro";
const STANDARDS_JS = path.join(PROJECT_ROOT, "src/constants/standards.js");
const STANDARDS_DIR = path.join(PROJECT_ROOT, "standards");
const SKILL_DIR = path.join(PROJECT_ROOT, ".agents/skills/sync-mlit-standards");
const HISTORY_MD = path.join(SKILL_DIR, "history.md");
const HISTORY_JSON = path.join(SKILL_DIR, "history.json");

const URL_FIELDS = ['file_url', 'commentary_url', 'comparison_url', 'point_url', 'appendix_url'];
const FIELD_SUFFIX = {
    'file_url': '',
    'commentary_url': '_commentary',
    'comparison_url': '_comparison',
    'point_url': '_point',
    'appendix_url': '_appendix'
};

function loadCurrentStandards() {
    const content = fs.readFileSync(STANDARDS_JS, 'utf8');
    const match = content.match(/export const MLIT_STANDARDS = (\[[\s\S]*?\]);/);
    if (!match) throw new Error("Could not find MLIT_STANDARDS in standards.js");
    return JSON.parse(match[1]);
}

function saveStandards(standards) {
    const currentContent = fs.readFileSync(STANDARDS_JS, 'utf8');
    const updatedArray = JSON.stringify(standards, null, 4);
    const updatedContent = currentContent.replace(
        /export const MLIT_STANDARDS = \[[\s\S]*?\];/,
        `export const MLIT_STANDARDS = ${updatedArray};`
    );
    fs.writeFileSync(STANDARDS_JS, updatedContent);
}

function downloadFile(url, dest, results) {
    try {
        console.log(`Downloading: ${url} -> ${dest}`);
        execSync(`curl --fail -s -L -o "${dest}" "${url}"`);
        results.downloads.push(path.relative(PROJECT_ROOT, dest));
        return true;
    } catch (err) {
        console.error(`Failed to download ${url}: ${err.message}`);
        return false;
    }
}

function archiveFile(filePath, categoryDir, results) {
    if (!fs.existsSync(filePath)) return;
    const archiveDir = path.join(STANDARDS_DIR, categoryDir, "archive");
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
    
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(archiveDir, `${timestamp}_${fileName}`);
    
    fs.renameSync(filePath, archivePath);
    results.archives.push({
        name: fileName,
        path: archivePath.replace(PROJECT_ROOT, "")
    });
}

function saveHistory(results) {
    const timestamp = new Date().toLocaleString('ja-JP');
    
    let mdEntry = `## [${timestamp}] 同期成功\n`;
    if (results.updates.length > 0) {
        mdEntry += `#### ✅ メタデータ更新\n`;
        results.updates.forEach(u => mdEntry += `- **${u.id}**: ${u.field} を更新しました\n`);
    }
    
    if (results.archives.length > 0) {
        mdEntry += `#### 📦 アーカイブ済み\n`;
        results.archives.forEach(a => mdEntry += `- \`${a.name}\` -> \`archive/${path.basename(a.path)}\`\n`);
    }
    
    if (results.downloads.length > 0) {
        mdEntry += `#### 📥 新規ダウンロード\n`;
        results.downloads.forEach(d => mdEntry += `- \`${d}\`\n`);
    }
    mdEntry += "\n---\n";
    
    fs.appendFileSync(HISTORY_MD, mdEntry);

    let history = [];
    if (fs.existsSync(HISTORY_JSON)) {
        history = JSON.parse(fs.readFileSync(HISTORY_JSON, 'utf8'));
    }
    history.push({
        timestamp: new Date().toISOString(),
        ...results
    });
    fs.writeFileSync(HISTORY_JSON, JSON.stringify(history, null, 2));
}

function main() {
    let latestListing = [];
    try {
        const inputData = fs.readFileSync(0, 'utf8');
        if (inputData.trim()) {
            latestListing = JSON.parse(inputData);
        }
    } catch (e) {
        console.warn("No latest listing data found via stdin. Using existing metadata URLs.");
    }

    const currentStandards = loadCurrentStandards();
    const results = {
        updates: [],
        downloads: [],
        archives: []
    };

    currentStandards.forEach(standard => {
        const categoryDir = standard.type || "other";
        const destDir = path.join(STANDARDS_DIR, categoryDir);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        URL_FIELDS.forEach(field => {
            const url = standard[field];
            if (!url) return;

            // Target filename logic
            const baseFileName = path.basename(url, '.pdf');
            const suffix = FIELD_SUFFIX[field];
            const destFileName = `${baseFileName}${suffix}.pdf`;
            const destPath = path.join(destDir, destFileName);

            // Check if URL has changed in the latest listing
            // Match by basename (e.g. photo9.pdf)
            const webItem = latestListing.find(item => item.fileName === path.basename(url));
            const newUrl = webItem ? webItem.url : null;
            
            let finalUrl = url;
            if (newUrl && newUrl !== url) {
                console.log(`Update detected for ${standard.id} [${field}]: ${url} -> ${newUrl}`);
                results.updates.push({
                    id: standard.id,
                    field: field,
                    oldUrl: url,
                    newUrl: newUrl
                });
                standard[field] = newUrl;
                finalUrl = newUrl;
                
                // Archive old file if exists
                archiveFile(destPath, categoryDir, results);
            }

            // Download if file doesn't exist
            if (!fs.existsSync(destPath)) {
                downloadFile(finalUrl, destPath, results);
            }
        });
    });

    // Cleanup orphans
    const managedFiles = new Set();
    currentStandards.forEach(s => {
        URL_FIELDS.forEach(field => {
            const url = s[field];
            if (url) {
                const base = path.basename(url, '.pdf');
                managedFiles.add(`${base}${FIELD_SUFFIX[field]}.pdf`);
            }
        });
    });

    const orphans = [];
    function scanOrphans(dir) {
        fs.readdirSync(dir).forEach(f => {
            const fullPath = path.join(dir, f);
            if (fs.statSync(fullPath).isDirectory()) {
                if (f !== 'archive') scanOrphans(fullPath);
            } else {
                if (!managedFiles.has(f)) orphans.push(fullPath);
            }
        });
    }
    if (fs.existsSync(STANDARDS_DIR)) scanOrphans(STANDARDS_DIR);

    if (orphans.length > 0) {
        console.log(`### 🧹 クリーンアップ (管理外ファイル)`);
        orphans.forEach(o => {
            console.log(`- 削除: \`${path.relative(STANDARDS_DIR, o)}\``);
            fs.unlinkSync(o);
        });
        console.log("");
    }

    if (results.updates.length > 0 || results.downloads.length > 0) {
        if (results.updates.length > 0) saveStandards(currentStandards);
        saveHistory(results);
    }

    // Report
    console.log("# 📋 基準同期レポート (SSOT版)");
    console.log(`生成日時: ${new Date().toLocaleString('ja-JP')}\n`);
    
    if (results.updates.length > 0) {
        console.log("### ✅ URL更新");
        results.updates.forEach(u => console.log(`- **${u.id}**: ${u.field} を ${u.newUrl} に更新`));
        console.log("");
    }

    if (results.downloads.length > 0) {
        console.log("### 📥 ダウンロード済み");
        results.downloads.forEach(d => console.log(`- \`${d}\``));
        console.log("");
    } else {
        console.log("同期が必要な差分はありませんでした。\n");
    }
}

main();
