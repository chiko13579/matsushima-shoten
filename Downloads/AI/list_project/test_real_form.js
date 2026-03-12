const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const SENDER_INFO = {
    lastName: '森田',
    firstName: '憲治',
    fullName: '森田憲治',
    lastNameKana: 'もりた',
    firstNameKana: 'けんじ',
    fullNameKana: 'もりたけんじ',
    lastNameKatakana: 'モリタ',
    firstNameKatakana: 'ケンジ',
    fullNameKatakana: 'モリタケンジ',
    company: 'あなたのおかげ',
    email: 'info@anatano-okage.com',
    tel: '090-9174-9043',
    tel1: '090',
    tel2: '9174',
    tel3: '9043',
    zip: '470-2303',
    zip1: '470',
    zip2: '2303',
    address: '愛知県知多郡武豊町祠峰1-91',
    prefecture: '愛知県',
    city: '知多郡武豊町',
    street: '祠峰1-91',
    industry: 'マーケティング',
    message: `お世話になっております。
「あなたのおかげデザイン」の森田と申します。

テスト送信のため、このメッセージは送信されません。
入力内容の確認用です。
`
};

// Test Target URL (Picked from CSV)
const TARGET_URL = 'https://trc-tax.com/contact';

async function testRealForm() {
    console.log('🚀 実際のフォームでのテストを開始します (送信は行いません)');
    console.log(`📋 対象URL: ${TARGET_URL}\n`);

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        console.log('📄 ページへ移動中...');
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Inject SENDER_INFO and detectFieldType (Same logic as verified)
        await page.evaluate((senderInfo) => {
            window.SENDER_INFO = senderInfo;

            window.detectFieldType = function (element) {
                const name = (element.name || '').toLowerCase();
                const id = (element.id || '').toLowerCase();
                const placeholder = (element.placeholder || '').toLowerCase();
                const label = element.label || '';
                const type = element.type || '';

                const allText = `${name} ${id} ${placeholder} ${label}`.toLowerCase();

                // 優先順位5: 住所
                if (allText.match(/番地|町名|street|block/) || (allText.match(/住所/) && allText.match(/2|3|詳細/))) {
                    return { type: 'street', value: window.SENDER_INFO.street };
                }
                if (allText.match(/address|住所/) && !allText.match(/mail/)) {
                    return { type: 'address', value: window.SENDER_INFO.address };
                }

                // 優先順位9: ふりがな
                const isKatakana = allText.match(/カタカナ|フリガナ|カナ|kana/) && !allText.match(/ひらがな|ふりがな/);

                if (label.match(/^セイ$|^せい$|^フリガナ$|^ふりがな$/) || (allText.match(/kana.*head|head.*kana|last.*kana|lastnamekana|last.*name.*kana|せい.*かな|みょうじ.*かな|フリガナ.*セイ/) && !allText.match(/会社|法人|姓名/))) {
                    return { type: 'lastNameKana', value: isKatakana ? window.SENDER_INFO.lastNameKatakana : window.SENDER_INFO.lastNameKana };
                }
                if (label.match(/^メイ$|^めい$/) || (allText.match(/kana.*body|body.*kana|first.*kana|firstnamekana|first.*name.*kana|めい.*かな|フリガナ.*メイ/) && !allText.match(/会社|法人|姓名|氏名|お名前/))) {
                    return { type: 'firstNameKana', value: isKatakana ? window.SENDER_INFO.firstNameKatakana : window.SENDER_INFO.firstNameKana };
                }

                // 優先順位11: フルネーム
                if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ|社名|屋号|組織/)) {
                    if (allText.match(/かな|kana|ふりがな|フリガナ/)) {
                        return { type: 'fullNameKana', value: isKatakana ? window.SENDER_INFO.fullNameKatakana : window.SENDER_INFO.fullNameKana };
                    }
                    return { type: 'fullName', value: window.SENDER_INFO.fullName };
                }

                // Placeholder checks
                if (element.placeholder && element.placeholder.match(/^[ぁ-ん\s　]+$/)) {
                    return { type: 'fullNameKana', value: window.SENDER_INFO.fullNameKana };
                }
                if (element.placeholder && element.placeholder.match(/^[ァ-ヶー\s　]+$/)) {
                    return { type: 'fullNameKana', value: window.SENDER_INFO.fullNameKatakana };
                }

                // Fallback for others
                if (allText.match(/company|会社|法人|屋号|corp/)) return { type: 'company', value: window.SENDER_INFO.company };
                if (type === 'email' || allText.match(/mail|メール/)) return { type: 'email', value: window.SENDER_INFO.email };
                if (type === 'tel' || allText.match(/tel|phone|電話|携帯/)) return { type: 'tel', value: window.SENDER_INFO.tel.replace(/-/g, '') };
                if (element.tagName === 'textarea' || allText.match(/content|message|問.*合|相談|詳細|内容|msg/)) return { type: 'message', value: window.SENDER_INFO.message };
                if (allText.match(/capital|資本金/)) return { type: 'capital', value: '' };
                if (allText.match(/employees|従業員/)) return { type: 'employees', value: '' };

                return { type: 'other', value: '' };
            };
        }, SENDER_INFO);

        console.log('✏️  フォーム入力中...');

        // Analysis Phase: Identify fields and values to fill
        const fieldsToFill = await page.evaluate(() => {
            const fields = Array.from(document.querySelectorAll('input, textarea, select'));
            const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
            let submitY = Infinity;

            if (submitBtn) {
                const rect = submitBtn.getBoundingClientRect();
                submitY = rect.top + window.scrollY;
            }

            const actions = [];

            fields.forEach((el, index) => {
                if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

                // Check if element is below the submit button
                const elRect = el.getBoundingClientRect();
                const elY = elRect.top + window.scrollY;
                if (elY > submitY) return;

                // Assign a unique attribute to target this element reliably
                const uniqueId = `puppeteer-target-${index}`;
                el.setAttribute('data-puppeteer-id', uniqueId);

                // Label detection
                let label = '';
                const parentLabel = el.closest('label');
                if (parentLabel) label = parentLabel.textContent.trim();
                else {
                    const prev = el.previousElementSibling;
                    if (prev && prev.tagName === 'LABEL') label = prev.textContent.trim();
                    else if (el.id) {
                        const forLabel = document.querySelector(`label[for="${el.id}"]`);
                        if (forLabel) label = forLabel.textContent.trim();
                    }
                }
                el.label = label;

                const detection = window.detectFieldType(el);
                let valueToFill = detection.value;

                // Fallback Logic
                if (detection.type === 'other' || detection.type === 'capital' || detection.type === 'employees') {
                    const labelLower = (label + ' ' + (el.name || '')).toLowerCase();
                    if (labelLower.match(/資本金|capital/)) {
                        valueToFill = '100';
                    } else if (labelLower.match(/従業員|社員数|人数/)) {
                        valueToFill = '1';
                    }
                }

                if (valueToFill) {
                    actions.push({
                        selector: `[data-puppeteer-id="${uniqueId}"]`,
                        value: valueToFill,
                        tagName: el.tagName.toLowerCase(),
                        type: el.type
                    });

                    // Visual indicator
                    el.style.border = '2px solid #38b2ac';
                    el.style.backgroundColor = '#e6fffa';
                }
            });
            return actions;
        });

        console.log(`✏️  ${fieldsToFill.length}個の項目に入力します...`);

        // Execution Phase: Type into fields using Puppeteer
        for (const action of fieldsToFill) {
            try {
                const elementHandle = await page.$(action.selector);
                if (!elementHandle) continue;

                // 1. Hover and Click (Human-like)
                await elementHandle.hover();
                await page.mouse.down();
                await page.mouse.up();
                await new Promise(r => setTimeout(r, 200));

                // 2. Type (Slower)
                if (action.tagName === 'select') {
                    await page.select(action.selector, action.value);
                } else {
                    // Click 3 times to select all text (just in case there is default text) then type
                    await elementHandle.click({ clickCount: 3 });
                    await page.keyboard.press('Backspace');
                    await page.keyboard.type(action.value, { delay: 100 });
                }

                // 3. Wait and Tab (Commit change)
                await new Promise(r => setTimeout(r, 300));
                await page.keyboard.press('Tab');

                // 4. Persistence Check & Force Fix (If value disappeared)
                await new Promise(r => setTimeout(r, 500)); // Wait for potential framework revert

                const currentValue = await page.evaluate(sel => document.querySelector(sel).value, action.selector);
                if (currentValue !== action.value) {
                    console.log(`⚠️  値が消えました。強制入力を行いました: ${action.selector}`);
                    await page.evaluate((sel, val) => {
                        const el = document.querySelector(sel);
                        // Force value
                        el.value = val;
                        // Dispatch events again
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        el.dispatchEvent(new Event('blur', { bubbles: true }));
                    }, action.selector, action.value);
                }

                // Short pause between fields
                await new Promise(r => setTimeout(r, 500));

            } catch (err) {
                console.log(`⚠️  入力エラー (${action.selector}): ${err.message}`);
            }
        }

        console.log('\n✅ 入力完了！');
        console.log('👀 ブラウザで入力内容を確認してください。');
        console.log('⚠️  送信ボタンは押さないでください。');
        console.log('\n確認後、Enterキーを押すとブラウザを閉じます...');

        await new Promise(resolve => process.stdin.once('data', resolve));

    } catch (e) {
        console.error('❌ エラー:', e);
    } finally {
        await browser.close();
    }
}

testRealForm();
