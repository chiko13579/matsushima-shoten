import asyncio
from playwright.async_api import async_playwright
import pandas as pd
from duckduckgo_search import DDGS
from concurrent.futures import ThreadPoolExecutor
import time
import random
import os

large_companies = [
    "トヨタ", "三菱", "日立", "富士通", "NEC", "NTT", "パナソニック", "キャノン", "キヤノン", "アイシン", 
    "デンソー", "東芝", "ソフトバンク", "KDDI", "伊藤忠", "SCSK", "トランスコスモス", "富士ソフト", 
    "大塚商会", "TIS", "BIPROGY", "アイ・ビー・エム", "アクセンチュア", "デロイト", "PwC", 
    "KPMG", "EY", "野村総合研究所", "NRI", "JFE", "ダッソーシステムズ", "日本発条", "豊田自動織機",
    "中電", "名鉄", "シヤチハタ", "日鉄", "KIOXIA", "キオクシア", "MHI", "IHI", "CTC"
]

branch_keywords = ["支店", "営業所", "事業所", "支社", "出張所", "オフィス", "工場"]

async def scrape_baseconnect_names():
    companies_set = set()
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            extra_http_headers={"Accept-Language": "ja-JP,ja;q=0.9"}
        )
        page = await context.new_page()
        
        # Baseconnect pagination
        page_num = 1
        max_pages = 250 # Ensure enough pages to hit 3000 target
        
        while page_num <= max_pages:
            url = f"https://baseconnect.in/search/companies?categories%5B%5D=377d61f9-f6d3-4474-a6aa-4f14e3fd9b17&prefecture%5B%5D=60622468-79bd-4eef-86f8-cb69d1ef09f0&listing_market%5B%5D=unlisted&page={page_num}"
            print(f"Scraping Baseconnect Page {page_num}...")
            try:
                await page.goto(url, timeout=30000, wait_until="domcontentloaded")
                await page.wait_for_timeout(random.randint(1500, 3000))
                
                # Check for 403 or cap
                if "403 Forbidden" in await page.content() or "エラー" in await page.title():
                    print("Hit bot protection. Retrying later or closing.")
                    break
                    
                # Extract titles
                items = await page.locator("h3.fw_bold").all_inner_texts()
                
                if not items:
                    print("No more items found. Ending pagination.")
                    break
                    
                for name in items:
                    name = name.strip()
                    if name and name not in companies_set:
                        if any(branch in name for branch in branch_keywords):
                            continue
                        if any(large in name for large in large_companies):
                            continue
                        companies_set.add(name)
                        
                print(f" -> Found {len(items)} items on page {page_num}. Total so far: {len(companies_set)}")
                page_num += 1
                
                if len(companies_set) >= 3500:
                    break
                    
            except Exception as e:
                print(f"Error on page {page_num}: {e}")
                break
                
        await browser.close()
        return list(companies_set)

from googlesearch import search

def get_website(company_name):
    # Reduced delay since googlesearch-python handles simple queries well, but still add a bit
    time.sleep(1.5)
    try:
        # Fetch top results from Google Japan
        results = list(search(f"{company_name} 愛知 会社概要", num_results=1, lang="ja"))
        if results:
            url = results[0]
            bad_domains = ["yahoo.co.jp", "wikipedia.org", "mapion.co.jp", "navitime.co.jp", "itp.ne.jp", "doda.jp", "rikunabi.com", "mynavi.jp", "en-japan", "youtube.com", "baseconnect.in", "houjin-bangou.nta.go.jp", "employment.en-japan.com"]
            if any(bad in url.lower() for bad in bad_domains):
                return ""
            return url
        return ""
    except Exception as e:
        return ""

def main():
    print("Starting Baseconnect Scrape...")
    company_names = asyncio.run(scrape_baseconnect_names())
    
    company_names = list(set(company_names))
    random.shuffle(company_names)
    company_names = company_names[:3500]
    
    print(f"Baseconnect scraping finished: {len(company_names)} names extracted.")
    print("Now fetching URLs...")
    
    output_file = 'aichi_system_companies_baseconnect.csv'
    with open(output_file, 'w', encoding='utf-8-sig') as f:
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
                with open(output_file, 'a', encoding='utf-8-sig') as f:
                    f.write(f'"{safe_name}","{safe_url}"\n')
                    
            if (idx + 1) % 50 == 0:
                print(f"Processed {idx+1}/{len(company_names)}. Valid URLs found: {valid_count}")
                
            if valid_count >= 3000:
                print("Reached 3000 valid companies limit.")
                break
                
    print(f"Complete! Saved {valid_count} companies to {output_file}.")

if __name__ == "__main__":
    main()
