class CompanyInfoExtractor {
    
    extractCompanyName(document) {
        const selectors = [
            'title',
            'h1',
            '.company-name',
            '.site-title',
            '.logo',
            '[class*="company"]',
            '[class*="title"]',
            '[id*="company"]',
            'header h1',
            '.header-title',
            'meta[property="og:site_name"]'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                let text = '';
                if (selector.includes('meta')) {
                    text = element.getAttribute('content') || '';
                } else {
                    text = element.textContent || element.innerText || '';
                }
                
                text = text.trim().replace(/\s+/g, ' ');
                if (text && text.length > 2 && text.length < 100) {
                    text = text.replace(/\|.*$/, '').trim();
                    text = text.replace(/[-–—].*$/, '').trim();
                    if (text.length > 2) {
                        return text;
                    }
                }
            }
        }
        
        return '';
    }
    
    extractCEOName(document) {
        // より詳細なテーブル検索
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
            const rows = table.querySelectorAll('tr');
            for (const row of rows) {
                const cells = row.querySelectorAll('th, td');
                for (let i = 0; i < cells.length - 1; i++) {
                    const cellText = cells[i].textContent.trim();
                    // より多くのパターンをチェック
                    if (cellText.match(/^(代表取締役社長|代表取締役|代表者|社長|CEO|代表|President|Chief Executive Officer|会長|Chairman)$/i)) {
                        let name = cells[i + 1].textContent.trim();
                        name = this.cleanCEOName(name);
                        if (this.isValidCEOName(name)) {
                            return name;
                        }
                    }
                }
            }
        }

        // dl要素の検索を改善
        const dlElements = document.querySelectorAll('dl');
        for (const dl of dlElements) {
            const dts = dl.querySelectorAll('dt');
            const dds = dl.querySelectorAll('dd');
            for (let i = 0; i < Math.min(dts.length, dds.length); i++) {
                const dtText = dts[i].textContent.trim();
                if (dtText.match(/^(代表取締役社長|代表取締役|代表者|社長|CEO|代表|President|会長)$/i)) {
                    let name = dds[i].textContent.trim();
                    name = this.cleanCEOName(name);
                    if (this.isValidCEOName(name)) {
                        return name;
                    }
                }
            }
        }

        // 構造化されたテキストパターンの検索
        const fullText = document.body.textContent || '';
        
        // より精密なパターンマッチング
        const patterns = [
            // 代表取締役社長：田中太郎
            /代表取締役社長[：:\s　]*([一-龯]{1,6}[\s　]*[一-龯]{1,6})/g,
            // 代表取締役：田中太郎
            /代表取締役[：:\s　]*([一-龯]{1,6}[\s　]*[一-龯]{1,6})/g,
            // 社長：田中太郎
            /社長[：:\s　]*([一-龯]{1,6}[\s　]*[一-龯]{1,6})/g,
            // CEO：田中太郎
            /CEO[：:\s　]*([一-龯]{1,6}[\s　]*[一-龯]{1,6}|[a-zA-Z]+[\s　]+[a-zA-Z]+)/gi,
            // President: John Smith
            /President[：:\s　]*([a-zA-Z]+[\s　]+[a-zA-Z]+)/gi,
            // 代表者：田中太郎
            /代表者[：:\s　]*([一-龯]{1,6}[\s　]*[一-龯]{1,6})/g,
            // 代表：田中太郎
            /代表[：:\s　]*([一-龯]{1,6}[\s　]*[一-龯]{1,6})/g,
            // 田中太郎　代表取締役社長（逆パターン）
            /([一-龯]{1,6}[\s　]*[一-龯]{1,6})[\s　]*(?:代表取締役社長|代表取締役|社長|CEO|代表)/g,
            // 複数行にまたがるパターン
            /代表取締役社長\s*\n\s*([一-龯]{1,6}[\s　]*[一-龯]{1,6})/g,
            /代表取締役\s*\n\s*([一-龯]{1,6}[\s　]*[一-龯]{1,6})/g,
            // カタカナ名前のパターン
            /代表取締役社長[：:\s　]*([ァ-ヶー]{2,10}[\s　]*[ァ-ヶー]{2,10})/g,
            /代表取締役[：:\s　]*([ァ-ヶー]{2,10}[\s　]*[ァ-ヶー]{2,10})/g,
            // ひらがな名前のパターン
            /代表取締役社長[：:\s　]*([ぁ-ん]{2,10}[\s　]*[ぁ-ん]{2,10})/g,
            /代表取締役[：:\s　]*([ぁ-ん]{2,10}[\s　]*[ぁ-ん]{2,10})/g
        ];
        
        for (const pattern of patterns) {
            const matches = [...fullText.matchAll(pattern)];
            for (const match of matches) {
                let name = match[1];
                if (!name) continue;
                
                name = this.cleanCEOName(name);
                if (this.isValidCEOName(name)) {
                    return name;
                }
            }
        }

        // メタ情報から検索
        const metaTags = document.querySelectorAll('meta[name], meta[property]');
        for (const meta of metaTags) {
            const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
            const content = meta.getAttribute('content') || '';
            
            if (name.toLowerCase().includes('author') || 
                name.toLowerCase().includes('ceo') ||
                name.toLowerCase().includes('president')) {
                let ceoName = this.cleanCEOName(content);
                if (this.isValidCEOName(ceoName)) {
                    return ceoName;
                }
            }
        }

        // JSON-LDから検索
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of jsonLdScripts) {
            try {
                const data = JSON.parse(script.textContent);
                if (data.founder && data.founder.name) {
                    let name = this.cleanCEOName(data.founder.name);
                    if (this.isValidCEOName(name)) {
                        return name;
                    }
                }
                if (data.author && data.author.name) {
                    let name = this.cleanCEOName(data.author.name);
                    if (this.isValidCEOName(name)) {
                        return name;
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        return '';
    }
    
    cleanCEOName(name) {
        // 名前をクリーニング
        name = name.trim();
        // 余計な記号を削除
        name = name.replace(/[（）()「」『』【】\[\]<>《》〈〉｛｝{}]/g, '');
        // 役職名を削除
        name = name.replace(/(代表取締役社長|代表取締役|取締役|社長|CEO|代表者|代表|氏|様|さん|先生|会長|Chairman|President)/g, '');
        // 会社関連の単語を削除
        name = name.replace(/(資本金|設立|従業員|所在地|事業内容|売上|年商|創業|電話|FAX|メール|住所|〒|円|万円|億円|年|月|日)/g, '');
        // 数字と記号の組み合わせを削除
        name = name.replace(/[\d\-－〒￥¥,、。・]/g, '');
        // 複数スペースを1つに
        name = name.replace(/[\s　]+/g, ' ').trim();
        // 前後の句読点を削除
        name = name.replace(/^[、。・]+|[、。・]+$/g, '');
        
        return name;
    }
    
    isValidCEOName(name) {
        // 基本チェック
        if (!name || name.length < 2 || name.length > 15) {
            return false;
        }
        
        // 除外ワード
        const excludeWords = ['会社', '株式', '有限', '合同', '企業', '事業', '部長', 
                            '営業', '開発', '管理', '総務', '人事', '経理', '担当',
                            'ページ', 'サイト', 'ホーム', 'トップ', 'お問い合わせ',
                            '設立', '資本', '所在', '売上', '従業員', '本社',
                            '支社', '支店', '営業所', '工場', '研究所', 'グループ',
                            '部門', '課', '係', '室', 'チーム', 'センター'];
        
        for (const word of excludeWords) {
            if (name.includes(word)) {
                return false;
            }
        }
        
        // 数字が含まれている場合はNG
        if (/\d/.test(name)) {
            return false;
        }
        
        // 簡単な名前パターンチェック
        // 日本語（漢字・ひらがな・カタカナ）と英字の組み合わせ
        const hasJapanese = /[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/.test(name);
        const hasEnglish = /[a-zA-Z]/.test(name);
        const hasSpace = /\s/.test(name);
        
        // 日本語の場合
        if (hasJapanese && !hasEnglish) {
            // スペース区切りの姓名（山田 太郎）
            if (hasSpace) {
                const parts = name.split(/\s+/);
                if (parts.length === 2 && parts[0].length >= 1 && parts[1].length >= 1) {
                    return true;
                }
            }
            // スペースなしの姓名（田中太郎）- 3-6文字
            else if (name.length >= 3 && name.length <= 6) {
                return true;
            }
            // 2文字の姓または名（田中）
            else if (name.length === 2) {
                return true;
            }
        }
        
        // 英語の場合（John Smith）
        if (hasEnglish && !hasJapanese && hasSpace) {
            const parts = name.split(/\s+/);
            if (parts.length === 2 && parts[0].length >= 2 && parts[1].length >= 2) {
                return parts.every(part => /^[a-zA-Z]+$/.test(part));
            }
        }
        
        return false;
    }
    
    extractContactInfo(document) {
        const contactSelectors = [
            'a[href*="contact"]',
            'a[href*="inquiry"]',
            'a[href*="toiawase"]',
            'a[href*="mail"]'
        ];
        
        const contactTexts = [
            'お問い合わせ',
            'お問合せ',
            'contact',
            'inquiry',
            '問い合わせ',
            '相談',
            'メール'
        ];
        
        for (const selector of contactSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const href = element.getAttribute('href');
                if (href && !href.startsWith('javascript:')) {
                    return this.normalizeUrl(href, document.location.href);
                }
            }
        }
        
        const allLinks = document.querySelectorAll('a[href]');
        for (const link of allLinks) {
            const text = link.textContent.toLowerCase();
            const href = link.getAttribute('href');
            
            for (const contactText of contactTexts) {
                if (text.includes(contactText.toLowerCase()) && href && !href.startsWith('javascript:')) {
                    return this.normalizeUrl(href, document.location.href);
                }
            }
        }
        
        return '';
    }
    
    extractFVText(document) {
        // FV（ファーストビュー）のキャッチコピーやメインメッセージを抽出
        const fvSelectors = [
            // ヒーローセクション関連
            '.hero h1', '.hero h2', '.hero .title', '.hero .catch', '.hero p',
            '.main-visual h1', '.main-visual h2', '.main-visual .title', '.main-visual p',
            '.mv h1', '.mv h2', '.mv .title', '.mv .catch', '.mv p',
            '.kv h1', '.kv h2', '.kv .title', '.kv .catch', '.kv p',
            '.banner h1', '.banner h2', '.banner .title', '.banner p',
            '.visual h1', '.visual h2', '.visual p',
            
            // 一般的なキャッチコピー要素
            '.catchcopy', '.catch-copy', '.main-title', '.page-title',
            '.slogan', '.tagline', '.subtitle', '.lead', '.intro',
            '.message', '.concept', '.philosophy',
            
            // ファーストビュー内の要素
            'header h1', 'header h2', 'header .title', 'header p',
            '.top h1', '.top h2', '.top .main-title', '.top p',
            '#top h1', '#top h2', '#top p',
            
            // よくあるクラス名
            '.first-view h1', '.first-view h2', '.first-view .title', '.first-view p',
            '.mainvisual h1', '.mainvisual h2', '.mainvisual .title', '.mainvisual p',
            '.fv h1', '.fv h2', '.fv p', '.fv .title',
            
            // セクション全体から探す
            'section:first-of-type h1', 'section:first-of-type h2', 'section:first-of-type p',
            '.section:first-of-type h1', '.section:first-of-type h2', '.section:first-of-type p',
            
            // コンテナ内の最初の要素
            '.container h1:first-of-type', '.container h2:first-of-type',
            '.wrapper h1:first-of-type', '.wrapper h2:first-of-type',
            
            // 大きなフォントサイズの要素を探す
            '*[style*="font-size"]:not(nav):not(.menu):not(.header-menu)'
        ];
        
        // セレクタで検索
        for (const selector of fvSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    let text = element.textContent || element.innerText || '';
                    text = text.trim().replace(/\s+/g, ' ');
                    
                    // 適切な長さのテキストを選別し、除外ワードをチェック
                    if (text.length >= 8 && text.length <= 300 && 
                        !text.includes('お問い合わせ') && 
                        !text.includes('メニュー') &&
                        !text.includes('ナビゲーション') &&
                        !text.toLowerCase().includes('menu') &&
                        !text.toLowerCase().includes('contact') &&
                        !text.includes('Copyright') &&
                        !text.includes('©') &&
                        !text.includes('All rights reserved') &&
                        !text.includes('プライバシー') &&
                        !text.includes('サイトマップ') &&
                        !text.includes('会社概要') &&
                        !text.match(/^\d+$/) && // 数字のみは除外
                        !text.match(/^[\s\w\-_]+$/) && // 単語のみは除外
                        text.split('').some(char => /[あ-んア-ンァ-ヶ一-龯]/.test(char))) { // 日本語を含む
                        
                        // より具体的で意味のあるテキストかチェック
                        const meaningfulWords = ['サービス', '制作', 'デザイン', 'システム', 'ソリューション', 
                                               'ビジネス', '企業', '成長', '成功', '実現', '支援', '提供',
                                               'Web', 'IT', 'DX', 'デジタル', '技術', '革新', '未来',
                                               'お客様', 'クライアント', '品質', '信頼', '実績'];
                        
                        const hasMeaningfulContent = meaningfulWords.some(word => 
                            text.includes(word) || text.toLowerCase().includes(word.toLowerCase())
                        );
                        
                        if (hasMeaningfulContent || text.length >= 20) {
                            return text;
                        }
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        // ページ上部の大きなテキストを探す（改善版）
        const headings = document.querySelectorAll('h1, h2, h3, p');
        const candidateTexts = [];
        
        for (const heading of headings) {
            try {
                // 要素の位置を取得（可能な場合）
                const rect = heading.getBoundingClientRect ? heading.getBoundingClientRect() : null;
                const isInViewport = !rect || rect.top < 800; // 画面上部800px以内
                
                if (isInViewport) {
                    let text = heading.textContent || heading.innerText || '';
                    text = text.trim().replace(/\s+/g, ' ');
                    
                    if (text.length >= 10 && text.length <= 300 && 
                        !text.includes('お問い合わせ') && 
                        !text.includes('メニュー') &&
                        !text.toLowerCase().includes('menu') &&
                        !text.toLowerCase().includes('contact') &&
                        !text.includes('Copyright') &&
                        text.split('').some(char => /[あ-んア-ンァ-ヶ一-龯]/.test(char))) {
                        
                        // スコアリング：より良いテキストを判定
                        let score = 0;
                        if (heading.tagName === 'H1') score += 3;
                        if (heading.tagName === 'H2') score += 2;
                        if (text.length >= 20) score += 1;
                        if (text.includes('制作') || text.includes('デザイン') || text.includes('システム')) score += 2;
                        
                        candidateTexts.push({ text, score, element: heading });
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        // スコアが最も高いテキストを選択
        if (candidateTexts.length > 0) {
            candidateTexts.sort((a, b) => b.score - a.score);
            return candidateTexts[0].text;
        }
        
        // メタディスクリプションをフォールバック
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            const description = metaDescription.getAttribute('content') || '';
            if (description.length >= 15 && description.length <= 300) {
                return description.trim();
            }
        }
        
        // OGPディスクリプション
        const ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription) {
            const description = ogDescription.getAttribute('content') || '';
            if (description.length >= 15 && description.length <= 300) {
                return description.trim();
            }
        }
        
        return '';
    }
    
    extractCompanyStrengths(document) {
        const text = document.body.textContent || '';
        
        const strengthPatterns = [
            /(強み|特徴|サービス|メリット)[：:\s]*([^\n\r。]{10,200})/gi,
            /(当社の|弊社の)[^\n\r。]*?(強み|特徴|サービス)[^\n\r。]{10,200}/gi,
            /(こだわり|ポイント)[：:\s]*([^\n\r。]{10,200})/gi
        ];
        
        for (const pattern of strengthPatterns) {
            const match = text.match(pattern);
            if (match) {
                let strength = match[2] || match[0];
                strength = strength.trim().replace(/\s+/g, ' ');
                if (strength.length >= 10 && strength.length <= 200) {
                    return strength;
                }
            }
        }
        
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            const description = metaDescription.getAttribute('content') || '';
            if (description.length >= 20 && description.length <= 200) {
                return description.trim();
            }
        }
        
        return '';
    }
    
    findPortfolioUrl(document) {
        const portfolioKeywords = [
            '実績', 'ポートフォリオ', '制作事例', 'portfolio', 'works', 'work',
            '事例', '導入事例', '制作実績', 'case study', 'gallery', 'project',
            '作品', '活動実績', 'achievement', 'お仕事', '成果物'
        ];
        
        // ナビゲーションメニューから探す
        const navSelectors = [
            'nav a', 'header a', '.menu a', '.navigation a', '.nav a',
            '.header-menu a', '.global-nav a', '.main-nav a', '.navbar a'
        ];
        
        // まずナビゲーションメニューから探す
        for (const selector of navSelectors) {
            const navLinks = document.querySelectorAll(selector);
            for (const link of navLinks) {
                const text = (link.textContent || '').toLowerCase();
                const href = link.getAttribute('href');
                
                if (!href || href.startsWith('javascript:') || href.startsWith('#')) continue;
                
                for (const keyword of portfolioKeywords) {
                    if (text.includes(keyword.toLowerCase()) || 
                        href.toLowerCase().includes(keyword.toLowerCase())) {
                        return this.normalizeUrl(href, document.location.href);
                    }
                }
            }
        }
        
        // 次に、サイドバーやフッターを含むすべてのリンクから探す
        const allLinks = document.querySelectorAll('a[href]');
        const scoredLinks = [];
        
        for (const link of allLinks) {
            const text = (link.textContent || '').toLowerCase();
            const href = link.getAttribute('href');
            
            if (!href || href.startsWith('javascript:') || href.startsWith('#')) continue;
            
            let score = 0;
            // テキストとURLの両方でキーワードをチェック
            for (const keyword of portfolioKeywords) {
                if (text.includes(keyword.toLowerCase())) score += 2;
                if (href.toLowerCase().includes(keyword.toLowerCase())) score += 1;
            }
            
            if (score > 0) {
                scoredLinks.push({
                    url: this.normalizeUrl(href, document.location.href),
                    score: score,
                    text: text
                });
            }
        }
        
        // スコアが高い順にソート
        scoredLinks.sort((a, b) => b.score - a.score);
        
        // 最もスコアが高いリンクを返す
        if (scoredLinks.length > 0) {
            return scoredLinks[0].url;
        }
        
        // 最後の手段：URLパスにキーワードが含まれるページを探す
        const currentPath = document.location.pathname.toLowerCase();
        for (const keyword of portfolioKeywords) {
            if (currentPath.includes(keyword.toLowerCase())) {
                // 現在のページが実績ページの可能性が高い
                return document.location.href;
            }
        }
        
        return null;
    }
    
    checkPortfolioExists(document) {
        const portfolioKeywords = [
            '実績', 'ポートフォリオ', '制作事例', 'portfolio', 'works', 
            '事例', '導入事例', '制作実績', 'case study', 'gallery'
        ];
        
        const links = document.querySelectorAll('a[href]');
        for (const link of links) {
            const text = link.textContent.toLowerCase();
            const href = link.getAttribute('href').toLowerCase();
            
            for (const keyword of portfolioKeywords) {
                if (text.includes(keyword.toLowerCase()) || href.includes(keyword.toLowerCase())) {
                    return true;
                }
            }
        }
        
        const text = document.body.textContent.toLowerCase();
        for (const keyword of portfolioKeywords) {
            if (text.includes(keyword.toLowerCase())) {
                return true;
            }
        }
        
        return false;
    }
    
    normalizeUrl(url, baseUrl) {
        try {
            if (url.startsWith('http')) {
                return url;
            }
            return new URL(url, baseUrl).href;
        } catch (error) {
            return url;
        }
    }
    
    extractAllInfo(document) {
        const portfolioUrl = this.findPortfolioUrl(document);
        return {
            companyName: this.extractCompanyName(document),
            ceoName: this.extractCEOName(document),
            contactUrl: this.extractContactInfo(document),
            fvText: this.extractFVText(document),
            strengths: this.extractCompanyStrengths(document),
            portfolioUrl: portfolioUrl || '',
            hasPortfolio: !!portfolioUrl
        };
    }
}

module.exports = CompanyInfoExtractor;