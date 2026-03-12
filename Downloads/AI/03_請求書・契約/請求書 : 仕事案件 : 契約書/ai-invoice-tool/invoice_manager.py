import os
import sys
import datetime
import json
import sqlite3
import textwrap
import re
from dateutil.relativedelta import relativedelta

# Add local libs to path
sys.path.append(os.path.join(os.path.dirname(__file__), '.libs'))

try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import budget_matcher

# Configuration
OUTPUT_DIR = "output"

# 書類種別定義
DOCUMENT_TYPES = {
    "1": {"key": "quote", "name": "見積書", "sheet_title": "御 見 積 書"},
    "2": {"key": "invoice", "name": "請求書", "sheet_title": "請 求 書"},
    "3": {"key": "contract", "name": "契約書", "sheet_title": "契約書"},
    "4": {"key": "deposit", "name": "前受金請求書", "sheet_title": "前受金請求書"}
}
SELLER_INFO = {
    "name": "佐伯 幸世",
    "rep_name": "",
    "zip": "〒470-2309",
    "address": "愛知県知多郡武豊町梨子ノ木５丁目",
    "address2": "１４９ ネオハイツ・ホウゲツ 202",
    "tel": "TEL: 080-4438-3426",
    "email": "raum.web.creator@gmail.com",
    "reg_no": ""
}
BANK_INFO = """お振込先:
三菱UFJ銀行 江南支店(830) 普通 0273874 サエキ サチヨ"""

def select_document_types():
    """対話形式で書類種別を選択"""
    print("\n=== 書類種別を選択してください ===")
    print("1. 見積書")
    print("2. 請求書")
    print("3. 契約書")
    print("4. 前受金請求書")
    print("（複数選択可: 例 1,2,3 または 1 2 3）")

    selection = input("選択: ").strip()

    # パース: カンマ、スペース、改行で区切り
    selected = []
    for char in selection.replace(",", " ").split():
        if char in DOCUMENT_TYPES:
            selected.append(DOCUMENT_TYPES[char]["key"])

    if not selected:
        print("選択がないため、見積書をデフォルトで作成します")
        selected = ["quote"]

    return selected

def collect_project_info():
    """対話形式でプロジェクト情報を収集"""
    print("\n=== プロジェクト情報を入力してください ===")

    client = input("会社名（クライアント名）: ").strip()
    if not client:
        client = "株式会社サンプル"

    project_name = input("案件名: ").strip()
    if not project_name:
        project_name = "Web制作案件"

    # 予算
    budget_str = input("予算（例: 50万 or 500000、空欄でマスタ価格適用）: ").strip()
    budget = 0
    if budget_str:
        import re
        match = re.search(r'(\d+)万', budget_str)
        if match:
            budget = int(match.group(1)) * 10000
        else:
            try:
                budget = int(budget_str.replace(",", ""))
            except:
                pass

        # 税込チェック
        if "税込" in budget_str and budget > 0:
            budget = int(budget / 1.1)

    # 制作メニュー選択
    print("\n制作メニューを選択:")
    print("1. Webサイト制作（デザイン+コーディング）")
    print("2. LP制作")
    print("3. コーディングのみ")
    print("4. デザインのみ")
    print("5. Studio制作")
    menu_choice = input("選択 (1-5): ").strip()

    menu_map = {
        "1": "Webサイト制作",
        "2": "LP制作",
        "3": "ウェブコーディング",
        "4": "ウェブデザイン",
        "5": "Studio制作"
    }
    menu = menu_map.get(menu_choice, "Webサイト制作")

    # ページ数
    page_str = input("総ページ数（空欄でデフォルト）: ").strip()
    page_count = None
    if page_str:
        try:
            page_count = int(page_str)
        except:
            pass

    return {
        "client": client,
        "project_name": project_name,
        "budget": budget,
        "menu": menu,
        "page_count": page_count
    }

def collect_date_info(doc_types):
    """書類種別に応じた日付情報を収集"""
    dates = {}
    today = datetime.date.today()

    dates["issue_date"] = today.strftime("%Y-%m-%d")

    if "quote" in doc_types:
        # 見積書の有効期限（デフォルト: 発行日から2ヶ月）
        default_valid = (today + relativedelta(months=2)).strftime("%Y-%m-%d")
        valid_until = input(f"見積書の有効期限 (デフォルト: {default_valid}): ").strip()
        dates["quote_valid_until"] = valid_until if valid_until else default_valid

    if "invoice" in doc_types or "deposit" in doc_types:
        # 請求書の支払期限（デフォルト: 発行日から30日）
        default_due = (today + relativedelta(days=30)).strftime("%Y-%m-%d")
        due_date = input(f"支払期限 (デフォルト: {default_due}): ").strip()
        dates["payment_due"] = due_date if due_date else default_due

    if "deposit" in doc_types:
        # 前受金の割合
        deposit_ratio = input("前受金の割合 (例: 50 でご予算の50%、空欄で50%): ").strip()
        try:
            dates["deposit_ratio"] = int(deposit_ratio) / 100 if deposit_ratio else 0.5
        except:
            dates["deposit_ratio"] = 0.5

    return dates

SCOPES = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
]

class GoogleServices:
    def __init__(self):
        self.creds = None
        self.service_docs = None
        self.service_drive = None
        self.service_sheets = None

        if os.path.exists('token.json'):
            self.creds = Credentials.from_authorized_user_file('token.json', SCOPES)

        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
            elif os.path.exists('credentials.json'):
                flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
                self.creds = flow.run_local_server(port=0)
            else:
                print("credentials.json が見つかりません")
                return

            with open('token.json', 'w') as token:
                token.write(self.creds.to_json())

        if self.creds and self.creds.valid:
            self.service_docs = build('docs', 'v1', credentials=self.creds)
            self.service_drive = build('drive', 'v3', credentials=self.creds)
            self.service_sheets = build('sheets', 'v4', credentials=self.creds)

    def create_sheet(self, title):
        if not self.service_sheets: return None
        body = {'properties': {'title': title}}
        sheet = self.service_sheets.spreadsheets().create(body=body).execute()
        return sheet.get('spreadsheetId')

    def apply_a4_layout(self, sheet_id, project, doc_type="見積書"):
        requests = []
        sheet_id_int = 0 # Default sheet 0

        # 0. Hide Gridlines
        requests.append({
            "updateSheetProperties": {
                "properties": {
                    "sheetId": sheet_id_int,
                    "gridProperties": {"hideGridlines": True}
                },
                "fields": "gridProperties.hideGridlines"
            }
        })

        # 1. Column Widths (Total ~600px -> A4 fit)
        # Shifted Left: A: Item, B: Qty, C: Unit, D: Amount
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 1}, "properties": {"pixelSize": 350}, "fields": "pixelSize"}}) # Item (Was B)
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 1, "endIndex": 2}, "properties": {"pixelSize": 60}, "fields": "pixelSize"}}) # Qty (Was C)
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 2, "endIndex": 3}, "properties": {"pixelSize": 100}, "fields": "pixelSize"}}) # Unit (Was D)
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 3, "endIndex": 4}, "properties": {"pixelSize": 100}, "fields": "pixelSize"}}) # Amount (Was E)

        # 2. Header Content
        today = project.data['date']
        inv_no = f"No: {datetime.date.today().strftime('%Y%m%d')}-001"
        
        # Row 1-2: Date & No (Right -> now Col D/Index 3)
        requests.append(self.update_cell(0, 3, today, align="RIGHT"))
        requests.append(self.update_cell(1, 3, inv_no, align="RIGHT"))
        
        # Row 4: Main Title (Center)
        # Merge A4:D4 (Index 0-4)
        title = doc_type
        requests.append({"mergeCells": {"range": {"sheetId": sheet_id_int, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 0, "endColumnIndex": 4}, "mergeType": "MERGE_ALL"}})
        requests.append(self.update_cell(3, 0, title, size=24, bold=True, align="CENTER"))

        # Row 6: Client (Left) vs Seller (Right)
        # Client at Col A (Index 0)
        requests.append(self.update_cell(5, 0, f"{project.data['client']} 御中", size=14, bold=True, align="LEFT", border="BOTTOM"))
        
        # Seller Info Block (Rows 6-12, Col C-D -> Index 2)
        s_row = 5
        s_col = 2 # Was 3(D) -> Now 2(C)
        requests.append(self.update_cell(s_row, s_col, SELLER_INFO['name'], bold=True))
        requests.append(self.update_cell(s_row+1, s_col, SELLER_INFO['rep_name']))
        requests.append(self.update_cell(s_row+2, s_col, SELLER_INFO['zip']))
        requests.append(self.update_cell(s_row+3, s_col, SELLER_INFO['address']))
        requests.append(self.update_cell(s_row+4, s_col, SELLER_INFO.get('address2', '')))
        requests.append(self.update_cell(s_row+5, s_col, SELLER_INFO['tel']))
        requests.append(self.update_cell(s_row+6, s_col, SELLER_INFO['email']))
        requests.append(self.update_cell(s_row+7, s_col, SELLER_INFO['reg_no']))

        # Row 9: Subject (Col A)
        requests.append(self.update_cell(8, 0, f"件名: {project.data['project_name']}"))
        requests.append(self.update_cell(9, 0, "下記の通りご請求申し上げます。"))

        # Row 14: Grand Total Amount (税込金額を表示)
        t_amount_row = 13 # Index 13 = Row 14
        total_with_tax = int(project.data['total'] * 1.1)
        requests.append(self.update_cell(t_amount_row, 0, "ご請求金額（税込）", size=16, bold=True, border="BOTTOM"))
        requests.append({"mergeCells": {"range": {"sheetId": sheet_id_int, "startRowIndex": t_amount_row, "endRowIndex": t_amount_row+1, "startColumnIndex": 1, "endColumnIndex": 4}, "mergeType": "MERGE_ALL"}})
        requests.append(self.update_cell(t_amount_row, 1, f"¥{total_with_tax:,}-", size=16, bold=True, align="CENTER", border="BOTTOM"))

        # Items Table (Start Row 17)
        t_start = 16 # Index 16 = Row 17
        # Headers (Col 0-3)
        headers = ["品番・品名", "数量", "単価", "金額"]
        for i, h in enumerate(headers):
            requests.append(self.update_cell(t_start, i, h, bold=True, bg_color={"red":0.9,"green":0.9,"blue":0.9}, border="FULL", align="CENTER"))
            
        # Items
        items = project.data['items']
        # Fill at least 15 rows for A4 look
        row_count = max(len(items), 8)
        
        current_row = t_start + 1
        for i in range(row_count):
            r = current_row + i
            style = {"border": "FULL"} # Full grid
            
            if i < len(items):
                item = items[i]
                requests.append(self.update_cell(r, 0, item['desc'], **style))
                requests.append(self.update_cell(r, 1, item['quantity'], align="CENTER", **style))
                requests.append(self.update_cell(r, 2, item['price'], align="RIGHT", format="NUMBER", **style))
                # Formula C*D -> Now B*C (Col indices 1 and 2, but in spreadsheet notation it's B and C)
                # Wait, Column A=0, B=1, C=2, D=3.
                # Qty is B(1), Price is C(2). Total is D(3).
                # Formula: =B{r+1}*C{r+1}
                requests.append(self.update_cell(r, 3, None, formula=f"=B{r+1}*C{r+1}", align="RIGHT", format="NUMBER", **style))
            else:
                # Empty rows with borders
                requests.append(self.update_cell(r, 0, "", **style))
                requests.append(self.update_cell(r, 1, "", **style))
                requests.append(self.update_cell(r, 2, "", **style))
                requests.append(self.update_cell(r, 3, "", **style))

        # Footer Totals (Right -> Col C,D / Indices 2,3)
        f_start = current_row + row_count
        
        # Subtotal (Label C, Value D)
        requests.append(self.update_cell(f_start, 2, "小計", bold=True, border="FULL"))
        requests.append(self.update_cell(f_start, 3, None, formula=f"=SUM(D{t_start+2}:D{f_start})", align="RIGHT", border="FULL", format="NUMBER"))
        
        # Tax
        requests.append(self.update_cell(f_start+1, 2, "消費税 (10%)", bold=True, border="FULL"))
        requests.append(self.update_cell(f_start+1, 3, None, formula=f"=D{f_start+1}*0.1", align="RIGHT", border="FULL", format="NUMBER"))
        
        # Total
        requests.append(self.update_cell(f_start+2, 2, "合計", bold=True, border="FULL"))
        requests.append(self.update_cell(f_start+2, 3, None, formula=f"=D{f_start+1}+D{f_start+2}", align="RIGHT", border="FULL", format="NUMBER"))

        # Bank Info (Left -> Col A / Index 0)
        requests.append(self.update_cell(f_start+1, 0, BANK_INFO, align="LEFT"))
        
        # Remarks Section (Bottom)
        r_start = f_start + 6
        requests.append(self.update_cell(r_start, 0, "【備考】", bold=True))
        # Merge A-D (0-4)
        requests.append({"mergeCells": {"range": {"sheetId": sheet_id_int, "startRowIndex": r_start+1, "endRowIndex": r_start+4, "startColumnIndex": 0, "endColumnIndex": 4}, "mergeType": "MERGE_ALL"}})
        requests.append(self.update_cell(r_start+1, 0, "スマホ対応", border="FULL", align="LEFT", valign="TOP"))

        self.service_sheets.spreadsheets().batchUpdate(spreadsheetId=sheet_id, body={'requests': requests}).execute()

    def apply_deposit_layout(self, sheet_id, project, deposit_amount, payment_due=""):
        """前受金請求書専用レイアウト"""
        requests = []
        sheet_id_int = 0

        # Hide Gridlines
        requests.append({
            "updateSheetProperties": {
                "properties": {
                    "sheetId": sheet_id_int,
                    "gridProperties": {"hideGridlines": True}
                },
                "fields": "gridProperties.hideGridlines"
            }
        })

        # Column Widths
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 1}, "properties": {"pixelSize": 350}, "fields": "pixelSize"}})
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 1, "endIndex": 2}, "properties": {"pixelSize": 60}, "fields": "pixelSize"}})
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 2, "endIndex": 3}, "properties": {"pixelSize": 100}, "fields": "pixelSize"}})
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 3, "endIndex": 4}, "properties": {"pixelSize": 100}, "fields": "pixelSize"}})

        # Header
        today = project.data['date']
        inv_no = f"No: {datetime.date.today().strftime('%Y%m%d')}-D01"

        requests.append(self.update_cell(0, 3, today, align="RIGHT"))
        requests.append(self.update_cell(1, 3, inv_no, align="RIGHT"))

        # Title
        requests.append({"mergeCells": {"range": {"sheetId": sheet_id_int, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 0, "endColumnIndex": 4}, "mergeType": "MERGE_ALL"}})
        requests.append(self.update_cell(3, 0, "前受金請求書", size=24, bold=True, align="CENTER"))

        # Client
        requests.append(self.update_cell(5, 0, f"{project.data['client']} 御中", size=14, bold=True, align="LEFT", border="BOTTOM"))

        # Seller Info
        s_row = 5
        s_col = 2
        requests.append(self.update_cell(s_row, s_col, SELLER_INFO['name'], bold=True))
        requests.append(self.update_cell(s_row+1, s_col, SELLER_INFO['rep_name']))
        requests.append(self.update_cell(s_row+2, s_col, SELLER_INFO['zip']))
        requests.append(self.update_cell(s_row+3, s_col, SELLER_INFO['address']))
        requests.append(self.update_cell(s_row+4, s_col, SELLER_INFO.get('address2', '')))
        requests.append(self.update_cell(s_row+5, s_col, SELLER_INFO['tel']))
        requests.append(self.update_cell(s_row+6, s_col, SELLER_INFO['email']))
        requests.append(self.update_cell(s_row+7, s_col, SELLER_INFO['reg_no']))

        # Subject
        requests.append(self.update_cell(8, 0, f"件名: {project.data['project_name']} 前受金"))
        requests.append(self.update_cell(9, 0, "下記の通りご請求申し上げます。"))

        # Grand Total (税込金額を表示)
        t_amount_row = 13
        deposit_with_tax = int(deposit_amount * 1.1)
        requests.append(self.update_cell(t_amount_row, 0, "ご請求金額（税込）", size=16, bold=True, border="BOTTOM"))
        requests.append({"mergeCells": {"range": {"sheetId": sheet_id_int, "startRowIndex": t_amount_row, "endRowIndex": t_amount_row+1, "startColumnIndex": 1, "endColumnIndex": 4}, "mergeType": "MERGE_ALL"}})
        requests.append(self.update_cell(t_amount_row, 1, f"¥{deposit_with_tax:,}-", size=16, bold=True, align="CENTER", border="BOTTOM"))

        # Items Table
        t_start = 16
        headers = ["品番・品名", "数量", "単価", "金額"]
        for i, h in enumerate(headers):
            requests.append(self.update_cell(t_start, i, h, bold=True, bg_color={"red":0.9,"green":0.9,"blue":0.9}, border="FULL", align="CENTER"))

        # Single Item: 前受金
        r = t_start + 1
        requests.append(self.update_cell(r, 0, f"{project.data['project_name']} 前受金として", border="FULL"))
        requests.append(self.update_cell(r, 1, 1, align="CENTER", border="FULL"))
        requests.append(self.update_cell(r, 2, deposit_amount, align="RIGHT", format="NUMBER", border="FULL"))
        requests.append(self.update_cell(r, 3, deposit_amount, align="RIGHT", format="NUMBER", border="FULL"))

        # Empty rows
        for i in range(2, 6):
            rr = t_start + i
            requests.append(self.update_cell(rr, 0, "", border="FULL"))
            requests.append(self.update_cell(rr, 1, "", border="FULL"))
            requests.append(self.update_cell(rr, 2, "", border="FULL"))
            requests.append(self.update_cell(rr, 3, "", border="FULL"))

        # Footer Totals
        f_start = t_start + 6
        requests.append(self.update_cell(f_start, 2, "小計", bold=True, border="FULL"))
        requests.append(self.update_cell(f_start, 3, deposit_amount, align="RIGHT", border="FULL", format="NUMBER"))

        tax = int(deposit_amount * 0.1)
        requests.append(self.update_cell(f_start+1, 2, "消費税 (10%)", bold=True, border="FULL"))
        requests.append(self.update_cell(f_start+1, 3, tax, align="RIGHT", border="FULL", format="NUMBER"))

        total_with_tax = deposit_amount + tax
        requests.append(self.update_cell(f_start+2, 2, "合計", bold=True, border="FULL"))
        requests.append(self.update_cell(f_start+2, 3, total_with_tax, align="RIGHT", border="FULL", format="NUMBER"))

        # Bank Info & Payment Due
        bank_with_due = BANK_INFO
        if payment_due:
            bank_with_due += f"\n\nお支払期限: {payment_due}"
        requests.append(self.update_cell(f_start+1, 0, bank_with_due, align="LEFT"))

        # Remarks
        r_start = f_start + 6
        requests.append(self.update_cell(r_start, 0, "【備考】", bold=True))
        requests.append({"mergeCells": {"range": {"sheetId": sheet_id_int, "startRowIndex": r_start+1, "endRowIndex": r_start+4, "startColumnIndex": 0, "endColumnIndex": 4}, "mergeType": "MERGE_ALL"}})
        requests.append(self.update_cell(r_start+1, 0, "本請求書は前受金（着手金）のご請求となります。", border="FULL", align="LEFT", valign="TOP"))

        self.service_sheets.spreadsheets().batchUpdate(spreadsheetId=sheet_id, body={'requests': requests}).execute()

    def apply_quote_layout(self, sheet_id, project, valid_until=""):
        """見積書専用レイアウト（有効期限付き）"""
        requests = []
        sheet_id_int = 0

        # Hide Gridlines
        requests.append({
            "updateSheetProperties": {
                "properties": {
                    "sheetId": sheet_id_int,
                    "gridProperties": {"hideGridlines": True}
                },
                "fields": "gridProperties.hideGridlines"
            }
        })

        # Column Widths
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 1}, "properties": {"pixelSize": 350}, "fields": "pixelSize"}})
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 1, "endIndex": 2}, "properties": {"pixelSize": 60}, "fields": "pixelSize"}})
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 2, "endIndex": 3}, "properties": {"pixelSize": 100}, "fields": "pixelSize"}})
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 3, "endIndex": 4}, "properties": {"pixelSize": 100}, "fields": "pixelSize"}})

        # Header
        today = project.data['date']
        inv_no = f"No: {datetime.date.today().strftime('%Y%m%d')}-Q01"

        requests.append(self.update_cell(0, 3, today, align="RIGHT"))
        requests.append(self.update_cell(1, 3, inv_no, align="RIGHT"))

        # Title
        requests.append({"mergeCells": {"range": {"sheetId": sheet_id_int, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 0, "endColumnIndex": 4}, "mergeType": "MERGE_ALL"}})
        requests.append(self.update_cell(3, 0, "御 見 積 書", size=24, bold=True, align="CENTER"))

        # Client
        requests.append(self.update_cell(5, 0, f"{project.data['client']} 御中", size=14, bold=True, align="LEFT", border="BOTTOM"))

        # Seller Info
        s_row = 5
        s_col = 2
        requests.append(self.update_cell(s_row, s_col, SELLER_INFO['name'], bold=True))
        requests.append(self.update_cell(s_row+1, s_col, SELLER_INFO['rep_name']))
        requests.append(self.update_cell(s_row+2, s_col, SELLER_INFO['zip']))
        requests.append(self.update_cell(s_row+3, s_col, SELLER_INFO['address']))
        requests.append(self.update_cell(s_row+4, s_col, SELLER_INFO.get('address2', '')))
        requests.append(self.update_cell(s_row+5, s_col, SELLER_INFO['tel']))
        requests.append(self.update_cell(s_row+6, s_col, SELLER_INFO['email']))
        requests.append(self.update_cell(s_row+7, s_col, SELLER_INFO['reg_no']))

        # Subject
        requests.append(self.update_cell(8, 0, f"件名: {project.data['project_name']}"))
        requests.append(self.update_cell(9, 0, "下記の通りお見積もり申し上げます。"))

        # Grand Total (税込金額を表示)
        t_amount_row = 13
        total_with_tax = int(project.data['total'] * 1.1)
        requests.append(self.update_cell(t_amount_row, 0, "お見積金額（税込）", size=16, bold=True, border="BOTTOM"))
        requests.append({"mergeCells": {"range": {"sheetId": sheet_id_int, "startRowIndex": t_amount_row, "endRowIndex": t_amount_row+1, "startColumnIndex": 1, "endColumnIndex": 4}, "mergeType": "MERGE_ALL"}})
        requests.append(self.update_cell(t_amount_row, 1, f"¥{total_with_tax:,}-", size=16, bold=True, align="CENTER", border="BOTTOM"))

        # Items Table
        t_start = 16
        headers = ["品番・品名", "数量", "単価", "金額"]
        for i, h in enumerate(headers):
            requests.append(self.update_cell(t_start, i, h, bold=True, bg_color={"red":0.9,"green":0.9,"blue":0.9}, border="FULL", align="CENTER"))

        items = project.data['items']
        row_count = max(len(items), 8)

        current_row = t_start + 1
        for i in range(row_count):
            r = current_row + i
            style = {"border": "FULL"}

            if i < len(items):
                item = items[i]
                requests.append(self.update_cell(r, 0, item['desc'], **style))
                requests.append(self.update_cell(r, 1, item['quantity'], align="CENTER", **style))
                requests.append(self.update_cell(r, 2, item['price'], align="RIGHT", format="NUMBER", **style))
                requests.append(self.update_cell(r, 3, None, formula=f"=B{r+1}*C{r+1}", align="RIGHT", format="NUMBER", **style))
            else:
                requests.append(self.update_cell(r, 0, "", **style))
                requests.append(self.update_cell(r, 1, "", **style))
                requests.append(self.update_cell(r, 2, "", **style))
                requests.append(self.update_cell(r, 3, "", **style))

        # Footer Totals
        f_start = current_row + row_count

        requests.append(self.update_cell(f_start, 2, "小計", bold=True, border="FULL"))
        requests.append(self.update_cell(f_start, 3, None, formula=f"=SUM(D{t_start+2}:D{f_start})", align="RIGHT", border="FULL", format="NUMBER"))

        requests.append(self.update_cell(f_start+1, 2, "消費税 (10%)", bold=True, border="FULL"))
        requests.append(self.update_cell(f_start+1, 3, None, formula=f"=D{f_start+1}*0.1", align="RIGHT", border="FULL", format="NUMBER"))

        requests.append(self.update_cell(f_start+2, 2, "合計", bold=True, border="FULL"))
        requests.append(self.update_cell(f_start+2, 3, None, formula=f"=D{f_start+1}+D{f_start+2}", align="RIGHT", border="FULL", format="NUMBER"))

        # Valid Until (有効期限)
        validity_text = f"有効期限: {valid_until}" if valid_until else ""
        requests.append(self.update_cell(f_start+1, 0, validity_text, align="LEFT"))

        # Remarks (見積書用備考)
        r_start = f_start + 6
        requests.append(self.update_cell(r_start, 0, "【備考】", bold=True))
        requests.append({"mergeCells": {"range": {"sheetId": sheet_id_int, "startRowIndex": r_start+1, "endRowIndex": r_start+4, "startColumnIndex": 0, "endColumnIndex": 4}, "mergeType": "MERGE_ALL"}})
        requests.append(self.update_cell(r_start+1, 0, "スマホ対応", border="FULL", align="LEFT", valign="TOP"))

        self.service_sheets.spreadsheets().batchUpdate(spreadsheetId=sheet_id, body={'requests': requests}).execute()

    def apply_invoice_layout(self, sheet_id, project, payment_due=""):
        """請求書専用レイアウト（支払期限付き）"""
        requests = []
        sheet_id_int = 0

        # Hide Gridlines
        requests.append({
            "updateSheetProperties": {
                "properties": {
                    "sheetId": sheet_id_int,
                    "gridProperties": {"hideGridlines": True}
                },
                "fields": "gridProperties.hideGridlines"
            }
        })

        # Column Widths
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 1}, "properties": {"pixelSize": 350}, "fields": "pixelSize"}})
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 1, "endIndex": 2}, "properties": {"pixelSize": 60}, "fields": "pixelSize"}})
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 2, "endIndex": 3}, "properties": {"pixelSize": 100}, "fields": "pixelSize"}})
        requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id_int, "dimension": "COLUMNS", "startIndex": 3, "endIndex": 4}, "properties": {"pixelSize": 100}, "fields": "pixelSize"}})

        # Header
        today = project.data['date']
        inv_no = f"No: {datetime.date.today().strftime('%Y%m%d')}-I01"

        requests.append(self.update_cell(0, 3, today, align="RIGHT"))
        requests.append(self.update_cell(1, 3, inv_no, align="RIGHT"))

        # Title
        requests.append({"mergeCells": {"range": {"sheetId": sheet_id_int, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 0, "endColumnIndex": 4}, "mergeType": "MERGE_ALL"}})
        requests.append(self.update_cell(3, 0, "請 求 書", size=24, bold=True, align="CENTER"))

        # Client
        requests.append(self.update_cell(5, 0, f"{project.data['client']} 御中", size=14, bold=True, align="LEFT", border="BOTTOM"))

        # Seller Info
        s_row = 5
        s_col = 2
        requests.append(self.update_cell(s_row, s_col, SELLER_INFO['name'], bold=True))
        requests.append(self.update_cell(s_row+1, s_col, SELLER_INFO['rep_name']))
        requests.append(self.update_cell(s_row+2, s_col, SELLER_INFO['zip']))
        requests.append(self.update_cell(s_row+3, s_col, SELLER_INFO['address']))
        requests.append(self.update_cell(s_row+4, s_col, SELLER_INFO.get('address2', '')))
        requests.append(self.update_cell(s_row+5, s_col, SELLER_INFO['tel']))
        requests.append(self.update_cell(s_row+6, s_col, SELLER_INFO['email']))
        requests.append(self.update_cell(s_row+7, s_col, SELLER_INFO['reg_no']))

        # Subject
        requests.append(self.update_cell(8, 0, f"件名: {project.data['project_name']}"))
        requests.append(self.update_cell(9, 0, "下記の通りご請求申し上げます。"))

        # Grand Total (税込金額を表示)
        t_amount_row = 13
        total_with_tax = int(project.data['total'] * 1.1)
        requests.append(self.update_cell(t_amount_row, 0, "ご請求金額（税込）", size=16, bold=True, border="BOTTOM"))
        requests.append({"mergeCells": {"range": {"sheetId": sheet_id_int, "startRowIndex": t_amount_row, "endRowIndex": t_amount_row+1, "startColumnIndex": 1, "endColumnIndex": 4}, "mergeType": "MERGE_ALL"}})
        requests.append(self.update_cell(t_amount_row, 1, f"¥{total_with_tax:,}-", size=16, bold=True, align="CENTER", border="BOTTOM"))

        # Items Table
        t_start = 16
        headers = ["品番・品名", "数量", "単価", "金額"]
        for i, h in enumerate(headers):
            requests.append(self.update_cell(t_start, i, h, bold=True, bg_color={"red":0.9,"green":0.9,"blue":0.9}, border="FULL", align="CENTER"))

        items = project.data['items']
        row_count = max(len(items), 8)

        current_row = t_start + 1
        for i in range(row_count):
            r = current_row + i
            style = {"border": "FULL"}

            if i < len(items):
                item = items[i]
                requests.append(self.update_cell(r, 0, item['desc'], **style))
                requests.append(self.update_cell(r, 1, item['quantity'], align="CENTER", **style))
                requests.append(self.update_cell(r, 2, item['price'], align="RIGHT", format="NUMBER", **style))
                requests.append(self.update_cell(r, 3, None, formula=f"=B{r+1}*C{r+1}", align="RIGHT", format="NUMBER", **style))
            else:
                requests.append(self.update_cell(r, 0, "", **style))
                requests.append(self.update_cell(r, 1, "", **style))
                requests.append(self.update_cell(r, 2, "", **style))
                requests.append(self.update_cell(r, 3, "", **style))

        # Footer Totals
        f_start = current_row + row_count

        requests.append(self.update_cell(f_start, 2, "小計", bold=True, border="FULL"))
        requests.append(self.update_cell(f_start, 3, None, formula=f"=SUM(D{t_start+2}:D{f_start})", align="RIGHT", border="FULL", format="NUMBER"))

        requests.append(self.update_cell(f_start+1, 2, "消費税 (10%)", bold=True, border="FULL"))
        requests.append(self.update_cell(f_start+1, 3, None, formula=f"=D{f_start+1}*0.1", align="RIGHT", border="FULL", format="NUMBER"))

        requests.append(self.update_cell(f_start+2, 2, "合計", bold=True, border="FULL"))
        requests.append(self.update_cell(f_start+2, 3, None, formula=f"=D{f_start+1}+D{f_start+2}", align="RIGHT", border="FULL", format="NUMBER"))

        # Bank Info & Payment Due
        bank_with_due = BANK_INFO
        if payment_due:
            bank_with_due += f"\n\nお支払期限: {payment_due}"
        requests.append(self.update_cell(f_start+1, 0, bank_with_due, align="LEFT"))

        # Remarks
        r_start = f_start + 6
        requests.append(self.update_cell(r_start, 0, "【備考】", bold=True))
        requests.append({"mergeCells": {"range": {"sheetId": sheet_id_int, "startRowIndex": r_start+1, "endRowIndex": r_start+4, "startColumnIndex": 0, "endColumnIndex": 4}, "mergeType": "MERGE_ALL"}})
        requests.append(self.update_cell(r_start+1, 0, "スマホ対応", border="FULL", align="LEFT", valign="TOP"))

        self.service_sheets.spreadsheets().batchUpdate(spreadsheetId=sheet_id, body={'requests': requests}).execute()

    def update_cell(self, row, col, val, size=10, bold=False, align="LEFT", valign="BOTTOM", border=None, bg_color=None, format=None, formula=None):
        cell_data = {
            "userEnteredFormat": {
                "textFormat": {"fontSize": size, "bold": bold}, 
                "horizontalAlignment": align,
                "verticalAlignment": valign
            }
        }
        
        if val is not None: 
            cell_data["userEnteredValue"] = {"stringValue": str(val)} if isinstance(val, str) else {"numberValue": val}
        if formula: cell_data["userEnteredValue"] = {"formulaValue": formula}
        
        if border == "FULL":
            bs = {"style": "SOLID", "width": 1}
            cell_data["userEnteredFormat"]["borders"] = {"top": bs, "bottom": bs, "left": bs, "right": bs}
        elif border == "BOTTOM":
             cell_data["userEnteredFormat"]["borders"] = {"bottom": {"style": "SOLID", "width": 1}}
             
        if bg_color:
            cell_data["userEnteredFormat"]["backgroundColor"] = bg_color
            
        if format == "NUMBER":
             cell_data["userEnteredFormat"]["numberFormat"] = {"type": "NUMBER", "pattern": "#,##0"}

        return {
            "updateCells": {
                "rows": [{"values": [cell_data]}],
                "range": {"sheetId": 0, "startRowIndex": row, "endRowIndex": row+1, "startColumnIndex": col, "endColumnIndex": col+1},
                "fields": "userEnteredValue,userEnteredFormat"
            }
        }

    def create_doc(self, title):
        if not self.service_docs: return None
        doc = self.service_docs.documents().create(body={'title': title}).execute()
        return doc.get('documentId')
        
    def update_doc_text(self, doc_id, text):
        if not self.service_docs: return
        requests = [{'insertText': {'location': {'index': 1}, 'text': text}}]
        self.service_docs.documents().batchUpdate(documentId=doc_id, body={'requests': requests}).execute()

    def format_contract(self, doc_id):
        """契約書のGoogle Docsをフォーマット"""
        if not self.service_docs: return
        doc = self.service_docs.documents().get(documentId=doc_id).execute()
        content = doc.get('body', {}).get('content', [])

        requests = []

        # ページ余白設定（上下左右25mm）
        requests.append({
            'updateDocumentStyle': {
                'documentStyle': {
                    'marginTop': {'magnitude': 71, 'unit': 'PT'},
                    'marginBottom': {'magnitude': 71, 'unit': 'PT'},
                    'marginLeft': {'magnitude': 71, 'unit': 'PT'},
                    'marginRight': {'magnitude': 71, 'unit': 'PT'},
                },
                'fields': 'marginTop,marginBottom,marginLeft,marginRight'
            }
        })

        # 本文全体のフォント設定（明朝体 10.5pt）
        full_text = ""
        for elem in content:
            if 'paragraph' in elem:
                for run in elem['paragraph'].get('elements', []):
                    if 'textRun' in run:
                        full_text += run['textRun']['content']

        body_end = 1 + len(full_text) - 1  # -1 for trailing newline
        if body_end > 2:
            requests.append({
                'updateTextStyle': {
                    'range': {'startIndex': 1, 'endIndex': body_end},
                    'textStyle': {
                        'fontSize': {'magnitude': 10.5, 'unit': 'PT'},
                        'weightedFontFamily': {'fontFamily': 'MS Mincho', 'weight': 400},
                    },
                    'fields': 'fontSize,weightedFontFamily'
                }
            })

        # 各段落を解析してフォーマット適用
        for elem in content:
            if 'paragraph' not in elem:
                continue
            para = elem['paragraph']
            elements = para.get('elements', [])
            if not elements:
                continue

            start = elements[0].get('startIndex', 0)
            end = elements[-1].get('endIndex', start)
            text_content = ""
            for run in elements:
                if 'textRun' in run:
                    text_content += run['textRun']['content']
            text_stripped = text_content.strip()

            # タイトル行（ホームページ制作契約書）
            if 'ホームページ制作契約書' in text_stripped:
                requests.append({
                    'updateTextStyle': {
                        'range': {'startIndex': start, 'endIndex': end},
                        'textStyle': {
                            'bold': True,
                            'fontSize': {'magnitude': 16, 'unit': 'PT'},
                        },
                        'fields': 'bold,fontSize'
                    }
                })
                requests.append({
                    'updateParagraphStyle': {
                        'range': {'startIndex': start, 'endIndex': end},
                        'paragraphStyle': {
                            'alignment': 'CENTER',
                            'spaceBelow': {'magnitude': 12, 'unit': 'PT'},
                        },
                        'fields': 'alignment,spaceBelow'
                    }
                })

            # 条文見出し（第１条〜第１４条）
            elif text_stripped.startswith('第') and '条' in text_stripped[:6]:
                requests.append({
                    'updateTextStyle': {
                        'range': {'startIndex': start, 'endIndex': end},
                        'textStyle': {'bold': True},
                        'fields': 'bold'
                    }
                })
                requests.append({
                    'updateParagraphStyle': {
                        'range': {'startIndex': start, 'endIndex': end},
                        'paragraphStyle': {
                            'spaceAbove': {'magnitude': 10, 'unit': 'PT'},
                            'spaceBelow': {'magnitude': 4, 'unit': 'PT'},
                        },
                        'fields': 'spaceAbove,spaceBelow'
                    }
                })

            # 署名欄（甲/乙）
            elif text_stripped.startswith('甲（') or text_stripped.startswith('乙（'):
                requests.append({
                    'updateTextStyle': {
                        'range': {'startIndex': start, 'endIndex': end},
                        'textStyle': {'bold': True},
                        'fields': 'bold'
                    }
                })
                requests.append({
                    'updateParagraphStyle': {
                        'range': {'startIndex': start, 'endIndex': end},
                        'paragraphStyle': {
                            'spaceAbove': {'magnitude': 14, 'unit': 'PT'},
                        },
                        'fields': 'spaceAbove'
                    }
                })

            # ㊞を含む行（右寄せ）
            elif '㊞' in text_stripped:
                requests.append({
                    'updateParagraphStyle': {
                        'range': {'startIndex': start, 'endIndex': end},
                        'paragraphStyle': {
                            'alignment': 'END',
                        },
                        'fields': 'alignment'
                    }
                })

            # 「本契約締結の証として」行
            elif '本契約締結の証として' in text_stripped:
                requests.append({
                    'updateParagraphStyle': {
                        'range': {'startIndex': start, 'endIndex': end},
                        'paragraphStyle': {
                            'spaceAbove': {'magnitude': 16, 'unit': 'PT'},
                        },
                        'fields': 'spaceAbove'
                    }
                })

        if requests:
            self.service_docs.documents().batchUpdate(
                documentId=doc_id, body={'requests': requests}).execute()

    def export_pdf(self, file_id, output_path):
        if not self.service_drive: return
        try:
            request = self.service_drive.files().export_media(
                fileId=file_id, mimeType='application/pdf')
            with open(output_path, 'wb') as f:
                f.write(request.execute())
            print(f"Downloaded PDF: {output_path}")
        except Exception as e:
            print(f"PDF Export Failed: {e}")

class Project:
    def __init__(self, client, project_name):
        self.client = client
        self.project_name = project_name
        # Use Client name only for folder (same company = same folder)
        folder_name = client.replace("/", "_").replace(" ", "")
        self.path = os.path.join(OUTPUT_DIR, folder_name)
        self.info_file = os.path.join(self.path, "info.json")
        self.data = {} # Will load or set new
    def save(self):
        os.makedirs(self.path, exist_ok=True)
        # 1. Info JSON
        with open(self.info_file, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=4, ensure_ascii=False)
            
        # 2. Requirements Memo
        memo_path = os.path.join(self.path, "requirements.md")
        with open(memo_path, 'w', encoding='utf-8') as f:
            f.write(f"# 要件定義メモ\n\n")
            f.write(f"- クライアント: {self.data.get('client')}\n")
            f.write(f"- 案件名: {self.data.get('project_name')}\n")
            f.write(f"- 日付: {self.data.get('date')}\n\n")
            f.write(f"## 見積もり項目\n")
            for item in self.data.get('items', []):
                price = f"¥{item['price']:,}"
                f.write(f"- {item['desc']} x{item['quantity']} : {price}\n")
            f.write(f"\n**合計金額: ¥{self.data.get('total', 0):,}**\n")
        
        print(f"Data & Memo saved to: {self.path}")

    def load(self):
        if os.path.exists(self.info_file):
            with open(self.info_file, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
            return True
        return False

def get_ai_response(prompt):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not HAS_GEMINI or not api_key:
        print("Using Mock AI Parser")
    if not HAS_GEMINI or not api_key:
        print("Using Mock AI Parser")
        import re
        
        intent = "create_project"
        if "見積" in prompt: intent = "quote"
        if "請求" in prompt: intent = "invoice"
        if "契約" in prompt: intent = "contract"
        
        # Extract Amount (e.g. 50万)
        amount = 0
        amount_match = re.search(r'(\d+)万', prompt)
        if amount_match:
            amount = int(amount_match.group(1)) * 10000
            
        # Tax Included Logic (税込)
        if "税込" in prompt and amount > 0:
            amount = int(amount / 1.1)
            
        # Extract Client (e.g. OO宛)
        client = "株式会社Mock"
        client_match = re.search(r'(.+?)(?:様|御中|宛|で)', prompt)
        if client_match:
            # Clean up obvious non-name words if they appear at start (simplified)
            raw = client_match.group(1).strip()
            if "、" in raw: raw = raw.split("、")[-1]
            client = raw
        else:
             # Fallback: Check for start of string + space (e.g. "山谷商事 30万")
             fallback = re.search(r'^(.+?)[\s　]', prompt)
             if fallback:
                 candidate = fallback.group(1).strip()
                 # Filter out common non-client words just in case
                 if "Web" not in candidate and "LP" not in candidate:
                     client = candidate
             
        # Extract Menu
        menu = "Webサイト制作"
        project_name = "Web制作案件"
        if "LP" in prompt: 
            menu = "LP制作"
            project_name = "LP制作案件"
        elif "Studio" in prompt or "スタジオ" in prompt:
            menu = "Studio制作"
            project_name = "Studio制作案件"
        elif "コーディング" in prompt and "のみ" in prompt:
            menu = "ウェブコーディング"
            project_name = "コーディング案件"
        elif "デザイン" in prompt and "のみ" in prompt:
            menu = "ウェブデザイン"
            project_name = "Webデザイン案件"
        elif "コーディング" in prompt:
             menu = "ウェブコーディング"
             project_name = "コーディング案件"
        
        # Extract Exclusions from Prompt
        excluded = []
        if "検証" in prompt and "なし" in prompt: excluded.append("検証・デバッグ費")
        if "デバッグ" in prompt and "なし" in prompt: excluded.append("検証・デバッグ費")
        if "ディレクション" in prompt and "なし" in prompt: excluded.append("ディレクション費")
        if ("アニメーション" in prompt or "JS" in prompt) and "なし" in prompt:
            excluded.append("JS/アニメーション実装")
            
        # Check for Deposit/Down Payment (前受金/着手金)
        # Check for Deposit/Down Payment (前受金/着手金)
        if "前受金" in prompt or "着手金" in prompt:
            intent = "create_project" # Force regenerate to overwrite existing
            project_name = "前受金ご請求"
            # Use extracted amount from earlier
            deposit_amount = amount 
            if deposit_amount == 0:
                 # Retry extraction if '万' wasn't used or parse error
                 pass 
            
            # Override budget_matcher logic for deposit
            menu = "Deposit" # Dummy
            # Manually construct plan
            return {
                "client": client,
                "project_name": project_name,
                "items": [{"desc": "WEBサイト制作 前受金として", "price": deposit_amount, "quantity": 1}],
                "total": deposit_amount,
                "intent": intent
            }
        
        # Extract Page Count (e.g. 2P)
        page_count = None
        page_match = re.search(r'(\d+)[PpＰｐページ]', prompt)
        if page_match:
            page_count = int(page_match.group(1))

        return {
            "intent": intent, 
            "client": client, 
            "project_name": project_name, 
            "suggested_menu": menu, 
            "amount": amount,
            "excluded": excluded,
            "page_count": page_count
        }

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    system_prompt = """
    Parse user request.
    Intents: create_project, quote, contract, invoice.
    Extract: client, project_name, suggested_menu (e.g. LP制作, Webサイト制作), amount (if budget specified).
    Return JSON.
    """
    try:
        response = model.generate_content(f"{system_prompt}\nUser: {prompt}")
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except:
        return None

def main_interactive():
    """新しい対話形式のメイン関数"""
    services = GoogleServices()
    if not services.service_sheets:
        print("Google認証が必要です。setup_auth.pyを実行してください。")
        return

    print("=" * 50)
    print("   AI書類生成システム")
    print("=" * 50)

    # 1. 書類種別選択
    doc_types = select_document_types()
    print(f"\n選択された書類: {', '.join(doc_types)}")

    # 2. プロジェクト情報収集
    info = collect_project_info()

    # 3. 日付情報収集
    dates = collect_date_info(doc_types)

    # 4. 価格計算
    overrides = {}
    if info.get('page_count'):
        overrides['sub_pages'] = max(0, info['page_count'] - 1)

    pricing_plan = budget_matcher.get_pricing_plan(
        info['menu'],
        info['budget'],
        excluded_items=[],
        overrides=overrides
    )

    # プロジェクトデータ作成
    project = Project(info['client'], info['project_name'])
    project.data = {
        "client": info['client'],
        "project_name": info['project_name'],
        "date": dates['issue_date'],
        "items": [i for i in pricing_plan['items'] if i['quantity'] > 0],
        "total": pricing_plan['total']
    }

    # 確認表示
    print("\n" + "=" * 50)
    print("   プロジェクト内容確認")
    print("=" * 50)
    print(f"会社名: {project.data['client']}")
    print(f"案件名: {project.data['project_name']}")
    print(f"合計金額: ¥{project.data['total']:,}")
    print("\n【内訳】")
    for item in project.data['items']:
        print(f"  - {item['desc']} x{item['quantity']} : ¥{item['price']:,}")

    if "deposit" in doc_types:
        deposit_ratio = dates.get('deposit_ratio', 0.5)
        deposit_amount = int(project.data['total'] * deposit_ratio)
        print(f"\n【前受金】 ¥{deposit_amount:,} ({int(deposit_ratio*100)}%)")

    print("=" * 50)

    # 確認
    confirm = input("\nこの内容で書類を作成しますか？ (y/n): ")
    if confirm.lower() != 'y':
        print("キャンセルされました。")
        return

    # データ保存
    project.save()
    print(f"プロジェクトデータを保存しました: {project.path}")

    # 書類生成
    generated_files = []

    # 見積書
    if "quote" in doc_types:
        print("\n[見積書を作成中...]")
        title = f"御見積書_{project.data['client']}"
        sid = services.create_sheet(title)
        if sid:
            services.apply_quote_layout(sid, project, dates.get('quote_valid_until', ''))
            print(f"  シート作成: https://docs.google.com/spreadsheets/d/{sid}")

            date_str = datetime.date.today().strftime('%Y%m%d')
            safe_proj = info['project_name'].replace("/", "_").replace(" ", "")
            pdf_name = f"{date_str}_{info['client']}_{safe_proj}_見積書.pdf"
            pdf_path = os.path.join(project.path, pdf_name)
            services.export_pdf(sid, pdf_path)
            generated_files.append(("見積書", pdf_path))

    # 請求書
    if "invoice" in doc_types:
        print("\n[請求書を作成中...]")
        title = f"請求書_{project.data['client']}"
        sid = services.create_sheet(title)
        if sid:
            services.apply_invoice_layout(sid, project, dates.get('payment_due', ''))
            print(f"  シート作成: https://docs.google.com/spreadsheets/d/{sid}")

            date_str = datetime.date.today().strftime('%Y%m%d')
            safe_proj = info['project_name'].replace("/", "_").replace(" ", "")
            pdf_name = f"{date_str}_{info['client']}_{safe_proj}_請求書.pdf"
            pdf_path = os.path.join(project.path, pdf_name)
            services.export_pdf(sid, pdf_path)
            generated_files.append(("請求書", pdf_path))

    # 前受金請求書
    if "deposit" in doc_types:
        print("\n[前受金請求書を作成中...]")
        deposit_ratio = dates.get('deposit_ratio', 0.5)
        deposit_amount = int(project.data['total'] * deposit_ratio)

        title = f"前受金請求書_{project.data['client']}"
        sid = services.create_sheet(title)
        if sid:
            services.apply_deposit_layout(sid, project, deposit_amount, dates.get('payment_due', ''))
            print(f"  シート作成: https://docs.google.com/spreadsheets/d/{sid}")

            date_str = datetime.date.today().strftime('%Y%m%d')
            safe_proj = info['project_name'].replace("/", "_").replace(" ", "")
            pdf_name = f"{date_str}_{info['client']}_{safe_proj}_前受金請求書.pdf"
            pdf_path = os.path.join(project.path, pdf_name)
            services.export_pdf(sid, pdf_path)
            generated_files.append(("前受金請求書", pdf_path))

    # 契約書
    if "contract" in doc_types:
        print("\n[契約書・仕様書を作成中...]")
        generate_contract_docs(services, project, generated_files)

    # 完了サマリー
    print("\n" + "=" * 50)
    print("   生成完了")
    print("=" * 50)
    print(f"保存先: {project.path}")
    print("\n【生成された書類】")
    for doc_name, path in generated_files:
        print(f"  - {doc_name}: {os.path.basename(path)}")


def ai_conversation_mode():
    """シンプルな対話形式で書類を生成（API不要）"""
    services = GoogleServices()

    if not services.service_sheets:
        print("Google認証が必要です。setup_auth.pyを実行してください。")
        return

    print("=" * 50)
    print("   書類作成アシスタント")
    print("   （'終了' または 'quit' で終了）")
    print("=" * 50)

    # 収集するデータを初期化
    collected_data = {
        "client": None,
        "project_name": None,
        "menu": None,
        "budget": 0,
        "page_count": None,
        "documents": [],
        "deposit_ratio": 0.5
    }

    print("\nこんにちは！書類作成をお手伝いします。")
    print("必要な情報を順番にお聞きしますね。\n")

    # 1. 書類の種類を確認
    print("【作成したい書類を選んでください】")
    print("1. 見積書")
    print("2. 請求書")
    print("3. 契約書")
    print("4. 前受金請求書")
    print("（複数選択可: 例 1,2,3 または 1 2 3）")

    while True:
        doc_input = input("\n選択: ").strip()
        if doc_input.lower() in ['終了', 'quit', 'exit', 'q']:
            print("\nまたのご利用をお待ちしております！")
            return

        doc_map = {"1": "quote", "2": "invoice", "3": "contract", "4": "deposit"}
        selected = []
        for char in doc_input.replace(",", " ").split():
            if char in doc_map:
                selected.append(doc_map[char])

        if selected:
            collected_data["documents"] = selected
            doc_names = {"quote": "見積書", "invoice": "請求書", "contract": "契約書", "deposit": "前受金請求書"}
            print(f"→ {', '.join([doc_names[d] for d in selected])} を作成しますね！")
            break
        else:
            print("1〜4の数字で選んでください")

    # 2. クライアント名
    print("\n【クライアント情報】")
    while True:
        client_input = input("会社名（クライアント名）: ").strip()
        if client_input.lower() in ['終了', 'quit', 'exit', 'q']:
            print("\nまたのご利用をお待ちしております！")
            return
        if client_input:
            collected_data["client"] = client_input
            break
        print("会社名を入力してください")

    # 3. 案件名
    while True:
        project_input = input("案件名: ").strip()
        if project_input.lower() in ['終了', 'quit', 'exit', 'q']:
            print("\nまたのご利用をお待ちしております！")
            return
        if project_input:
            collected_data["project_name"] = project_input
            break
        print("案件名を入力してください")

    # 4. 制作メニュー
    print("\n【制作内容を選んでください】")
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

    while True:
        menu_input = input("選択 (1-5): ").strip()
        if menu_input.lower() in ['終了', 'quit', 'exit', 'q']:
            print("\nまたのご利用をお待ちしております！")
            return
        if menu_input in menu_map:
            collected_data["menu"] = menu_map[menu_input]
            print(f"→ {menu_map[menu_input]} ですね！")
            break
        print("1〜5の数字で選んでください")

    # 5. 予算（任意）
    print("\n【予算について】")
    budget_input = input("予算があれば入力してください（例: 50万 or 500000、なければ空欄でEnter）: ").strip()
    if budget_input.lower() in ['終了', 'quit', 'exit', 'q']:
        print("\nまたのご利用をお待ちしております！")
        return

    if budget_input:
        match = re.search(r'(\d+)万', budget_input)
        if match:
            collected_data["budget"] = int(match.group(1)) * 10000
        else:
            try:
                collected_data["budget"] = int(budget_input.replace(",", ""))
            except:
                pass

        if "税込" in budget_input and collected_data["budget"] > 0:
            collected_data["budget"] = int(collected_data["budget"] / 1.1)

        if collected_data["budget"] > 0:
            print(f"→ 予算 ¥{collected_data['budget']:,} で調整します！")
    else:
        print("→ 標準価格で算出します！")

    # 6. ページ数（任意）
    page_input = input("ページ数があれば入力してください（空欄でデフォルト）: ").strip()
    if page_input.lower() in ['終了', 'quit', 'exit', 'q']:
        print("\nまたのご利用をお待ちしております！")
        return

    if page_input:
        try:
            collected_data["page_count"] = int(re.sub(r'[PpＰｐページ]', '', page_input))
            print(f"→ {collected_data['page_count']}ページで計算します！")
        except:
            pass

    # 7. 前受金の割合（前受金請求書を選択した場合）
    if "deposit" in collected_data["documents"]:
        print("\n【前受金について】")
        deposit_input = input("前受金の割合を入力してください（例: 50 で50%、空欄で50%）: ").strip()
        if deposit_input:
            try:
                collected_data["deposit_ratio"] = int(deposit_input) / 100
                print(f"→ 前受金は総額の{int(collected_data['deposit_ratio']*100)}%ですね！")
            except:
                pass

    # 確認画面
    print("\n" + "=" * 50)
    print("   入力内容の確認")
    print("=" * 50)
    doc_names = {"quote": "見積書", "invoice": "請求書", "contract": "契約書", "deposit": "前受金請求書"}
    print(f"作成書類: {', '.join([doc_names[d] for d in collected_data['documents']])}")
    print(f"会社名: {collected_data['client']}")
    print(f"案件名: {collected_data['project_name']}")
    print(f"制作内容: {collected_data['menu']}")
    if collected_data['budget']:
        print(f"予算: ¥{collected_data['budget']:,}")
    if collected_data['page_count']:
        print(f"ページ数: {collected_data['page_count']}ページ")
    if "deposit" in collected_data['documents']:
        print(f"前受金割合: {int(collected_data['deposit_ratio']*100)}%")
    print("=" * 50)

    confirm = input("\nこの内容で書類を生成しますか？ (y/n): ").strip().lower()
    if confirm == 'y':
        generate_documents_from_ai(services, collected_data)
    else:
        print("\nキャンセルしました。最初からやり直す場合は再度起動してください。")


def generate_documents_from_ai(services, data):
    """AIから受け取ったデータで書類を生成"""
    print("\n" + "=" * 50)
    print("   書類生成開始")
    print("=" * 50)

    # データ準備
    client_name = data.get("client", "株式会社サンプル")
    project_name = data.get("project_name", "Web制作案件")
    menu = data.get("menu", "Webサイト制作")
    budget = data.get("budget", 0)
    page_count = data.get("page_count")
    doc_types = data.get("documents", ["quote"])
    deposit_ratio = data.get("deposit_ratio", 0.5)

    # 価格計算
    overrides = {}
    if page_count:
        overrides['sub_pages'] = max(0, page_count - 1)

    pricing_plan = budget_matcher.get_pricing_plan(
        menu,
        budget,
        excluded_items=[],
        overrides=overrides
    )

    # プロジェクト作成
    project = Project(client_name, project_name)
    today = datetime.date.today()

    project.data = {
        "client": client_name,
        "project_name": project_name,
        "date": today.strftime("%Y-%m-%d"),
        "items": [i for i in pricing_plan['items'] if i['quantity'] > 0],
        "total": pricing_plan['total']
    }

    # 日付設定
    valid_until = (today + relativedelta(months=2)).strftime("%Y-%m-%d")
    payment_due = (today + relativedelta(days=30)).strftime("%Y-%m-%d")

    # 内容表示
    print(f"\n会社名: {client_name}")
    print(f"案件名: {project_name}")
    print(f"合計金額: ¥{project.data['total']:,}")
    print("\n【内訳】")
    for item in project.data['items']:
        print(f"  - {item['desc']} x{item['quantity']} : ¥{item['price']:,}")

    # 保存
    project.save()
    print(f"\nプロジェクトデータを保存しました: {project.path}")

    # 書類生成
    generated_files = []

    if "quote" in doc_types:
        print("\n[見積書を作成中...]")
        title = f"御見積書_{client_name}"
        sid = services.create_sheet(title)
        if sid:
            services.apply_quote_layout(sid, project, valid_until)
            print(f"  シート: https://docs.google.com/spreadsheets/d/{sid}")
            date_str = today.strftime('%Y%m%d')
            safe_proj = project_name.replace("/", "_").replace(" ", "")
            pdf_name = f"{date_str}_{client_name}_{safe_proj}_見積書.pdf"
            pdf_path = os.path.join(project.path, pdf_name)
            services.export_pdf(sid, pdf_path)
            generated_files.append(("見積書", pdf_path))

    if "invoice" in doc_types:
        print("\n[請求書を作成中...]")
        title = f"請求書_{client_name}"
        sid = services.create_sheet(title)
        if sid:
            services.apply_invoice_layout(sid, project, payment_due)
            print(f"  シート: https://docs.google.com/spreadsheets/d/{sid}")
            date_str = today.strftime('%Y%m%d')
            safe_proj = project_name.replace("/", "_").replace(" ", "")
            pdf_name = f"{date_str}_{client_name}_{safe_proj}_請求書.pdf"
            pdf_path = os.path.join(project.path, pdf_name)
            services.export_pdf(sid, pdf_path)
            generated_files.append(("請求書", pdf_path))

    if "deposit" in doc_types:
        print("\n[前受金請求書を作成中...]")
        deposit_amount = int(project.data['total'] * deposit_ratio)
        title = f"前受金請求書_{client_name}"
        sid = services.create_sheet(title)
        if sid:
            services.apply_deposit_layout(sid, project, deposit_amount, payment_due)
            print(f"  シート: https://docs.google.com/spreadsheets/d/{sid}")
            date_str = today.strftime('%Y%m%d')
            safe_proj = project_name.replace("/", "_").replace(" ", "")
            pdf_name = f"{date_str}_{client_name}_{safe_proj}_前受金請求書.pdf"
            pdf_path = os.path.join(project.path, pdf_name)
            services.export_pdf(sid, pdf_path)
            generated_files.append(("前受金請求書", pdf_path))

    if "contract" in doc_types:
        print("\n[契約書・仕様書を作成中...]")
        generate_contract_docs(services, project, generated_files)

    # 完了サマリー
    print("\n" + "=" * 50)
    print("   生成完了！")
    print("=" * 50)
    print(f"保存先: {project.path}")
    print("\n【生成された書類】")
    for doc_name, path in generated_files:
        print(f"  - {doc_name}: {os.path.basename(path)}")
    print()


def generate_contract_docs(services, project, generated_files):
    """契約書を生成（プロフィールにより見積書/仕様書ベースを切替）"""
    is_saeki = SELLER_INFO['name'] == "佐伯 幸世"

    # Analyze Items
    top_pages = 0
    lower_pages = 0
    has_cms = "なし"
    has_form = "なし"

    for item in project.data['items']:
        desc = item['desc']
        qty = item['quantity']
        if "TOP" in desc: top_pages += qty
        if "下層" in desc: lower_pages += qty
        if "WordPress" in desc or "CMS" in desc: has_cms = "あり"
        if "フォーム" in desc or "Contact" in desc: has_form = "あり"

    # Payment Terms
    total = project.data['total']
    total_with_tax = int(total * 1.1)
    deposit_ratio = project.data.get('deposit_ratio', 0.5)
    deposit = int(total * deposit_ratio)
    deposit_with_tax = int(deposit * 1.1)
    final_payment = total - deposit
    final_with_tax = total_with_tax - deposit_with_tax

    today_str = datetime.date.today().strftime('%Y年%m月%d日')

    # 支払条件（前受金あり/なし）
    if deposit_ratio == 0:
        payment_terms = f"2．甲は、乙に対し、検収完了後、金 {total_with_tax:,} 円（税込）を一括で支払うものとする。"
    else:
        payment_terms = f"""2．甲は、乙に対し、以下の方法により対価を支払うものとする。
（1）本契約締結時　金 {deposit_with_tax:,} 円（税込）
（2）検収完了時　　金 {final_with_tax:,} 円（税込）"""

    # プロフィール別の文言
    if is_saeki:
        ref_doc = "見積書"
        ref_define = "甲および乙が別途合意した見積書（以下「見積書」という。）に記載の内容"
        ref_basis = "見積書に記載の内容に基づく完成物"
        ref_schedule = "甲乙別途協議の上定めるものとする"
        ref_match = "見積書に記載の内容に適合する"
        ref_mismatch = "見積書に記載の内容に適合しない"
        ref_scope = "見積書の範囲内"
        ref_court = "乙の住所地"
        rep_line = f"氏名／名称： {SELLER_INFO['name']}"
    else:
        ref_doc = "仕様書"
        ref_define = "甲および乙が別途合意し、確定した仕様書（以下「仕様書」という。）"
        ref_basis = "仕様書に定める完成物"
        ref_schedule = "仕様書に定めるとおりとする"
        ref_match = "仕様書に適合する"
        ref_mismatch = "仕様書に適合しない"
        ref_scope = "仕様書の範囲内"
        ref_court = "乙の本店所在地"
        rep_line = f"氏名／名称： {SELLER_INFO['name']}\n代表： {SELLER_INFO['rep_name']}"

    # --- CONTRACT ---
    contract_text = f"""ホームページ制作契約書
本契約は、委託者（以下「甲」という。）と受注者「{SELLER_INFO['name']}」（以下「乙」という。）との間で、ホームページ制作業務に関し、以下のとおり締結する。

第１条（目的）
本契約は、甲が乙に対し、甲のホームページの制作を依頼し、乙がこれを完成・納品することを目的とする。

第２条（業務内容および仕様）
1．乙は、{ref_define}に基づき、ホームページ制作業務（以下「本業務」という。）を行う。
2．{ref_doc}に記載のない業務は、本業務には含まれないものとする。
3．以下の業務は、本契約に基づく本業務には一切含まれないものとし、乙はこれらを行う義務を負わない。
（1）公開後の保守、運用、管理業務
（2）コンテンツ更新、修正作業
（3）サーバー管理、ドメイン管理
（4）集客支援、広告運用
（5）その他、完成後に継続的に発生する業務
4．前項の業務を甲が希望する場合、甲乙別途協議の上、条件を定めた書面による契約を締結するものとする。

第３条（契約形態）
本契約は、民法に定める請負契約とし、乙は{ref_basis}を完成・納品する義務のみを負うものとする。

第４条（制作期間および納期）
1．本業務の制作期間および納期は、{ref_schedule}。
2．甲の確認遅延、指示変更、資料提出の遅れ、連絡不通その他甲の責に帰すべき事由により制作が遅延した場合、納期は当然に延長されるものとする。

第５条（制作料金および支払条件）
1．本業務の対価は、金 {total_with_tax:,} 円（税込）とする。
{payment_terms}
3．甲の要望により仕様変更、修正、追加作業または納期変更等が生じた場合、乙は事前に見積書を提示し、甲の書面または電子的方法による承諾を得た場合に限り、追加費用を請求できるものとする。

第６条（納品および検収）
1．乙は、完成物を、非公開のインターネット環境において甲が確認可能な状態で納品するものとする。
2．甲は、納品後１４日以内に完成物の検査を行い、{ref_match}場合には、検収完了とする。
3．納品後、甲から７日間連絡がない場合、検収は完了したものとみなす。
4．{ref_mismatch}点が認められた場合、乙は当該部分に限り無償で修補を行うものとする。ただし、修補内容が軽微な修正に該当しない場合は、第７条を適用する。

第７条（修正対応および追加費用）
1．検収完了前において、{ref_scope}で行う軽微な修正については、乙は無償で対応するものとする。
2．軽微な修正とは、文言の修正、色味の微調整、余白・配置の小幅な調整その他これらに準ずるものであり、乙の作業工数の大幅な増加を伴わない修正をいう。
3．次の各号のいずれかに該当する修正は、軽微な修正には該当しないものとする。
（1）デザインの再制作または大幅な変更
（2）ページ構成、導線、レイアウトの変更
（3）ページ数、機能、仕様の追加または変更
（4）その他、乙において作業工数の増加を伴うと合理的に判断した修正
4．前項に該当する修正については、乙は事前に見積書を提示し、甲が承諾した場合に限り、当該修正作業を行うものとする。
5．修正内容が軽微な修正に該当するか否かについては、甲乙協議の上判断するものとする。協議が調わない場合は、乙が合理的な理由を示した上で判断するものとする。

第８条（中途解約およびキャンセル料）
1．甲は、本契約期間中であっても、書面または電子的方法により乙に通知することで、本契約を中途解約することができる。
2．前項の場合、甲は、以下の区分に応じたキャンセル料を支払うものとする。
（1）制作着手前：契約金額の２０％
（2）制作着手後〜初稿提出前：契約金額の５０％
（3）初稿提出後またはそれ以降：契約金額の８０％
3．乙が既に実施した作業、外注費、実費が前項の金額を上回る場合、甲は当該実費相当額を支払うものとする。
4．甲が既に支払った金員がある場合、前各項に基づくキャンセル料と相殺し、差額を精算するものとする。

第９条（著作権および知的財産権）
1．完成物に関する著作権（著作権法第27条および第28条を含む）は、甲が本契約に基づく対価を全額支払った時点で、乙から甲に移転する。
2．乙が従前から保有していたノウハウ、テンプレート、プログラム、デザイン素材等の知的財産権は、乙に留保される。
3．甲は、前項の知的財産権について、本ホームページを利用する目的の範囲内で、無償かつ非独占的に利用できる。
4．乙は、本制作物を自己の制作実績（ポートフォリオ等）として紹介・掲載する権利を有するものとする。

第１０条（再委託）
乙は、本業務の全部または一部を第三者に再委託することができる。ただし、再委託を行う場合には、事前に甲に通知するものとする。

第１１条（秘密保持）
甲および乙は、本契約に関連して知り得た相手方の非公開情報を、第三者に開示または漏洩してはならない。
本条の義務は、本契約終了後も存続する。

第１２条（責任範囲の限定）
1．乙は、完成物について、売上向上、集客効果、検索順位等の成果を保証するものではない。
2．乙の損害賠償責任は、乙の故意または重過失による場合を除き、甲が乙に支払った対価の総額を上限とする。
3．間接損害、逸失利益、データの喪失または破損による損害については、乙はその責任を負わないものとする。

第１３条（不可抗力）
天災地変、感染症の流行、戦争、暴動、法令の改廃、通信回線やサーバーの障害その他甲乙いずれの責にも帰すことのできない事由により、本契約の全部または一部の履行が困難となった場合、甲乙いずれも相手方に対し損害賠償責任を負わないものとする。この場合、甲乙は速やかに相手方に通知し、対応を協議するものとする。

第１４条（協議）
本契約に定めのない事項または解釈に疑義が生じた場合には、甲乙誠意をもって協議し解決する。

第１５条（管轄裁判所）
本契約に関する一切の紛争については、{ref_court}を管轄する地方裁判所を第一審の専属的合意管轄裁判所とする。

本契約締結の証として、本書の電磁的記録を作成し、クラウドサインにて電子署名を行い、甲乙各自その電磁的記録を保管する。

{today_str}

甲（委託者）
住所： ________________________
氏名／名称： {project.data['client']}
㊞

乙（受注者）
住所： {SELLER_INFO['address']} {SELLER_INFO.get('address2', '')}
{rep_line}
㊞
"""
    did_c = services.create_doc(f"契約書_{project.data['client']}")
    services.update_doc_text(did_c, contract_text)
    services.format_contract(did_c)
    print(f"  契約書ドキュメント作成: https://docs.google.com/document/d/{did_c}")

    # PDF Export for Contract
    date_str = datetime.date.today().strftime('%Y%m%d')
    safe_proj = project.data['project_name'].replace("/", "_").replace(" ", "")
    pdf_name = f"{date_str}_{project.data['client']}_{safe_proj}_契約書.pdf"
    pdf_path = os.path.join(project.path, pdf_name)
    services.export_pdf(did_c, pdf_path)
    generated_files.append(("契約書", pdf_path))

    # 森田の場合は仕様書も生成
    if not is_saeki:
        spec_text = f"""ホームページ制作 仕様書
本仕様書は、ホームページ制作契約書（以下「契約書」という。）に基づき、受注者（以下「乙」という。）が制作するホームページの仕様を定めるものとする。

１．案件概要
・案件名： {project.data['project_name']}
・クライアント名（甲）： {project.data['client']}
・制作会社名（乙）： {SELLER_INFO['name']}
・制作目的（例：会社紹介／サービス案内／採用 等）： [要記入]

２．制作範囲
本制作における制作範囲は、以下のとおりとする。
・新規制作 ／ リニューアル（該当する方を選択）
・レスポンシブ対応：あり
・対応デバイス：PC ／ スマートフォン ／ タブレット
※本仕様書に記載のない作業は、制作範囲には含まれないものとする。

３．ページ構成・ページ数
制作するページ構成およびページ数は、以下のとおりとする。

No / ページ名 / 内容概要
1 / トップページ / [TOPページ構成]
2 / 下層ページ / 全 {lower_pages} ページ
3 / ---------------- / ----------------
4 / ---------------- / ----------------

※上記ページ数を超える場合は、追加制作として別途見積とする。
(TOP: {top_pages}P / Lower: {lower_pages}P)

４．デザイン仕様
・デザインテイスト（例：シンプル／高級感／柔らかい 等）：[要記入]
・参考サイトURL（任意）：
・ブランドカラー／指定カラー：
・フォント指定：[要相談]
※デザインは、仕様確定後の大幅な変更・再制作は含まれない。

５．コンテンツ仕様
・テキスト原稿：
　□ 甲が用意する
　□ 乙が用意する（別途費用）
・画像素材：
　□ 甲が用意する
　□ 乙が用意する（フリー素材）
　□ 有料素材使用（別途費用）
※原稿・素材の提出遅延による納期遅延は、乙の責に帰さないものとする。

６．機能要件
本制作に含まれる機能は、以下のとおりとする。
・お問い合わせフォーム： {has_form}
・CMS（WordPress等）： {has_cms}
・ブログ機能： {has_cms}
・その他機能：
※記載のない機能は、本制作には含まれない。

７．SEO・表示最適化
・基本的な内部対策（タイトル／ディスクリプション設定）：含む
・検索順位保証：なし
※SEO効果・検索順位・アクセス数等の成果を保証するものではない。

８．制作スケジュール
・着手予定日： {today_str}
・初稿提出予定日： [要記入]
・納品予定日： [要記入]
※甲の確認遅延、修正指示の遅れ等があった場合、納期は延長されるものとする。

９．修正対応の範囲
・無償修正対象：
　仕様書の範囲内で行う軽微な修正
・有償修正対象：
　仕様変更、ページ追加、デザイン再制作、工数増加を伴う修正
※修正が軽微に該当するか否かの判断は、乙が行うものとする。

１０．保守・運用について
本制作には、以下の業務は一切含まれない。
・公開後の保守、運用、管理
・更新作業、修正作業
・サーバー・ドメイン管理
・SEO施策、集客支援
※必要な場合は、別途契約とする。

１１．検収条件
・本仕様書に基づき制作された完成物をもって、検収対象とする。
・仕様書に記載のない要望は、検収対象外とする。

本仕様書は、契約書の一部を構成するものとし、契約書と矛盾が生じた場合には、契約書の定めを優先するものとする。

{today_str}

甲（委託者）
氏名／名称： {project.data['client']}

乙（受注者）
氏名／名称： {SELLER_INFO['name']}
"""
        did_s = services.create_doc(f"仕様書_{project.data['client']}")
        services.update_doc_text(did_s, spec_text)
        print(f"  仕様書ドキュメント作成: https://docs.google.com/document/d/{did_s}")

        pdf_name_s = f"{date_str}_{project.data['client']}_{safe_proj}_仕様書.pdf"
        pdf_path_s = os.path.join(project.path, pdf_name_s)
        services.export_pdf(did_s, pdf_path_s)
        generated_files.append(("仕様書", pdf_path_s))


def main():
    services = GoogleServices()
    if not services.service_sheets: return

    prompt = sys.argv[1] if len(sys.argv) > 1 else input("Request: ")
    if not prompt: return

    ai = get_ai_response(prompt)
    intent = ai.get('intent')

    client = ai.get('client', '株式会社Mock')
    proj_name = ai.get('project_name', 'Web制作案件')
    excluded_items = ai.get('excluded', [])
    page_count = ai.get('page_count')

    # Prepare overrides
    overrides = {}
    if page_count is not None:
        # User input is Total Pages. Sub pages = Total - 1 (Top Page)
        # e.g. 1P -> 0 sub pages
        # e.g. 5P -> 4 sub pages
        overrides['sub_pages'] = max(0, page_count - 1)

    project = Project(client, proj_name)
    project.load()

    # Context Switch Detection
    is_new_context = False
    if project.data and project.data.get('project_name') != proj_name:
        is_new_context = True

    if intent == 'create_project' or (not project.data and intent != 'create_project') or is_new_context:
        # Check if AI provided direct items (e.g. Deposit)
        if ai.get('items'):
            pricing_plan = {'items': ai['items'], 'total': ai['total']}
        else:
            # Budget Matcher Logic
            menu = ai.get('suggested_menu', 'Webサイト制作')
            budget = ai.get('amount', 0)
            pricing_plan = budget_matcher.get_pricing_plan(menu, budget, excluded_items=excluded_items, overrides=overrides)

        # Filter items with 0 quantity
        filtered_items = [i for i in pricing_plan['items'] if i['quantity'] > 0]

        project.data = {
            "client": client,
            "project_name": proj_name,
            "date": datetime.date.today().strftime("%Y-%m-%d"),
            "items": filtered_items,
            "total": pricing_plan['total']
        }

    # INTERACTIVE CONFIRMATION
    print("\n--- Plan Details ---")
    print(f"Client: {project.data['client']}")
    print(f"Project: {project.data['project_name']}")
    print(f"Total: ¥{project.data['total']:,}")
    print("Items:")
    if 'items' in project.data:
        for item in project.data['items']:
            print(f" - {item['desc']} x{item['quantity']} : ¥{item['price']:,}")
    print("--------------------\n")

    print("--------------------\n")

    print("--------------------\n")

    # 1. Ask to Save Data (Creates Memo)
    confirm_save = input("Save Project Data (Info/Memo)? (y/n): ")
    if confirm_save.lower() == 'y':
        project.save()
    else:
        print("Data save skipped.")

    # 2. Ask to Generate Docs (API)
    confirm_docs = input("Create Sheet & PDF? (y/n): ")
    if confirm_docs.lower() != 'y':
        print("Cancelled document generation.")
        return

    # GENERATE DOCS
    if intent in ['quote', 'create_project', 'invoice']:
        doc_type = "御 見 積 書" if intent != 'invoice' else "請 求 書"
        title = f"{doc_type}_{project.data['client']}"
        sid = services.create_sheet(title)

        if not sid:
            print("Failed to create sheet.")
            return

        # Apply PRO Design
        services.apply_a4_layout(sid, project, doc_type)

        url_type = "Invoice" if intent == 'invoice' else "Quote"
        print(f"Created {url_type} Sheet: https://docs.google.com/spreadsheets/d/{sid}")

        # PDF Export
        # Filename: YYYYMMDD_Client_Project_Quote.pdf
        date_str = datetime.date.today().strftime('%Y%m%d')
        safe_proj = project.data['project_name'].replace("/", "_")
        doc_name_jp = "お見積書" if intent != 'invoice' else "請求書"
        pdf_name = f"{date_str}_{project.data['client']}_{safe_proj}_{doc_name_jp}.pdf"
        pdf_path = os.path.join(project.path, pdf_name)

        print("Exporting PDF...")
        services.export_pdf(sid, pdf_path)

    if intent == 'contract':
        generated_files = []
        generate_contract_docs(services, project, generated_files)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # コマンドライン引数がある場合は従来のmain()を使用
        main()
    else:
        # 引数なしの場合はモード選択
        print("\n" + "=" * 50)
        print("   AI書類生成システム")
        print("=" * 50)
        print("\n起動モードを選択してください:")
        print("1. 対話モード（推奨）- 質問に答えながら書類作成")
        print("2. ステップ形式 - 詳細な質問に順番に回答")
        print("3. ワンライナーモード - 1文で指示")
        mode = input("\n選択 (1/2/3): ").strip()

        if mode == "2":
            main_interactive()
        elif mode == "3":
            main()
        else:
            ai_conversation_mode()
