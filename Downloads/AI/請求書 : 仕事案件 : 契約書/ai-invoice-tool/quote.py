#!/usr/bin/env python3
"""
見積書をサクッと作成

使い方:
  python quote.py 高校
  python quote.py zippies
"""
import os
import sys
import json
import datetime
from dateutil.relativedelta import relativedelta

sys.path.insert(0, os.path.dirname(__file__))
from invoice_manager import GoogleServices, Project

OUTPUT_DIR = "output"

def find_client(name):
    """クライアントフォルダを検索"""
    if not os.path.exists(OUTPUT_DIR):
        return None
    for folder in os.listdir(OUTPUT_DIR):
        if name in folder:
            info_path = os.path.join(OUTPUT_DIR, folder, "info.json")
            if os.path.exists(info_path):
                return info_path
    return None

def main():
    if len(sys.argv) < 2:
        # クライアント一覧表示
        print("\n【クライアント一覧】")
        if os.path.exists(OUTPUT_DIR):
            for f in os.listdir(OUTPUT_DIR):
                if os.path.isdir(os.path.join(OUTPUT_DIR, f)) and not f.startswith('.'):
                    print(f"  - {f}")
        print("\n使い方: python quote.py クライアント名")
        return

    client_name = sys.argv[1]
    info_path = find_client(client_name)

    if not info_path:
        print(f"「{client_name}」が見つかりません")
        return

    with open(info_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    services = GoogleServices()
    if not services.service_sheets:
        print("Google認証エラー")
        return

    project = Project(data['client'], data['project_name'])
    today = datetime.date.today()
    valid_until = (today + relativedelta(months=2)).strftime("%Y-%m-%d")

    project.data = {
        "client": data['client'],
        "project_name": data['project_name'],
        "date": today.strftime("%Y-%m-%d"),
        "items": data['items'],
        "total": data['total']
    }

    total_with_tax = int(data['total'] * 1.1)

    # シート作成
    title = f"御見積書_{data['client']}_{data['project_name']}"
    sid = services.create_sheet(title)

    if sid:
        services.apply_quote_layout(sid, project, valid_until)

        # PDF保存
        date_str = today.strftime('%Y%m%d')
        pdf_name = f"{date_str}_{data['client']}_{data['project_name']}_見積書.pdf"
        pdf_path = os.path.join(project.path, pdf_name)
        services.export_pdf(sid, pdf_path)

        # 結果表示（コピペ用）
        sheet_url = f"https://docs.google.com/spreadsheets/d/{sid}"

        print(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  見積書作成完了
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{data['client']} 様

{data['project_name']}の御見積書をお送りします。

お見積金額: ¥{total_with_tax:,}（税込）
有効期限: {valid_until}

▼ 見積書（Google スプレッドシート）
{sheet_url}

ご確認よろしくお願いいたします。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PDF: {pdf_path}
""")

if __name__ == "__main__":
    main()
