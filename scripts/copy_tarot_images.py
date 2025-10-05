import os
import shutil

# マッピング: major arcana
major = [
    ("00-TheFool.png", "0_fool.png"),
    ("01-TheMagician.png", "1_magician.png"),
    ("02-TheHighPriestess.png", "2_high_priestess.png"),
    ("03-TheEmpress.png", "3_empress.png"),
    ("04-TheEmperor.png", "4_emperor.png"),
    ("05-TheHierophant.png", "5_hierophant.png"),
    ("06-TheLovers.png", "6_lovers.png"),
    ("07-TheChariot.png", "7_chariot.png"),
    ("08-Strength.png", "8_strength.png"),
    ("09-TheHermit.png", "9_hermit.png"),
    ("10-WheelOfFortune.png", "10_wheel_fortune.png"),
    ("11-Justice.png", "11_justice.png"),
    ("12-TheHangedMan.png", "12_hanged_man.png"),
    ("13-Death.png", "13_death.png"),
    ("14-Temperance.png", "14_temperance.png"),
    ("15-TheDevil.png", "15_devil.png"),
    ("16-TheTower.png", "16_tower.png"),
    ("17-TheStar.png", "17_star.png"),
    ("18-TheMoon.png", "18_moon.png"),
    ("19-TheSun.png", "19_sun.png"),
    ("20-Judgement.png", "20_judgement.png"),
    ("21-TheWorld.png", "21_world.png"),
]

# minor arcana
suits = [
    ("Wands", "wands"),
    ("Cups", "cups"),
    ("Swords", "swords"),
    ("Pentacles", "pentacles"),
]
ranks = [
    ("01", "ace"),
    ("02", "two"),
    ("03", "three"),
    ("04", "four"),
    ("05", "five"),
    ("06", "six"),
    ("07", "seven"),
    ("08", "eight"),
    ("09", "nine"),
    ("10", "ten"),
    ("11", "page"),
    ("12", "knight"),
    ("13", "queen"),
    ("14", "king"),
]

src_dir = os.path.join(os.path.dirname(__file__), "..", "docs", "rider-waite-smith")
dst_dir = os.path.join(os.path.dirname(__file__), "..", "mobile/public", "cards")
os.makedirs(dst_dir, exist_ok=True)

# major arcana
for src, dst in major:
    src_path = os.path.join(src_dir, src)
    dst_path = os.path.join(dst_dir, dst)
    if os.path.exists(src_path):
        shutil.copyfile(src_path, dst_path)
        print(f"copied: {src_path} -> {dst_path}")
    else:
        print(f"not found: {src_path}")

# minor arcana
for suit_src, suit_code in suits:
    for rank_src, rank_code in ranks:
        src_file = f"{suit_src}{rank_src}.png"
        dst_file = f"{rank_code}_{suit_code}.png"
        src_path = os.path.join(src_dir, src_file)
        dst_path = os.path.join(dst_dir, dst_file)
        if os.path.exists(src_path):
            shutil.copyfile(src_path, dst_path)
            print(f"copied: {src_path} -> {dst_path}")
        else:
            print(f"not found: {src_path}")

print("全てのコピー処理が完了しました。")
