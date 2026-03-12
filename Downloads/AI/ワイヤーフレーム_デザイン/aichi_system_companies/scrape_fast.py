import asyncio
from playwright.async_api import async_playwright
import pandas as pd
import urllib.parse
from duckduckgo_search import DDGS
from concurrent.futures import ThreadPoolExecutor
import time

queries = [
    "システム開発 名古屋市中区",
    "システム開発 名古屋市中村区",
    "IT企業 名古屋市中区",
    "IT企業 名古屋市中村区",
    "ソフトウェア開発 名古屋市東区",
    "システム開発 名古屋市西区",
    "IT企業 名古屋市千種区",
    "システム開発 豊田市",
    "IT企業 豊田市",
    "ソフトウェア開発 岡崎市",
    "システム開発 一宮市",
    "システム開発 豊橋市",
    "システム開発 刈谷市",
    "IT企業 刈谷市",
    "システム開発 豊川市",
    "システム開発 安城市",
    "システム開発 春日井市",
    "ソフトウェア開発 名古屋市昭和区",
    "IT企業 名古屋市名東区",
    "システム開発 名古屋市熱田区",
    "システム開発 稲沢市",
    "ソフトウェア開発 半田市",
    "IT企業 小牧市"
]

async def scrape_google_maps():
    companies_set = set()
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(locale='ja-JP', viewport={'width': 1280, 'height': 800})
        
        for q in queries:
            print(f"Searching: {q}")
            page = await context.new_page()
            url = f"https://www.google.com/maps/search/{urllib.parse.quote(q)}"
            await page.goto(url, timeout=60000)
            
            try:
                await page.wait_for_selector('div[role="feed"]', timeout=10000)
            except Exception as e:
                print(f"Skipping {q}, no feed found.")
                await page.close()
                continue
            
            previously_counted = 0
            empty_scrolls = 0
            while True:
                items = await page.locator('div[role="feed"] > div > div > a').all()
                if len(items) > previously_counted:
                    previously_counted = len(items)
                    empty_scrolls = 0
                    await items[-1].hover()
                    await page.mouse.wheel(0, 10000)
                    await page.wait_for_timeout(1000)
                else:
                    empty_scrolls += 1
                    html = await page.content()
                    if "You've reached the end of the list" in html or "これ以上の結果はありません" in html or "検索結果がこれ以上ありません" in html or empty_scrolls > 3:
                        break
                    await page.mouse.wheel(0, 10000)
                    await page.wait_for_timeout(1500)
            
            items = await page.locator('div[role="feed"] > div > div > a').all()
            for index in range(len(items)):
                try:
                    element = page.locator('div[role="feed"] > div > div > a').nth(index)
                    name = await element.get_attribute('aria-label')
                    if name and name not in companies_set:
                        companies_set.add(name)
                        print(f"Found: {name}")
                except Exception as e:
                    pass
            
            await page.close()
            print(f"Total unique companies so far: {len(companies_set)}")
            if len(companies_set) >= 1000:
                break
                
        await browser.close()
        return list(companies_set)

def get_website(company_name):
    # rate limit duckduckgo minimally
    time.sleep(0.5)
    try:
        results = DDGS().text(f"{company_name} 愛知 会社概要", max_results=1)
        if results:
            url = results[0]['href']
            # small cleanup to just get domain if needed, but full URL is fine for now
            return url
        return ""
    except Exception as e:
        return ""

def main():
    company_names = asyncio.run(scrape_google_maps())
    
    # Optional filtering out bad matches
    filtered_names = [n for n in company_names if "株式会社" in n or "合同会社" in n or "有限会社" in n or "システム" in n or "開発" in n or "テクノ" in n]
    if len(filtered_names) < 600:
        filtered_names = list(company_names) # fallback to all if filtered is too small
        
    # Trim to 1000 max
    filtered_names = filtered_names[:1000]
    
    print(f"Finished scraping {len(filtered_names)} names. Now looking up URLs...")
    
    data = []
    # we don't want to over-saturate duckduckgo and get rate limited, so worker=3 is safe
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(get_website, name): name for name in filtered_names}
        
        for idx, future in enumerate(futures):
            name = futures[future]
            url = future.result()
            data.append({'企業名': name, 'WebサイトURL': url})
            if (idx + 1) % 50 == 0:
                print(f"Processed {idx + 1} URLs...")
                
    df = pd.DataFrame(data)
    df.to_csv('aichi_system_companies.csv', index=False, encoding='utf-8-sig')
    print(f"Done! Saved {len(df)} companies to aichi_system_companies.csv")

if __name__ == "__main__":
    main()
