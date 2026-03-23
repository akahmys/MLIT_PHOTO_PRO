const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, "../../../..");
const STANDARDS_JS = path.join(PROJECT_ROOT, "src/constants/standards.js");

function getRole(linkText) {
    if (linkText.includes('本編') || linkText.includes('全文')) return 'file_url';
    if (linkText.includes('解説')) return 'commentary_url';
    if (linkText.includes('対照表')) return 'comparison_url';
    if (linkText.includes('ポイント')) return 'point_url';
    if (linkText.includes('運用について')) return 'appendix_url';
    return null;
}

function audit() {
    const inputData = fs.readFileSync(0, 'utf8');
    if (!inputData.trim()) {
        console.error("Error: No scrape data provided via stdin.");
        process.exit(1);
    }
    const latestScrape = JSON.parse(inputData);

    const currentContent = fs.readFileSync(STANDARDS_JS, 'utf8');
    const match = currentContent.match(/export const MLIT_STANDARDS = (\[[\s\S]*?\]);/);
    const currentStandards = JSON.parse(match[1]);

    const processedUrls = new Set();
    const newItems = [];
    const metaDiffs = [];

    // Group scrape by "name"
    const grouped = {};
    latestScrape.forEach(item => {
        const name = item.name.replace(/<\/p>|<br\/?>/g, '').trim();
        if (!grouped[name]) grouped[name] = [];
        grouped[name].push(item);
    });

    // 1. Check existing
    currentStandards.forEach(s => {
        const group = latestScrape.find(item => item.url === s.file_url);
        if (group) {
            const name = group.name.replace(/<\/p>|<br\/?>/g, '').trim();
            const related = grouped[name] || [];
            related.forEach(item => {
                const role = getRole(item.linkText);
                if (role && !s[role]) {
                    metaDiffs.push({ id: s.id, field: role, newVal: item.url });
                }
                processedUrls.add(item.url);
            });
        }
        processedUrls.add(s.file_url);
        // Also check secondary URLs
        ['commentary_url', 'comparison_url', 'point_url', 'appendix_url'].forEach(f => {
            if (s[f]) processedUrls.add(s[f]);
        });
    });

    // 2. Find new items
    Object.keys(grouped).forEach(name => {
        const items = grouped[name];
        if (items.some(item => processedUrls.has(item.url))) return;

        const mainFile = items.find(item => getRole(item.linkText) === 'file_url') || items[0];
        const type = items[0].fileName.split(/[0-9]/)[0].replace(/_$/, '');
        
        const entry = {
            id: `NEW-${type}-${Math.random().toString(36).substr(2, 5)}`,
            category: "その他 (要確認)",
            type: type,
            period: name.replace(/<\/?[^>]+(>|$)/g, "").trim(),
            standard_name: name.replace(/<\/?[^>]+(>|$)/g, "").trim(),
            file_url: mainFile.url
        };
        items.forEach(item => {
            const role = getRole(item.linkText);
            if (role) entry[role] = item.url;
        });
        newItems.push(entry);
    });

    // 3. Output Report
    console.log("# 🔍 基準メタデータ監査レポート");
    if (metaDiffs.length > 0) {
        console.log("\n### 📝 既存エントリへの補足資料追加案");
        metaDiffs.forEach(d => console.log(`- **${d.id}**: \`${d.field}\` を追加可能 (${d.newVal})`));
    }

    if (newItems.length > 0) {
        console.log("\n### ✨ 新規検出された基準 (未登録)");
        newItems.forEach(n => {
            console.log(`- **${n.standard_name}** (${n.type})`);
            console.log(`  URL: ${n.file_url}`);
        });
        console.log("\n> これらを追加するには、`standards.js` に手動でマージするか、更新スクリプトを作成してください。");
    } else if (metaDiffs.length === 0) {
        console.log("\n現在の `standards.js` は公式サイトの情報と完全に一致しています。");
    }
}

audit();
