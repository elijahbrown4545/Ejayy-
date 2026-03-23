"""Battle system for the Medieval War Game."""
import random
import time
from typing import List, Tuple
from units import Unit


class BattleLog:
    def __init__(self):
        self.entries: List[str] = []

    def add(self, msg: str):
        self.entries.append(msg)

    def print_last(self, n: int = 5):
        for entry in self.entries[-n:]:
            print(f"  {entry}")


def battle_round(
    attackers: List[Unit],
    defenders: List[Unit],
    log: BattleLog,
    attacker_bonus: int = 0,
    defender_bonus: int = 0,
) -> Tuple[List[Unit], List[Unit]]:
    """Simulate one round of battle. Returns surviving units."""
    # Sort by speed descending — faster units attack first
    all_units = [(u, "att") for u in attackers if u.hp > 0] + \
                [(u, "def") for u in defenders if u.hp > 0]
    all_units.sort(key=lambda x: x[0].speed, reverse=True)

    for unit, side in all_units:
        if unit.hp <= 0:
            continue
        if side == "att":
            targets = [u for u in defenders if u.hp > 0]
            bonus = attacker_bonus
        else:
            targets = [u for u in attackers if u.hp > 0]
            bonus = defender_bonus

        if not targets:
            break

        # Prefer weakest target (focus fire)
        target = min(targets, key=lambda u: u.hp)
        raw_attack = unit.effective_attack() + bonus
        dmg = target.take_damage(raw_attack)
        log.add(f"{'🗡' if side=='att' else '🛡'} {unit.name} attacks {target.name} for {dmg} dmg (hp:{target.hp}/{target.max_hp})")

        if target.hp <= 0:
            target.count = max(0, target.count - 1)
            log.add(f"  💀 {target.name} falls!")
            if target.count > 0:
                target.hp = target.max_hp  # next in stack
            # Catapults do splash — small extra damage to another random enemy
            if unit.unit_type == "siege" and targets:
                splash_targets = [u for u in targets if u.hp > 0 and u != target]
                if splash_targets:
                    splash = random.choice(splash_targets)
                    sdmg = splash.take_damage(raw_attack // 3)
                    log.add(f"  💥 Catapult splash hits {splash.name} for {sdmg}!")

    alive_attackers = [u for u in attackers if u.count > 0 and u.hp > 0]
    alive_defenders = [u for u in defenders if u.count > 0 and u.hp > 0]
    return alive_attackers, alive_defenders


def run_battle(
    player_army: List[Unit],
    enemy_army: List[Unit],
    territory_defense_bonus: int = 0,
    attacker_bonus: int = 0,
    slow: bool = False,
) -> Tuple[bool, BattleLog, List[Unit]]:
    """
    Run a full battle. Returns (player_won, log, surviving_player_units).
    """
    log = BattleLog()
    log.add("⚔️  === BATTLE BEGINS === ⚔️")

    round_num = 1
    attackers = [u for u in player_army if u.count > 0]
    defenders = [u for u in enemy_army if u.count > 0]

    while attackers and defenders and round_num <= 20:
        log.add(f"\n--- Round {round_num} ---")
        attackers, defenders = battle_round(
            attackers, defenders, log,
            attacker_bonus=attacker_bonus,
            defender_bonus=territory_defense_bonus // 10,
        )
        round_num += 1

    if not defenders:
        log.add("\n🏆 VICTORY! The enemy forces are routed!")
        player_won = True
    elif not attackers:
        log.add("\n💀 DEFEAT! Your army has been destroyed!")
        player_won = False
    else:
        # Stalemate — attacker retreats
        log.add("\n⚠️  STALEMATE! After 20 rounds, your army retreats.")
        player_won = False

    log.add(f"\nSurvivors: {sum(u.count for u in attackers)} of your troops remain.")
    return player_won, log, attackers


def quick_battle_summary(player_army: List[Unit], enemy_army: List[Unit]) -> dict:
    """Estimate battle odds without running it."""
    p_power = sum(u.attack * u.count * (u.hp / u.max_hp) for u in player_army)
    e_power = sum(u.attack * u.count for u in enemy_army)
    p_hp    = sum(u.hp * u.count for u in player_army)
    e_hp    = sum(u.max_hp * u.count for u in enemy_army)
    ratio   = (p_power + p_hp * 0.3) / max(1, (e_power + e_hp * 0.3))
    if ratio > 1.5:
        odds = "Strong Advantage"
    elif ratio > 1.0:
        odds = "Slight Advantage"
    elif ratio > 0.7:
        odds = "Even Match"
    elif ratio > 0.5:
        odds = "Disadvantage"
    else:
        odds = "Heavy Disadvantage"
    return {"odds": odds, "ratio": round(ratio, 2), "your_power": int(p_power), "enemy_power": int(e_power)}
