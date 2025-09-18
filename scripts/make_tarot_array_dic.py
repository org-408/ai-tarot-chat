#!/usr/bin/env python3
"""
タロットデータ変換スクリプト
- cards: オブジェクトから配列に変換
- meanings: 各カテゴリのオブジェクトから配列に変換
"""

import json
import os
from pathlib import Path

# プロジェクトのルートディレクトリを取得
ROOT_DIR = Path(__file__).parent.parent.absolute()
INPUT_FILE = ROOT_DIR / "docs" / "tarot_data_dictionary.json"
OUTPUT_FILE = ROOT_DIR / "docs" / "tarot_data_dictionary_array.json"

def convert_tarot_data():
    """タロットデータを変換する関数"""
    
    print(f"入力ファイル: {INPUT_FILE}")
    print(f"出力ファイル: {OUTPUT_FILE}")
    
    # 入力ファイルを読み込む
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 変換後のデータを格納する辞書
    converted_data = {
        "metadata": data["metadata"],
        "cards": []
    }
    
    # cardsをオブジェクトから配列に変換
    for card_id, card_info in data["cards"].items():
        # カードデータをコピー
        card_data = card_info.copy()
        # idフィールドを追加
        card_data["id"] = card_id
        
        # meaningsをオブジェクトから配列に変換
        meanings_array = []
        for category, meaning in card_data["meanings"].items():
            # 各カテゴリの意味を辞書として追加
            meaning_data = meaning.copy()
            meaning_data["category"] = category
            meanings_array.append(meaning_data)
        
        # 変換したmeaningsを元のデータに設定
        card_data["meanings"] = meanings_array
        
        # カードデータを配列に追加
        converted_data["cards"].append(card_data)
    
    # 出力ファイルに書き込む
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(converted_data, f, indent=2, ensure_ascii=False)
    
    print(f"変換が完了しました！")
    print(f"カード数: {len(converted_data['cards'])}")
    print(f"最初のカードID: {converted_data['cards'][0]['id']}")

if __name__ == "__main__":
    convert_tarot_data()