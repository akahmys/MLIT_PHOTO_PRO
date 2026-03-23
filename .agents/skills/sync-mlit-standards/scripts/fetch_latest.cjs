const { execSync } = require('child_process');

const TARGET_URL = 'https://www.cals-ed.go.jp/cri_point/';

function fetchPage(url) {
    // Using curl for more reliable fetching in this environment
    try {
        const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
        return execSync(`curl -L -A "${ua}" "${url}"`, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 5 });
    } catch (err) {
        throw err;
    }
}

function parseStandards(html) {
    const standards = [];
    const baseUrl = 'https://www.cals-ed.go.jp';
    
    // Simplest possible extraction: find all mg/wp-content/uploads links and the nearest preceding text
    const regex = /<a[^>]+href="([^"]+\/mg\/wp-content\/uploads\/([^"]+\.pdf))"[^>]*>(.*?)<\/a>/gi;
    
    let match;
    while ((match = regex.exec(html)) !== null) {
        let url = match[1];
        if (url.startsWith('..')) url = baseUrl + url.substring(2);
        else if (url.startsWith('/')) url = baseUrl + url;

        const fileName = match[2];
        const linkText = match[3].replace(/<[^>]+>/g, '').trim();

        // Find standard name by looking back
        const lookBack = html.substring(Math.max(0, match.index - 500), match.index);
        const nameMatch = lookBack.match(/>([^<>]{5,100})(?:<br\/?>|※|<\/p>|<td>|<\/li>)/g);
        let name = "不明な基準";
        if (nameMatch) {
            name = nameMatch[nameMatch.length - 1].replace(/[>※]/g, '').trim();
        }

        standards.push({ name, url, fileName, linkText });
    }

    return standards;
}

async function main() {
    try {
        const html = fetchPage(TARGET_URL);
        const standards = parseStandards(html);
        console.log(JSON.stringify(standards, null, 2));
    } catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}

main();
