import asyncio
from playwright.async_api import async_playwright
import pandas as pd
import time
import urllib.parse

# List of queries to cover Aichi prefecture system companies
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
    companies = []
    seen = set()
    
    async with async_playwright() as p:
        # Launch browser. Headless runs faster but sometimes blocked. We will try headless=False for stability.
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(locale='ja-JP', viewport={'width': 1280, 'height': 800})
        
        for q in queries:
            print(f"Searching: {q}")
            page = await context.new_page()
            url = f"https://www.google.com/maps/search/{urllib.parse.quote(q)}"
            await page.goto(url, timeout=60000)
            
            # Wait for feed to load
            try:
                await page.wait_for_selector('div[role="feed"]', timeout=10000)
            except Exception as e:
                print(f"Skipping {q}, no feed found. ({e})")
                await page.close()
                continue
            
            # Scroll feed to load all results for this query (max 120 usually)
            previously_counted = 0
            while True:
                items = await page.locator('div[role="feed"] > div > div > a').all()
                if len(items) > previously_counted:
                    previously_counted = len(items)
                    await items[-1].hover()
                    await page.mouse.wheel(0, 10000)
                    await page.wait_for_timeout(1500)
                else:
                    # check if hit the end
                    html = await page.content()
                    if "You've reached the end of the list" in html or "検索結果がこれ以上ありません" in html or "これ以上の結果はありません" in html:
                        break
                    # double check with one more scroll
                    await page.mouse.wheel(0, 10000)
                    await page.wait_for_timeout(2000)
                    items2 = await page.locator('div[role="feed"] > div > div > a').all()
                    if len(items2) == previously_counted:
                        break
            
            # Extract names and click each for URL
            items = await page.locator('div[role="feed"] > div > div > a').all()
            print(f"Found {len(items)} items for {q}")
            
            for index in range(len(items)):
                try:
                    # we must re-query because dom changes often
                    item_locator = page.locator('div[role="feed"] > div > div > a').nth(index)
                    name = await item_locator.get_attribute('aria-label')
                    if not name or name in seen:
                        continue
                        
                    # click to load details
                    await item_locator.click()
                    await page.wait_for_timeout(1500) # wait for pane load
                    
                    # try to extract website. look for data-item-id="authority"
                    # Google maps website link is typically an 'a' tag with data-tooltip="ウェブサイトを開く" or similar
                    website = ""
                    try:
                        web_link = page.locator('a[data-item-id="authority"]')
                        if await web_link.count() > 0:
                            website = await web_link.first.get_attribute('href')
                    except:
                        pass
                        
                    print(f"Extracted: {name} - {website}")
                    companies.append({'企業名': name, 'WebサイトURL': website})
                    seen.add(name)
                        
                    # Check target size early to inform user we're getting traction
                    if len(companies) >= 1000:
                        break
                except Exception as e:
                    print(f"Error on item {index}: {e}")
            
            await page.close()
            
            if len(companies) >= 1000:
                print("Reached 1000 companies limit.")
                break
                
        await browser.close()
        
    df = pd.DataFrame(companies)
    df = df.drop_duplicates(subset=['企業名']) # extra safety
    df.to_csv('aichi_system_companies.csv', index=False, encoding='utf-8-sig')
    print(f"Saved {len(df)} companies to aichi_system_companies.csv")

if __name__ == "__main__":
    asyncio.run(scrape_google_maps())
