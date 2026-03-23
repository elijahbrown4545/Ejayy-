"""Main game loop for Medieval War Game."""
import random
import sys
from typing import List, Optional

from kingdom import Kingdom, ALL_TERRITORIES, Territory, FACTION_BONUSES, FACTION_ICONS
from units import build_enemy_army, UNIT_TEMPLATES
from battle import run_battle, quick_battle_summary
import ui


def setup_game() -> Kingdom:
    ui.clear()
    ui.banner()
    print("  Welcome, future ruler! Your destiny awaits.\n")

    # Choose faction
    factions = ui.faction_select_screen()
    while True:
        choice = ui.prompt("Choose your faction (1-4)")
        if choice.isdigit() and 1 <= int(choice) <= len(factions):
            faction = factions[int(choice) - 1]
            break
        print("  Invalid choice. Pick a number 1-4.")

    # Name your kingdom
    ruler_name = ui.prompt("Enter your ruler's name (or press ENTER for default)")
    if not ruler_name:
        ruler_name = ["King Aldric", "Queen Mara", "Emperor Dusk", "Sultan Yavar"][factions.index(faction)]

    kingdom_name = ui.prompt("Name your kingdom (or press ENTER for default)")
    if not kingdom_name:
        kingdom_name = ["Ironhold", "Ashenvale", "Frostpeak", "Al-Khar"][factions.index(faction)]

    # Starting territory
    start_territory = next(t for t in ALL_TERRITORIES if t.owner == faction)
    start_territory.owner = faction

    kingdom = Kingdom(
        name=kingdom_name,
        faction=faction,
        gold=600,
        food=400,
        territories=[start_territory],
    )

    # Starting units
    starter_keys = {
        "Ironhold":   [("peasant", 3), ("swordsman", 2), ("archer", 1)],
        "Ashenvale":  [("peasant", 3), ("archer", 2), ("mage", 1)],
        "Northclans": [("peasant", 3), ("swordsman", 2), ("berserker", 1)],
        "Sultanate":  [("peasant", 3), ("scout", 2), ("archer", 1)],
    }
    for unit_key, count in starter_keys[faction]:
        for _ in range(count):
            kingdom.recruit_unit(unit_key)

    icon = FACTION_ICONS[faction]
    print(f"\n  {icon} {ruler_name}, ruler of {kingdom_name} — the {faction} bow to your will!")
    print(f"  Your capital: {start_territory.icon} {start_territory.name}")
    ui.press_enter()
    return kingdom


def get_attackable_territories(kingdom: Kingdom, all_territories: List[Territory]) -> List[Territory]:
    return [t for t in all_territories if t.owner != kingdom.faction]


def ai_turn(kingdom: Kingdom, all_territories: List[Territory]):
    """Simple AI: enemy factions try to expand each turn."""
    factions = ["Ironhold", "Ashenvale", "Northclans", "Sultanate"]
    enemy_factions = [f for f in factions if f != kingdom.faction]

    for ef in enemy_factions:
        # Enemy territories
        enemy_territories = [t for t in all_territories if t.owner == ef]
        if not enemy_territories:
            continue
        # Try to capture a neutral territory
        neutral = [t for t in all_territories if t.owner == "Neutral"]
        if neutral and random.random() < 0.4:
            target = random.choice(neutral)
            target.owner = ef


def do_attack(kingdom: Kingdom, all_territories: List[Territory]) -> bool:
    """Player attacks a territory. Returns True if game should continue."""
    targets = get_attackable_territories(kingdom, all_territories)
    if not targets:
        print("  No territories to attack!")
        return True

    if not kingdom.army:
        print("  You have no army! Recruit units first.")
        ui.press_enter()
        return True

    print("\n🗡  SELECT TARGET TERRITORY")
    ui.divider("-", 60)
    for i, t in enumerate(targets, 1):
        difficulty = max(1, min(5, t.defense_bonus // 10 + 1))
        print(f"  {i}. {t.icon} {t.name} [{t.owner}] — Def+{t.defense_bonus}% | Difficulty: {'★'*difficulty}{'☆'*(5-difficulty)}")

    while True:
        choice = ui.prompt("Choose target (number) or 'back'")
        if choice == "back":
            return True
        if choice.isdigit() and 1 <= int(choice) <= len(targets):
            target = targets[int(choice) - 1]
            break
        print("  Invalid choice.")

    # Build enemy army
    difficulty = max(1, min(5, target.defense_bonus // 10 + 2))
    enemy_army = build_enemy_army(difficulty, target.owner)

    # Show battle preview
    summary = quick_battle_summary(kingdom.army, enemy_army)
    print(f"\n  ⚔️  Battle Preview for {target.name}:")
    print(f"     Your power: {summary['your_power']}  Enemy power: {summary['enemy_power']}")
    print(f"     Assessment: {summary['odds']}")

    confirm = ui.prompt("Proceed with attack?", ["yes", "no"])
    if confirm != "yes":
        return True

    # Run battle
    faction_bonus = FACTION_BONUSES[kingdom.faction]["attack"]
    player_won, log, survivors = run_battle(
        kingdom.army,
        enemy_army,
        territory_defense_bonus=target.defense_bonus,
        attacker_bonus=faction_bonus,
    )

    ui.show_battle_log(log, last_n=20)

    if player_won:
        kingdom.victories += 1
        target.owner = kingdom.faction
        kingdom.territories.append(target)
        kingdom.army = survivors
        kingdom.remove_dead_units()
        print(f"\n  🏰 {target.name} is now under your control!")
        print(f"  Gold income +{target.gold_yield}/turn, Food income +{target.food_yield}/turn")
    else:
        kingdom.defeats += 1
        kingdom.army = survivors
        kingdom.remove_dead_units()
        if not kingdom.army:
            print("\n  💀 Your entire army is destroyed!")

    ui.press_enter()

    # Check lose condition: no army AND only capital
    if not kingdom.army and len(kingdom.territories) <= 1:
        return False
    return True


def do_recruit(kingdom: Kingdom):
    while True:
        ui.clear()
        available = ui.show_recruit_menu(kingdom)
        print(f"  Gold: {kingdom.gold}  Food: {kingdom.food}\n")
        choice = ui.prompt("Choose unit # to recruit, or 'back'")
        if choice == "back":
            break
        if choice.isdigit() and 1 <= int(choice) <= len(available):
            unit_key = available[int(choice) - 1]
            err = kingdom.recruit_unit(unit_key)
            if err:
                print(f"  ❌ {err}")
            else:
                u = UNIT_TEMPLATES[unit_key]
                print(f"  ✅ Recruited {u.icon} {u.name}!")
            ui.press_enter()
        else:
            print("  Invalid choice.")


def do_diplomacy(kingdom: Kingdom, all_territories: List[Territory]):
    """Simple diplomacy: pay gold to turn a neutral territory without battle."""
    neutrals = [t for t in all_territories if t.owner == "Neutral"]
    if not neutrals:
        print("  No neutral territories to negotiate with.")
        ui.press_enter()
        return

    print("\n🕊  DIPLOMACY — Purchase neutral territories")
    ui.divider("-", 60)
    print(f"  Your gold: {kingdom.gold}\n")
    for i, t in enumerate(neutrals, 1):
        price = (t.gold_yield + t.food_yield) * 10
        print(f"  {i}. {t.icon} {t.name} — Price: {price} gold (yields {t.gold_yield}g {t.food_yield}f/turn)")

    while True:
        choice = ui.prompt("Buy territory (number) or 'back'")
        if choice == "back":
            return
        if choice.isdigit() and 1 <= int(choice) <= len(neutrals):
            t = neutrals[int(choice) - 1]
            price = (t.gold_yield + t.food_yield) * 10
            if kingdom.gold < price:
                print(f"  ❌ Not enough gold! Need {price}, have {kingdom.gold}.")
            else:
                kingdom.gold -= price
                t.owner = kingdom.faction
                kingdom.territories.append(t)
                print(f"  ✅ {t.name} has peacefully joined your kingdom!")
            ui.press_enter()
            return
        print("  Invalid choice.")


def end_turn(kingdom: Kingdom, all_territories: List[Territory]) -> bool:
    """Process end-of-turn events. Returns False if player loses."""
    gold_gain, food_net = kingdom.collect_taxes()

    print(f"\n  📅 End of Turn {kingdom.turn}")
    print(f"  💰 Tax collected: +{gold_gain} gold")
    if food_net >= 0:
        print(f"  🌾 Food surplus: +{food_net}")
    else:
        print(f"  🌾 Food deficit: {food_net} (army starving!)")
        # Starving army loses HP
        for u in kingdom.army:
            u.hp = max(1, u.hp - 5)

    # AI factions expand
    ai_turn(kingdom, all_territories)

    # Partial heal between turns
    kingdom.heal_army(20)

    kingdom.turn += 1

    # Check if player starved out (food < 0 for multiple turns handled by hp)
    if kingdom.food == 0 and kingdom.army_size() == 0:
        print("\n  💀 Your forces have starved. The kingdom is lost.")
        return False

    ui.press_enter()
    return True


def check_victory(kingdom: Kingdom, all_territories: List[Territory]) -> bool:
    """Player wins if they own all territories."""
    return all(t.owner == kingdom.faction for t in all_territories)


def main_loop(kingdom: Kingdom, all_territories: List[Territory]):
    while True:
        ui.clear()
        ui.status_bar(kingdom)

        print("\n  What will you do?\n")
        print("  1. 🗺  View World Map")
        print("  2. ⚔️  Attack Territory")
        print("  3. 🏹  Recruit Units")
        print("  4. 🛡️  View Army")
        print("  5. 🕊  Diplomacy (buy neutral land)")
        print("  6. 📅  End Turn")
        print("  7. ❓  Help")
        print("  8. 🚪  Quit\n")
        ui.divider("-", 60)

        choice = ui.prompt("Choose action")

        if choice == "1":
            ui.show_map(all_territories, kingdom.faction)
            ui.press_enter()

        elif choice == "2":
            if not do_attack(kingdom, all_territories):
                ui.game_over_screen(kingdom)
                return

        elif choice == "3":
            do_recruit(kingdom)

        elif choice == "4":
            ui.show_army(kingdom.army, kingdom.upkeep())
            ui.press_enter()

        elif choice == "5":
            do_diplomacy(kingdom, all_territories)

        elif choice == "6":
            if not end_turn(kingdom, all_territories):
                ui.game_over_screen(kingdom)
                return
            if check_victory(kingdom, all_territories):
                ui.victory_screen(kingdom)
                return

        elif choice == "7":
            show_help()

        elif choice == "8":
            confirm = ui.prompt("Really quit?", ["yes", "no"])
            if confirm == "yes":
                print("\n  May your legend live on. Farewell!\n")
                return

        else:
            print("  Invalid choice. Pick 1-8.")


def show_help():
    ui.clear()
    print("""
╔══════════════════════════════════════════════════════════╗
║                        HELP                              ║
╠══════════════════════════════════════════════════════════╣
║  GOAL: Conquer ALL territories to win!                   ║
║                                                          ║
║  RESOURCES                                               ║
║  • Gold — used to recruit units                          ║
║  • Food — used to feed your army (upkeep each turn)      ║
║  • Territories generate gold & food every turn           ║
║                                                          ║
║  UNITS (from weakest to strongest)                       ║
║  • Peasant   — cheap cannon fodder                       ║
║  • Swordsman — reliable infantry                         ║
║  • Archer    — good attack, low defense                  ║
║  • Cavalry   — fast strikers                             ║
║  • Knight    — elite heavy infantry                      ║
║  • Catapult  — massive damage, splash effect             ║
║  • (Faction-specific units available too!)               ║
║                                                          ║
║  BATTLE                                                  ║
║  • Faster units attack first each round                  ║
║  • Territory defense bonus helps defenders               ║
║  • Your army heals 20% between turns                     ║
║  • Catapults deal splash damage                          ║
║                                                          ║
║  TIPS                                                    ║
║  • Use Diplomacy to grab neutral land cheaply            ║
║  • Keep food income positive or army starves             ║
║  • Mix unit types for best results                       ║
╚══════════════════════════════════════════════════════════╝
""")
    ui.press_enter()
