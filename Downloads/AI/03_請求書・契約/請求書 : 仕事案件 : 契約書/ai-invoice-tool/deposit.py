#!/usr/bin/env python3
"""
前受金請求書をサクッと作成

使い方:
  python deposit.py 高校        # デフォルト50%
  python deposit.py 高校 30     # 30%指定
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
        print("\n使い方: python deposit.py クライアント名 [割合%]")
        print("例: python deposit.py 高校 50")
        return

    client_name = sys.argv[1]
    ratio = int(sys.argv[2]) / 100 if len(sys.argv) > 2 else 0.5

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
    payment_due = (today + relativedelta(days=14)).strftime("%Y-%m-%d")

    project.data = {
        "client": data['client'],
        "project_name": data['project_name'],
        "date": today.strftime("%Y-%m-%d"),
        "items": data['items'],
        "total": data['total']
    }

    total_with_tax = int(data['total'] * 1.1)
    deposit = int(data['total'] * ratio)
    deposit_with_tax = int(deposit * 1.1)

    title = f"前受金請求書_{data['client']}_{data['project_name']}"
    sid = services.create_sheet(title)

    if sid:
        services.apply_deposit_layout(sid, project, deposit, payment_due)

        date_str = today.strftime('%Y%m%d')
        pdf_name = f"{date_str}_{data['client']}_{data['project_name']}_前受金請求書.pdf"
        pdf_path = os.path.join(project.path, pdf_name)
        services.export_pdf(sid, pdf_path)

        sheet_url = f"https://docs.google.com/spreadsheets/d/{sid}"

        print(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  前受金請求書作成完了
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{data['client']} 様

{data['project_name']}の前受金請求書をお送りします。

総額: ¥{total_with_tax:,}（税込）
前受金（{int(ratio*100)}%）: ¥{deposit_with_tax:,}（税込）
お支払期限: {payment_due}

▼ 前受金請求書（Google スプレッドシート）
{sheet_url}

ご確認よろしくお願いいたします。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PDF: {pdf_path}
""")

if __name__ == "__main__":
    main()
