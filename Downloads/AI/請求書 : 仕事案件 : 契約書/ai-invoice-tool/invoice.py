#!/usr/bin/env python3
"""
請求書をサクッと作成

使い方:
  python invoice.py 高校
  python invoice.py zippies
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
        print("\n【クライアント一覧】")
        if os.path.exists(OUTPUT_DIR):
            for f in os.listdir(OUTPUT_DIR):
                if os.path.isdir(os.path.join(OUTPUT_DIR, f)) and not f.startswith('.'):
                    print(f"  - {f}")
        print("\n使い方: python invoice.py クライアント名")
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
    payment_due = (today + relativedelta(days=30)).strftime("%Y-%m-%d")

    project.data = {
        "client": data['client'],
        "project_name": data['project_name'],
        "date": today.strftime("%Y-%m-%d"),
        "items": data['items'],
        "total": data['total']
    }

    total_with_tax = int(data['total'] * 1.1)

    title = f"請求書_{data['client']}_{data['project_name']}"
    sid = services.create_sheet(title)

    if sid:
        services.apply_invoice_layout(sid, project, payment_due)

        date_str = today.strftime('%Y%m%d')
        pdf_name = f"{date_str}_{data['client']}_{data['project_name']}_請求書.pdf"
        pdf_path = os.path.join(project.path, pdf_name)
        services.export_pdf(sid, pdf_path)

        sheet_url = f"https://docs.google.com/spreadsheets/d/{sid}"

        print(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  請求書作成完了
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{data['client']} 様

{data['project_name']}の請求書をお送りします。

ご請求金額: ¥{total_with_tax:,}（税込）
お支払期限: {payment_due}

▼ 請求書（Google スプレッドシート）
{sheet_url}

ご確認よろしくお願いいたします。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PDF: {pdf_path}
""")

if __name__ == "__main__":
    main()
