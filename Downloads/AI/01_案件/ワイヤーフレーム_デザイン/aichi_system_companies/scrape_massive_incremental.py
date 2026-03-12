import asyncio
from playwright.async_api import async_playwright
import pandas as pd
import urllib.parse
from duckduckgo_search import DDGS
from concurrent.futures import ThreadPoolExecutor
import time
import random
import os

municipalities = [
    "名古屋市千種区", "名古屋市東区", "名古屋市北区", "名古屋市西区", "名古屋市中村区", "名古屋市中区", 
    "名古屋市昭和区", "名古屋市瑞穂区", "名古屋市熱田区", "名古屋市中川区", "名古屋市港区", "名古屋市南区", 
    "名古屋市守山区", "名古屋市緑区", "名古屋市名東区", "名古屋市天白区",
    "豊橋市", "岡崎市", "一宮市", "瀬戸市", "半田市", "春日井市", "豊川市", "津島市", "碧南市", "刈谷市", 
    "豊田市", "安城市", "西尾市", "蒲郡市", "犬山市", "常滑市", "江南市", "小牧市", "稲沢市", "新城市", 
    "東海市", "大府市", "知多市", "知立市", "尾張旭市", "高浜市", "岩倉市", "豊明市", "日進市", "田原市", 
    "愛西市", "清須市", "北名古屋市", "弥富市", "みよし市", "あま市", "長久手市"
]

keywords = ["システム開発", "IT企業", "ソフトウェア開発", "Web制作", "システムエンジニアリング"]

large_companies = [
    "トヨタ", "三菱", "日立", "富士通", "NEC", "NTT", "パナソニック", "キャノン", "キヤノン", "アイシン", 
    "デンソー", "東芝", "ソフトバンク", "KDDI", "伊藤忠", "SCSK", "トランスコスモス", "富士ソフト", 
    "大塚商会", "TIS", "BIPROGY", "アイ・ビー・エム", "アクセンチュア", "デロイト", "PwC", 
    "KPMG", "EY", "野村総合研究所", "NRI", "JFE", "ダッソーシステムズ", "日本発条", "豊田自動織機"
]

branch_keywords = ["支店", "営業所", "事業所", "支社", "出張所", "オフィス", "工場"]

async def scrape_google_maps():
    companies_set = set()
    queries = []
    for muni in municipalities:
        for kw in keywords:
            queries.append(f"{kw} {muni}")
            
    random.shuffle(queries)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(locale='ja-JP', viewport={'width': 1280, 'height': 800})
        
        for i, q in enumerate(queries):
            page = await context.new_page()
            url = f"https://www.google.com/maps/search/{urllib.parse.quote(q)}"
            await page.goto(url, timeout=60000)
            
            try:
                await page.wait_for_selector('div[role="feed"]', timeout=8000)
            except Exception as e:
                await page.close()
                continue
            
            previously_counted = 0
            empty_scrolls = 0
            while True:
                items = await page.locator('div[role="feed"] > div > div > a').all()
                if len(items) > previously_counted:
                    previously_counted = len(items)
                    empty_scrolls = 0
                    try:
                        await items[-1].hover()
                        await page.mouse.wheel(0, 20000)
                        await page.wait_for_timeout(300)
                    except:
                        pass
                else:
                    empty_scrolls += 1
                    try:
                        html = await page.content()
                        if "You've reached the end of the list" in html or "これ以上の結果はありません" in html or "検索結果がこれ以上ありません" in html or empty_scrolls > 2:
                            break
                    except:
                        break
                    await page.mouse.wheel(0, 20000)
                    await page.wait_for_timeout(400)
            
            items = await page.locator('div[role="feed"] > div > div > a').all()
            for index in range(len(items)):
                try:
                    element = page.locator('div[role="feed"] > div > div > a').nth(index)
                    name = await element.get_attribute('aria-label')
                    if name and name not in companies_set:
                        if any(branch in name for branch in branch_keywords):
                            continue
                        if any(large in name for large in large_companies):
                            continue
                        companies_set.add(name)
                        # Save incrementally
                        with open('raw_names.txt', 'a', encoding='utf-8') as f:
                            f.write(name + '\n')
                except Exception as e:
                    pass
            
            await page.close()
            if len(companies_set) >= 3500:
                break
                
        await browser.close()
        return list(companies_set)

def get_website(company_name):
    time.sleep(1.2)
    try:
        results = DDGS().text(f"{company_name} 愛知 会社概要", max_results=1)
        if results:
            url = results[0]['href']
            bad_domains = ["yahoo.co.jp", "wikipedia.org", "mapion.co.jp", "navitime.co.jp", "itp.ne.jp", "doda.jp", "rikunabi.com", "mynavi.jp", "en-japan", "youtube.com"]
            if any(bad in url.lower() for bad in bad_domains):
                return ""
            return url
        return ""
    except Exception as e:
        return ""

def main():
    # Remove old txt if exists
    if os.path.exists('raw_names.txt'):
         os.remove('raw_names.txt')

    company_names = asyncio.run(scrape_google_maps())
    company_names = list(set(company_names))
    random.shuffle(company_names)
    company_names = company_names[:3500]
    
    # Process URLs and save to CSV incrementally
    with open('aichi_system_companies_3000.csv', 'w', encoding='utf-8-sig') as f:
        f.write("企業名,WebサイトURL\n")
        
    valid_count = 0
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {executor.submit(get_website, name): name for name in company_names}
        
        for idx, future in enumerate(futures):
            name = futures[future]
            url = future.result()
            
            if url:
                valid_count += 1
                safe_name = name.replace('"', '""').replace('\n', '')
                safe_url = url.replace('"', '""').replace('\n', '')
                with open('aichi_system_companies_3000.csv', 'a', encoding='utf-8-sig') as f:
                    f.write(f'"{safe_name}","{safe_url}"\n')
                
            if valid_count >= 3000:
                break

if __name__ == "__main__":
    main()
