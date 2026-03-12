#!/usr/bin/env python3
"""
シンプルな書類作成スクリプト

使い方:
  python create_doc.py メモ              # 新規メモ作成
  python create_doc.py 見積書 会社名      # メモから見積書作成
  python create_doc.py 請求書 会社名      # メモから請求書作成
  python create_doc.py 前受金 会社名      # メモから前受金請求書作成
  python create_doc.py 契約書 会社名      # メモから契約書+仕様書作成
  python create_doc.py 契約書 会社名 佐伯 # プロフィール指定
"""

import os
import sys
import json
import datetime
import re
from dateutil.relativedelta import relativedelta

# Add parent to path
sys.path.insert(0, os.path.dirname(__file__))
from invoice_manager import GoogleServices, Project, SELLER_INFO, BANK_INFO, generate_contract_docs
import budget_matcher

OUTPUT_DIR = "output"


def list_clients():
    """既存のクライアント一覧を表示"""
    if not os.path.exists(OUTPUT_DIR):
        print("まだクライアントがありません")
        return []

    clients = [d for d in os.listdir(OUTPUT_DIR)
               if os.path.isdir(os.path.join(OUTPUT_DIR, d)) and not d.startswith('.')]

    if clients:
        print("\n【既存のクライアント】")
        for i, c in enumerate(clients, 1):
            print(f"  {i}. {c}")
    return clients


def load_memo(client_name):
    """クライアントのメモを読み込む"""
    # Find matching folder
    if not os.path.exists(OUTPUT_DIR):
        return None

    for folder in os.listdir(OUTPUT_DIR):
        if client_name in folder:
            info_path = os.path.join(OUTPUT_DIR, folder, "info.json")
            if os.path.exists(info_path):
                with open(info_path, 'r', encoding='utf-8') as f:
                    return json.load(f), folder
    return None, None


def create_memo():
    """新規メモ（見積もりデータ）を作成"""
    print("\n" + "=" * 50)
    print("   新規メモ作成")
    print("=" * 50)

    # クライアント情報
    client = input("\n会社名: ").strip()
    if not client:
        print("会社名は必須です")
        return

    project_name = input("案件名: ").strip()
    if not project_name:
        project_name = "Web制作案件"

    # 制作メニュー
    print("\n【制作メニュー】")
    print("1. Webサイト制作（デザイン+コーディング）")
    print("2. LP制作")
    print("3. コーディングのみ")
    print("4. デザインのみ")
    print("5. Studio制作")

    menu_map = {
        "1": "Webサイト制作",
        "2": "LP制作",
        "3": "ウェブコーディング",
        "4": "ウェブデザイン",
        "5": "Studio制作"
    }

    menu_choice = input("選択 (1-5): ").strip()
    menu = menu_map.get(menu_choice, "Webサイト制作")

    # 予算
    budget_input = input("\n予算（例: 50万, 500000, 空欄で標準価格）: ").strip()
    budget = 0
    if budget_input:
        match = re.search(r'(\d+)万', budget_input)
        if match:
            budget = int(match.group(1)) * 10000
        else:
            try:
                budget = int(budget_input.replace(",", ""))
            except:
                pass
        if "税込" in budget_input and budget > 0:
            budget = int(budget / 1.1)

    # ページ数
    page_input = input("ページ数（空欄でデフォルト）: ").strip()
    page_count = None
    if page_input:
        try:
            page_count = int(re.sub(r'[PpＰｐページ]', '', page_input))
        except:
            pass

    # 価格計算
    overrides = {}
    if page_count:
        overrides['sub_pages'] = max(0, page_count - 1)

    pricing = budget_matcher.get_pricing_plan(menu, budget, overrides=overrides)

    # プロジェクト作成・保存
    project = Project(client, project_name)
    project.data = {
        "client": client,
        "project_name": project_name,
        "date": datetime.date.today().strftime("%Y-%m-%d"),
        "items": [i for i in pricing['items'] if i['quantity'] > 0],
        "total": pricing['total'],
        "menu": menu
    }
    project.save()

    # 確認表示
    total_with_tax = int(pricing['total'] * 1.1)
    print("\n" + "=" * 50)
    print("   メモ作成完了！")
    print("=" * 50)
    print(f"会社名: {client}")
    print(f"案件名: {project_name}")
    print(f"制作内容: {menu}")
    print(f"\n【内訳】")
    for item in project.data['items']:
        print(f"  - {item['desc']} x{item['quantity']} : ¥{item['price']:,}")
    print(f"\n小計: ¥{pricing['total']:,}")
    print(f"消費税: ¥{total_with_tax - pricing['total']:,}")
    print(f"合計（税込）: ¥{total_with_tax:,}")
    print(f"\n保存先: {project.path}")

    # 見積書作成確認
    create_quote = input("\n続けて見積書を作成しますか？ (y/n): ").strip().lower()
    if create_quote == 'y':
        create_document("見積書", client)


def create_document(doc_type, client_name, profile=None):
    """メモから書類を作成"""
    data, folder = load_memo(client_name)
    if not data:
        print(f"「{client_name}」のメモが見つかりません")
        list_clients()
        return

    print(f"  発行者: {SELLER_INFO['name']}")

    services = GoogleServices()
    if not services.service_sheets:
        print("Google認証が必要です")
        return

    project = Project(data['client'], data['project_name'])
    project.data = data

    today = datetime.date.today()
    date_str = today.strftime('%Y%m%d')
    safe_proj = data['project_name'].replace("/", "_").replace(" ", "")

    total = data['total']
    total_with_tax = int(total * 1.1)

    if doc_type == "見積書":
        # 有効期限（2ヶ月後）
        valid_until = (today + relativedelta(months=2)).strftime("%Y-%m-%d")

        print(f"\n[見積書を作成中...]")
        title = f"御見積書_{data['client']}_{data['project_name']}"
        sid = services.create_sheet(title)

        if sid:
            services.apply_quote_layout(sid, project, valid_until)
            print(f"シート: https://docs.google.com/spreadsheets/d/{sid}")

            pdf_name = f"{date_str}_{data['client']}_{safe_proj}_見積書.pdf"
            pdf_path = os.path.join(project.path, pdf_name)
            services.export_pdf(sid, pdf_path)

            print(f"\n見積書作成完了！")
            print(f"  金額: ¥{total_with_tax:,}（税込）")
            print(f"  有効期限: {valid_until}")
            print(f"  PDF: {pdf_name}")

    elif doc_type == "請求書":
        # 支払期限（30日後）
        payment_due = (today + relativedelta(days=30)).strftime("%Y-%m-%d")

        print(f"\n[請求書を作成中...]")
        title = f"請求書_{data['client']}_{data['project_name']}"
        sid = services.create_sheet(title)

        if sid:
            services.apply_invoice_layout(sid, project, payment_due)
            print(f"シート: https://docs.google.com/spreadsheets/d/{sid}")

            pdf_name = f"{date_str}_{data['client']}_{safe_proj}_請求書.pdf"
            pdf_path = os.path.join(project.path, pdf_name)
            services.export_pdf(sid, pdf_path)

            print(f"\n請求書作成完了！")
            print(f"  金額: ¥{total_with_tax:,}（税込）")
            print(f"  支払期限: {payment_due}")
            print(f"  PDF: {pdf_name}")

    elif doc_type == "前受金":
        # 前受金割合
        ratio_input = input("前受金の割合（%、デフォルト50）: ").strip()
        try:
            ratio = int(ratio_input) / 100 if ratio_input else 0.5
        except:
            ratio = 0.5

        deposit = int(total * ratio)
        deposit_with_tax = int(deposit * 1.1)
        payment_due = (today + relativedelta(days=14)).strftime("%Y-%m-%d")

        print(f"\n[前受金請求書を作成中...]")
        title = f"前受金請求書_{data['client']}_{data['project_name']}"
        sid = services.create_sheet(title)

        if sid:
            services.apply_deposit_layout(sid, project, deposit, payment_due)
            print(f"シート: https://docs.google.com/spreadsheets/d/{sid}")

            pdf_name = f"{date_str}_{data['client']}_{safe_proj}_前受金請求書.pdf"
            pdf_path = os.path.join(project.path, pdf_name)
            services.export_pdf(sid, pdf_path)

            print(f"\n前受金請求書作成完了！")
            print(f"  前受金: ¥{deposit_with_tax:,}（税込・{int(ratio*100)}%）")
            print(f"  支払期限: {payment_due}")
            print(f"  PDF: {pdf_name}")

    elif doc_type == "契約書":
        print(f"\n[契約書を作成中...]")
        generated_files = []
        generate_contract_docs(services, project, generated_files)

        print(f"\n契約書作成完了！")
        print(f"  金額: ¥{total_with_tax:,}（税込）")
        for label, path in generated_files:
            print(f"  {label}: {os.path.basename(path)}")


def main():
    if len(sys.argv) < 2:
        # インタラクティブモード
        print("\n" + "=" * 50)
        print("   書類作成ツール")
        print("=" * 50)
        print("\n何をしますか？")
        print("1. 新規メモ作成")
        print("2. 見積書作成（メモから）")
        print("3. 請求書作成（メモから）")
        print("4. 前受金請求書作成（メモから）")
        print("5. 契約書作成（メモから）")

        choice = input("\n選択 (1-5): ").strip()

        if choice == "1":
            create_memo()
        elif choice in ["2", "3", "4", "5"]:
            clients = list_clients()
            if not clients:
                return
            client_input = input("\n会社名（番号または名前）: ").strip()

            # 番号で選択
            try:
                idx = int(client_input) - 1
                if 0 <= idx < len(clients):
                    client_name = clients[idx]
                else:
                    client_name = client_input
            except:
                client_name = client_input

            doc_map = {"2": "見積書", "3": "請求書", "4": "前受金", "5": "契約書"}
            create_document(doc_map[choice], client_name)
        else:
            print("1-5で選択してください")
    else:
        # コマンドラインモード
        cmd = sys.argv[1]
        profile = sys.argv[3] if len(sys.argv) >= 4 else None

        if cmd in ["メモ", "memo", "新規"]:
            create_memo()
        elif cmd in ["見積書", "見積", "quote"]:
            if len(sys.argv) < 3:
                clients = list_clients()
                client_name = input("\n会社名: ").strip()
            else:
                client_name = sys.argv[2]
            create_document("見積書", client_name, profile)
        elif cmd in ["請求書", "請求", "invoice"]:
            if len(sys.argv) < 3:
                clients = list_clients()
                client_name = input("\n会社名: ").strip()
            else:
                client_name = sys.argv[2]
            create_document("請求書", client_name, profile)
        elif cmd in ["前受金", "deposit", "着手金"]:
            if len(sys.argv) < 3:
                clients = list_clients()
                client_name = input("\n会社名: ").strip()
            else:
                client_name = sys.argv[2]
            create_document("前受金", client_name, profile)
        elif cmd in ["契約書", "契約", "contract"]:
            if len(sys.argv) < 3:
                clients = list_clients()
                client_name = input("\n会社名: ").strip()
            else:
                client_name = sys.argv[2]
            create_document("契約書", client_name, profile)
        else:
            print(__doc__)


if __name__ == "__main__":
    main()
