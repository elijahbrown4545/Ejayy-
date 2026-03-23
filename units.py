"""Unit definitions for the Medieval War Game."""
from dataclasses import dataclass, field
from typing import Optional
import random


@dataclass
class Unit:
    name: str
    unit_type: str
    hp: int
    max_hp: int
    attack: int
    defense: int
    speed: int
    cost_gold: int
    cost_food: int
    upkeep: int          # food per turn
    count: int = 0       # number of this unit type in army
    icon: str = "⚔"

    @property
    def is_alive(self) -> bool:
        return self.hp > 0

    def effective_attack(self) -> int:
        return max(1, self.attack + random.randint(-2, 2))

    def effective_defense(self) -> int:
        return max(0, self.defense + random.randint(-1, 1))

    def take_damage(self, damage: int) -> int:
        actual = max(1, damage - self.effective_defense())
        self.hp = max(0, self.hp - actual)
        return actual

    def heal(self, amount: int):
        self.hp = min(self.max_hp, self.hp + amount)

    def clone(self) -> "Unit":
        return Unit(
            name=self.name,
            unit_type=self.unit_type,
            hp=self.max_hp,
            max_hp=self.max_hp,
            attack=self.attack,
            defense=self.defense,
            speed=self.speed,
            cost_gold=self.cost_gold,
            cost_food=self.cost_food,
            upkeep=self.upkeep,
            count=1,
            icon=self.icon,
        )


# Unit templates per faction
UNIT_TEMPLATES = {
    "peasant": Unit("Peasant", "infantry", 20, 20, 4, 1, 3, 10, 5, 1, icon="🧑"),
    "swordsman": Unit("Swordsman", "infantry", 40, 40, 8, 4, 4, 30, 10, 2, icon="⚔️"),
    "archer": Unit("Archer", "ranged", 30, 30, 10, 2, 5, 40, 8, 2, icon="🏹"),
    "cavalry": Unit("Cavalry", "cavalry", 55, 55, 12, 5, 8, 70, 15, 3, icon="🐴"),
    "knight": Unit("Knight", "heavy", 80, 80, 15, 10, 3, 120, 20, 4, icon="🛡️"),
    "catapult": Unit("Catapult", "siege", 50, 50, 25, 0, 1, 150, 5, 5, icon="💣"),
    # Faction-specific
    "berserker": Unit("Berserker", "infantry", 60, 60, 18, 2, 6, 80, 20, 3, icon="🪓"),
    "war_elephant": Unit("War Elephant", "heavy", 120, 120, 20, 12, 3, 200, 30, 6, icon="🐘"),
    "mage": Unit("Battle Mage", "magic", 25, 25, 20, 1, 5, 100, 10, 4, icon="🔮"),
    "scout": Unit("Desert Scout", "cavalry", 35, 35, 9, 3, 10, 50, 8, 2, icon="🗡️"),
}

FACTION_UNITS = {
    "Ironhold":   ["peasant", "swordsman", "archer", "cavalry", "knight", "catapult"],
    "Ashenvale":  ["peasant", "archer", "mage", "cavalry", "knight", "catapult"],
    "Northclans": ["peasant", "swordsman", "berserker", "cavalry", "knight", "catapult"],
    "Sultanate":  ["peasant", "scout", "archer", "cavalry", "war_elephant", "catapult"],
}


def get_unit_for_faction(faction: str, unit_key: str) -> Optional[Unit]:
    if unit_key in FACTION_UNITS.get(faction, []):
        return UNIT_TEMPLATES[unit_key].clone()
    return None


def build_enemy_army(difficulty: int, enemy_name: str) -> list:
    """Build an enemy army scaled to difficulty (1-5)."""
    scale = difficulty
    army = []
    compositions = [
        ("peasant", max(2, scale * 3)),
        ("swordsman", max(1, scale * 2)),
        ("archer", max(1, scale)),
        ("cavalry", max(0, scale - 1)),
    ]
    if scale >= 3:
        compositions.append(("knight", scale - 2))
    if scale >= 4:
        compositions.append(("catapult", 1))

    for key, count in compositions:
        for _ in range(count):
            u = UNIT_TEMPLATES[key].clone()
            u.name = f"{enemy_name} {u.name}"
            army.append(u)
    return army
