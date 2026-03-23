"""UI and display utilities for the Medieval War Game."""
import os
import sys


def clear():
    os.system("cls" if os.name == "nt" else "clear")


def divider(char="═", width=60):
    print(char * width)


def header(title: str, width: int = 60):
    divider()
    pad = (width - len(title) - 2) // 2
    print("║" + " " * pad + title + " " * (width - pad - len(title) - 2) + "║")
    divider()


def banner():
    print("""
╔══════════════════════════════════════════════════════════╗
║          ⚔️   MEDIEVAL WAR  —  AGE OF KINGDOMS  ⚔️        ║
║                                                          ║
║   Forge your empire. Conquer your enemies. Rule all.     ║
╚══════════════════════════════════════════════════════════╝
""")


def faction_select_screen():
    from kingdom import FACTION_BONUSES, FACTION_ICONS
    print("""
╔══════════════════════════════════════════════════════════╗
║                  CHOOSE YOUR FACTION                     ║
╠══════════════════════════════════════════════════════════╣""")
    factions = list(FACTION_BONUSES.keys())
    for i, faction in enumerate(factions, 1):
        icon = FACTION_ICONS[faction]
        desc = FACTION_BONUSES[faction]["description"]
        atk  = FACTION_BONUSES[faction]["attack"]
        dfn  = FACTION_BONUSES[faction]["defense"]
        gld  = FACTION_BONUSES[faction]["gold"]
        print(f"║  {i}. {icon} {faction:<12} — {desc}")
        print(f"║      ATK:{'+' if atk>=0 else ''}{atk}  DEF:{'+' if dfn>=0 else ''}{dfn}  Gold×{gld}")
        print("║")
    print("╚══════════════════════════════════════════════════════════╝")
    return factions


def status_bar(kingdom):
    from kingdom import FACTION_ICONS
    icon = FACTION_ICONS.get(kingdom.faction, "👑")
    print(f"\n{icon} {kingdom.name} of {kingdom.faction}  |  Turn {kingdom.turn}")
    print(f"   💰 Gold: {kingdom.gold} (+{kingdom.gold_income()}/turn)  "
          f"🌾 Food: {kingdom.food} ({'+' if kingdom.food_income()>=0 else ''}{kingdom.food_income()}/turn)  "
          f"⚔️  Army: {kingdom.army_size()} units")
    print(f"   🏰 Territories: {len(kingdom.territories)}  "
          f"🏆 Victories: {kingdom.victories}  "
          f"💀 Defeats: {kingdom.defeats}")
    divider("-", 60)


def show_map(territories, player_faction):
    print("\n🗺️  WORLD MAP")
    divider("-", 60)
    for t in territories:
        owned = "◀ YOURS" if t.owner == player_faction else ""
        print(f"  {t.icon} {t.name:<22} [{t.owner:<12}] {owned}")
        print(f"       Terrain: {t.terrain:<10} Gold:{t.gold_yield:>3}  Food:{t.food_yield:>3}  Def+{t.defense_bonus}%")
    divider("-", 60)


def show_army(army, upkeep):
    print("\n⚔️  YOUR ARMY")
    divider("-", 60)
    if not army:
        print("  (no units — recruit some!)")
    for u in army:
        bar_len = 10
        hp_frac = u.hp / u.max_hp
        filled = int(hp_frac * bar_len)
        hp_bar = "█" * filled + "░" * (bar_len - filled)
        print(f"  {u.icon} {u.name:<14} x{u.count:<3}  HP:[{hp_bar}] {u.hp}/{u.max_hp}")
        print(f"       ATK:{u.attack}  DEF:{u.defense}  SPD:{u.speed}  Upkeep:{u.upkeep}/turn")
    print(f"\n  Total upkeep: {upkeep} food/turn")
    divider("-", 60)


def show_recruit_menu(kingdom):
    from units import UNIT_TEMPLATES
    print("\n🏹 RECRUIT UNITS")
    divider("-", 60)
    print(f"  Gold: {kingdom.gold}  Food: {kingdom.food}\n")
    available = kingdom.available_units()
    for i, key in enumerate(available, 1):
        u = UNIT_TEMPLATES[key]
        print(f"  {i}. {u.icon} {u.name:<14}  Cost: {u.cost_gold}g {u.cost_food}f  "
              f"ATK:{u.attack} DEF:{u.defense} SPD:{u.speed} Upkeep:{u.upkeep}/t")
    divider("-", 60)
    return available


def show_battle_log(log, last_n=None):
    print("\n⚔️  BATTLE LOG")
    divider("-", 60)
    entries = log.entries if last_n is None else log.entries[-last_n:]
    for e in entries:
        print(f"  {e}")
    divider("-", 60)


def prompt(msg: str, choices: list = None) -> str:
    if choices:
        opts = "/".join(choices)
        return input(f"\n{msg} [{opts}]: ").strip().lower()
    return input(f"\n{msg}: ").strip()


def press_enter(msg="Press ENTER to continue..."):
    input(f"\n  {msg}")


def victory_screen(kingdom):
    clear()
    print("""
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🏆🏆🏆  CONGRATULATIONS — YOU HAVE WON!  🏆🏆🏆        ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣""")
    print(f"║  Ruler: {kingdom.name} of {kingdom.faction}")
    print(f"║  Turns taken: {kingdom.turn}")
    print(f"║  Victories: {kingdom.victories}  Defeats: {kingdom.defeats}")
    print(f"║  Gold: {kingdom.gold}  Territories: {len(kingdom.territories)}")
    print("""║                                                          ║
║  All kingdoms have fallen before your might.             ║
║  The realm is yours to rule!                             ║
╚══════════════════════════════════════════════════════════╝
""")


def game_over_screen(kingdom):
    clear()
    print("""
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   💀💀💀  YOUR KINGDOM HAS FALLEN  💀💀💀                ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣""")
    print(f"║  Ruler: {kingdom.name} of {kingdom.faction}")
    print(f"║  Lasted until turn: {kingdom.turn}")
    print(f"║  Victories: {kingdom.victories}  Defeats: {kingdom.defeats}")
    print("""║                                                          ║
║  History will remember your struggle...                  ║
╚══════════════════════════════════════════════════════════╝
""")
