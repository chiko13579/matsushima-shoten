import os
import re
import datetime
import shutil
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

TARGET_URL = "https://www.lancers.jp/work/search/web?open=1&work_rank%5B%5D=3&work_rank%5B%5D=2&budget_from=100000&budget_to=&keyword=&not="
WEBHOOK_URL = "https://discord.com/api/webhooks/1474741254599213146/fBlf7UrCtC2k2KHY6cLGeSxHAhyh4OS-2f8klU6dU1hrbjqiqFg15Dj2txZ4_K4_ber0"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
NOTIFIED_LIST_FILE = os.path.join(BASE_DIR, "notified_list.txt")
BASE_URL = "https://www.lancers.jp"

def setup_directories():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(NOTIFIED_LIST_FILE):
        with open(NOTIFIED_LIST_FILE, 'w', encoding='utf-8') as f:
            pass

def sanitize_filename(filename):
    # ファイル名として使えない禁則文字を置換
    return re.sub(r'[\\/*?:"<>|]', '_', filename)

def cleanup_old_data():
    now = datetime.datetime.now()
    threshold = now - datetime.timedelta(days=7)
    
    if not os.path.exists(DATA_DIR):
        return
        
    for item in os.listdir(DATA_DIR):
        item_path = os.path.join(DATA_DIR, item)
        if os.path.isdir(item_path):
            try:
                # フォルダ名がYYYY-MM-DD形式であるかをチェック
                folder_date = datetime.datetime.strptime(item, "%Y-%m-%d")
                if folder_date < threshold:
                    shutil.rmtree(item_path)
                    print(f"古いフォルダを削除しました: {item}")
            except ValueError:
                # YYYY-MM-DD形式でないフォルダは無視
                pass

def get_notified_urls():
    if not os.path.exists(NOTIFIED_LIST_FILE):
        return set()
    with open(NOTIFIED_LIST_FILE, 'r', encoding='utf-8') as f:
        return set(line.strip() for line in f if line.strip())

def add_notified_url(url):
    with open(NOTIFIED_LIST_FILE, 'a', encoding='utf-8') as f:
        f.write(f"{url}\n")

def send_discord_notification(title, budget, url):
    content = f"【{budget}】{title}\n{url}"
    data = {"content": content}
    try:
        response = requests.post(WEBHOOK_URL, json=data, timeout=10)
        response.raise_for_status()
    except Exception as e:
        print(f"Discord通知に失敗しました ({url}): {e}")

def save_to_file(title, budget, url, description):
    today_str = datetime.datetime.now().strftime("%Y-%m-%d")
    today_dir = os.path.join(DATA_DIR, today_str)
    os.makedirs(today_dir, exist_ok=True)
    
    # 案件タイトルをサニタイズ
    sanitized = sanitize_filename(f"【{budget}】{title}")
    # 長すぎるとOS制限に引っかかる可能性があるため適度に切り詰め（拡張子分を考慮）
    sanitized = sanitized[:200]
    
    file_path = os.path.join(today_dir, f"{sanitized}.txt")
    
    content = f"タイトル: {title}\n金額: {budget}\nURL: {url}\n\n詳細文:\n{description}"
    
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
    except Exception as e:
        print(f"ファイル保存に失敗しました ({url}): {e}")

def fetch_lancers_jobs():
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        res = requests.get(TARGET_URL, headers=headers, timeout=15)
        res.raise_for_status()
    except Exception as e:
        print(f"ランサーズからのデータ取得に失敗しました: {e}")
        return []
        
    soup = BeautifulSoup(res.text, 'html.parser')
    jobs = []
    
    # hrefに `/work/detail/` を含むリンクを全て検索して案件ブロックを特定
    processed_urls = set()
    
    # Lancersのカードリストの典型的なラッパー要素からデータを抽出
    for a_tag in soup.find_all('a', href=re.compile(r'/work/detail/')):
        url_path = a_tag.get('href')
        if not url_path:
            continue
            
        full_url = urljoin(BASE_URL, url_path).split('#')[0].split('?')[0]
        
        if full_url in processed_urls:
            continue
            
        # 案件全体を囲むコンテナを見つける
        container = a_tag.find_parent('div', class_=re.compile(r'c-media(?!\w)', re.I))
        if not container:
            container = a_tag.find_parent('div', class_=re.compile(r'work|job|list', re.I))
            if not container:
                container = a_tag.find_parent('div')
        
        if not container:
            continue
            
        processed_urls.add(full_url)
        
        # タイトルの抽出
        title_tag = container.find(class_=re.compile(r'title|name', re.I))
        if title_tag:
            title = title_tag.get_text(separator=' ', strip=True)
        else:
            title = a_tag.get_text(separator=' ', strip=True)
            
        if not title:
            continue
            
        # 金額の抽出
        budget = "金額不明"
        price_tag = container.find(string=re.compile(r'円'))
        if price_tag:
            price_container = price_tag.find_parent(class_=re.compile(r'price|reward', re.I))
            if price_container:
                budget = price_container.get_text(separator=' ', strip=True)
            else:
                budget = price_tag.strip()
                
        # 詳細文の抽出
        description = "詳細文なし"
        desc_tag = container.find(class_=re.compile(r'detail|desc|content|body', re.I))
        if desc_tag:
            description = desc_tag.get_text(separator='\n', strip=True)
            
        jobs.append({
            'title': title,
            'url': full_url,
            'budget': budget,
            'description': description
        })
        
    return jobs

def main():
    print("スクレイピング処理を開始します...")
    setup_directories()
    
    print("古いデータフォルダのクリーンアップを実行中...")
    cleanup_old_data()
    
    notified_urls = get_notified_urls()
    jobs = fetch_lancers_jobs()
    
    print(f"{len(jobs)}件の案件候補が見つかりました。")
    
    for job in jobs:
        title = job['title']
        description = job['description']
        url = job['url']
        budget = job['budget']
        
        # 除外条件：指定した特定の文字列が含まれているか
        exclude_keywords = ["定番", "投稿作成", "運用代行"]
        if any(keyword in title or keyword in description for keyword in exclude_keywords):
            print(f"スキップ (除外キーワードが含まれています): {title}")
            continue

        # 除外条件：金額が10万円未満の案件をスキップ
        # 文字列(例: "50,000 円 ~ 100,000 円")から数字を抽出
        amount_strs = re.findall(r'\d{1,3}(?:,\d{3})*', budget)
        if amount_strs:
            amounts = [int(n.replace(',', '')) for n in amount_strs]
            # 抽出されたすべての金額の最大値が10万未満ならスキップ
            if max(amounts) < 100000:
                print(f"スキップ (金額が10万円未満): {title} ({budget})")
                continue
            
        # 重複チェック
        if url in notified_urls:
            continue
            
        print(f"新着案件を処理中: {title}")
        
        # Discord通知
        send_discord_notification(title, budget, url)
        
        # ファイル保存
        save_to_file(title, budget, url, description)
        
        # 通知済みリストへ追加
        add_notified_url(url)
        notified_urls.add(url)
        
        # APIやサーバーへの負荷を軽減するため1秒待機
        time.sleep(1)
        
    print("処理が完了しました。")

if __name__ == "__main__":
    main()
