import math

# Standard Menus (Base Prices)
# "ratio": 0.2 means 20% of the TOTAL amount
# "unit_price": 15000 means ¥15,000 per quantity
# "price": 50000 means fixed ¥50,000

STANDARD_MENUS = {
    "Webサイト制作": {
        "description": "WordPress制作（デザイン+コーディング）",
        "defaults": {"sub_pages": 5},
        "items_structure": [
            {"desc": "デザイン TOPページ", "type": "fixed", "price": 60000},
            {"desc": "デザイン 下層ページ", "type": "unit", "price": 18000, "default_qty": 5},
            {"desc": "コーディング TOPページ（レスポンシブ込）", "type": "fixed", "price": 60000},
            {"desc": "コーディング 下層ページ（レスポンシブ込）", "type": "unit", "price": 18000, "default_qty": 5},
            {"desc": "取材・ライティング費用", "type": "fixed", "price": 12000, "optional": True},
            {"desc": "WordPress実装", "type": "fixed", "price": 20000},
            {"desc": "CMS構築(お知らせ)", "type": "fixed", "price": 20000},
            {"desc": "お問い合わせフォーム実装", "type": "fixed", "price": 15000},
            {"desc": "内部SEO対策", "type": "fixed", "price": 5000},
            {"desc": "セキュリティ設定", "type": "fixed", "price": 5000},
            {"desc": "Google Analytics・サーチコンソール設定", "type": "fixed", "price": 5000},
            {"desc": "サーバー設定・SSL導入", "type": "fixed", "price": 10000},
            {"desc": "ディレクション費", "type": "ratio", "ratio": 0.2}
        ]
    },

    "LP制作": {
        "description": "Landing Page",
        "defaults": {},
        "items_structure": [
            {"desc": "ライティング", "type": "fixed", "price": 60000},
            {"desc": "デザイン", "type": "fixed", "price": 100000},
            {"desc": "コーディング", "type": "fixed", "price": 40000},
            {"desc": "お問合せ機能", "type": "fixed", "price": 10000},
            {"desc": "サーバー設定費", "type": "fixed", "price": 20000},
        ]
    },
    "ウェブコーディング": {
        "description": "Coding Only / Dev (No Direction Fee)",
        "defaults": {"sub_pages": 5},
        "items_structure": [
            {"desc": "基本コーディング (TOPページ)", "type": "fixed", "price": 50000},
            {"desc": "基本コーディング (下層ページ)", "type": "unit", "price": 15000},
            {"desc": "JS/アニメーション実装", "type": "fixed", "price": 30000},
            {"desc": "CMS導入・設定 (WordPress等)", "type": "fixed", "price": 50000},
            {"desc": "お問い合わせフォーム実装", "type": "fixed", "price": 30000},
            {"desc": "レスポンシブ検証・調整費", "type": "fixed", "price": 20000}
        ]
    },
    "ウェブデザイン": {
        "description": "Design Only (No Direction Fee)",
        "defaults": {"sub_pages": 5},
        "items_structure": [
            {"desc": "TOPページデザイン", "type": "fixed", "price": 60000},
            {"desc": "下層ページデザイン", "type": "unit", "price": 20000},
            {"desc": "素材選定・作成費", "type": "fixed", "price": 30000},
            {"desc": "デザイン修正費", "type": "fixed", "price": 20000}
        ]
    },


}

def calculate_menu_price(menu_name, overrides=None, excluded_items=None):
    """
    Calculate the base price for a menu given specific quantities.
    overrides: dict of quantities (e.g., {'sub_pages': 10})
    excluded_items: list of item descriptions to exclude
    """
    menu = STANDARD_MENUS.get(menu_name)
    if not menu: return [], 0
    
    items = []
    subtotal = 0
    overrides = overrides or {}
    excluded_items = excluded_items or []
    
    # Pass 1: Fixed and Unit costs
    for struct in menu["items_structure"]:
        if any(ex in struct["desc"] for ex in excluded_items):
            continue
            
        if struct["type"] == "fixed":
            price = struct["price"]
            items.append({
                "desc": struct["desc"], 
                "price": price, 
                "quantity": 1,
                "no_scale": struct.get("no_scale", False)
            })
            subtotal += price
            
        elif struct["type"] == "unit":
            # Determine quantity: Override > Default_Qty > 1
            qty = overrides.get("sub_pages", struct.get("default_qty", 1))
            # Special case for writing if different
            if "ライティング" in struct["desc"]:
                 qty = overrides.get("writing_pages", qty)
                 
            price = struct["price"]
            items.append({
                "desc": struct["desc"], 
                "price": price, 
                "quantity": qty,
                "no_scale": struct.get("no_scale", False)
            })
            subtotal += (price * qty)

    # Pass 2: Ratio costs (e.g. Direction)
    # Formula: Total = Subtotal / (1 - RatioSum)
    # Direction = Total * Ratio
    ratio_sum = sum(item["ratio"] for item in menu["items_structure"] if item["type"] == "ratio" and not any(ex in item["desc"] for ex in excluded_items))
    
    if ratio_sum >= 1.0: ratio_sum = 0.5 # Safety
    
    total_estimated = subtotal / (1 - ratio_sum) if ratio_sum > 0 else subtotal
    
    for struct in menu["items_structure"]:
        if struct["type"] == "ratio":
            if any(ex in struct["desc"] for ex in excluded_items):
                continue
                
            amount = int(total_estimated * struct["ratio"])
            # Round to 1000
            amount = round(amount / 1000) * 1000
            items.append({"desc": struct["desc"], "price": amount, "quantity": 1})
            
    # Final Recalculation
    total_final = sum(item["price"] * item["quantity"] for item in items)
    
    return items, total_final

def adjust_to_budget_exact(menu_name, target_budget, excluded_items=None, overrides=None):
    """
    1パターンの時用。予算にぴったり合わせる。
    優先順位: ページ数を減らす → optional項目を削除 → 割引で調整
    """
    base_items, base_total = calculate_menu_price(menu_name, overrides=overrides, excluded_items=excluded_items)

    if not target_budget or target_budget == 0:
        return base_items

    if base_total <= target_budget:
        return base_items

    menu = STANDARD_MENUS.get(menu_name)
    excluded_items = excluded_items or []
    optional_descs = [s["desc"] for s in menu["items_structure"] if s.get("optional")]

    exclude_patterns = [[]]
    for i in range(len(optional_descs)):
        exclude_patterns.append(optional_descs[:i+1])

    start_pages = overrides.get("sub_pages", menu["defaults"].get("sub_pages", 5)) if overrides else menu["defaults"].get("sub_pages", 5)

    best_items = base_items
    best_total = base_total

    for extra_excludes in exclude_patterns:
        current_excluded = excluded_items + extra_excludes
        for pages in range(start_pages, 0, -1):
            test_overrides = dict(overrides) if overrides else {}
            test_overrides["sub_pages"] = pages
            test_items, test_total = calculate_menu_price(menu_name, overrides=test_overrides, excluded_items=current_excluded)
            if test_total <= target_budget:
                return test_items
            best_items = test_items
            best_total = test_total

    # まだ超える場合、割引で調整
    diff = best_total - target_budget
    if diff > 0:
        best_items.append({"desc": "お値引き", "price": -diff, "quantity": 1})

    return best_items


def suggest_cuts(menu_name, target_budget, excluded_items=None, overrides=None):
    """
    複数パターンの時用。カットできる項目一覧と節約額を返す。
    Claudeがこの結果をユーザーに提示して、何をカットするか聞く。
    """
    menu = STANDARD_MENUS.get(menu_name)
    if not menu:
        return []

    overrides = overrides or {}
    excluded_items = excluded_items or []
    _, base_total = calculate_menu_price(menu_name, overrides=overrides, excluded_items=excluded_items)

    suggestions = []

    # 1) ページ数を減らすパターン
    start_pages = overrides.get("sub_pages", menu["defaults"].get("sub_pages", 5))
    for pages in range(start_pages - 1, 0, -1):
        test_overrides = dict(overrides)
        test_overrides["sub_pages"] = pages
        _, test_total = calculate_menu_price(menu_name, overrides=test_overrides, excluded_items=excluded_items)
        saving = base_total - test_total
        suggestions.append({
            "action": f"下層ページを{pages}Pに減らす（現在{start_pages}P）",
            "saving": saving,
            "type": "pages",
            "value": pages
        })

    # 2) 個別項目をカットするパターン
    for struct in menu["items_structure"]:
        if struct["type"] == "ratio":
            continue
        if any(ex in struct["desc"] for ex in excluded_items):
            continue
        test_excluded = excluded_items + [struct["desc"]]
        _, test_total = calculate_menu_price(menu_name, overrides=overrides, excluded_items=test_excluded)
        saving = base_total - test_total
        if saving > 0:
            suggestions.append({
                "action": f"「{struct['desc']}」をカット",
                "saving": saving,
                "type": "exclude",
                "value": struct["desc"]
            })

    # 節約額が大きい順にソート
    suggestions.sort(key=lambda x: x["saving"], reverse=True)

    return {
        "menu": menu_name,
        "base_total": base_total,
        "target": target_budget,
        "diff": base_total - target_budget,
        "suggestions": suggestions
    }


def get_pricing_plan(menu_query, budget_query=None, excluded_items=None, overrides=None):
    # Simple keyword matching
    menu_name = "Webサイト制作" # Default
    if "LP" in menu_query or "ランディング" in menu_query:
        menu_name = "LP制作"
    elif "Studio" in menu_query or "スタジオ" in menu_query:
        menu_name = "Studio制作"
    elif "コーディング" in menu_query and "のみ" in menu_query:
        menu_name = "ウェブコーディング"
    elif "デザイン" in menu_query and "のみ" in menu_query:
        menu_name = "ウェブデザイン"
    elif "コーディング" in menu_query:
        menu_name = "ウェブコーディング"
    elif "デザイン" in menu_query:
        menu_name = "ウェブデザイン"

    items = adjust_to_budget_exact(menu_name, budget_query, excluded_items, overrides)
    total = sum(i["price"] * i["quantity"] for i in items)

    return {
        "menu": menu_name,
        "total": total,
        "items": items
    }
