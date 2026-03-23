"""Kingdom and territory management."""
from dataclasses import dataclass, field
from typing import List, Optional
from units import UNIT_TEMPLATES, FACTION_UNITS, get_unit_for_faction, Unit


@dataclass
class Territory:
    name: str
    owner: str          # faction name or "Neutral"
    terrain: str        # plains, forest, mountains, desert, coast
    gold_yield: int
    food_yield: int
    defense_bonus: int  # % bonus to defender
    icon: str
    x: int = 0
    y: int = 0

    @property
    def description(self) -> str:
        return f"{self.icon} {self.name} ({self.terrain}) — {self.owner}"


TERRAIN_ICONS = {
    "plains": "🌾",
    "forest": "🌲",
    "mountains": "⛰️",
    "desert": "🏜️",
    "coast": "🌊",
    "castle": "🏰",
}

ALL_TERRITORIES = [
    Territory("Ironhold Keep",    "Ironhold",   "castle",    20, 10, 30, "🏰", 2, 2),
    Territory("Ashenvale Citadel","Ashenvale",  "forest",    15, 15, 25, "🌲", 6, 2),
    Territory("Frostpeak Hold",   "Northclans", "mountains", 10, 20, 35, "⛰️", 2, 6),
    Territory("Sands of Al-Khar", "Sultanate",  "desert",    25, 5,  20, "🏜️", 6, 6),
    Territory("Greenfield",       "Neutral",    "plains",    12, 18, 10, "🌾", 4, 2),
    Territory("Amber Coast",      "Neutral",    "coast",     18, 12, 15, "🌊", 4, 4),
    Territory("Dark Forest",      "Neutral",    "forest",    8,  20, 25, "🌲", 2, 4),
    Territory("Crossroads",       "Neutral",    "plains",    15, 15, 5,  "🌾", 4, 6),
    Territory("Iron Mines",       "Neutral",    "mountains", 25, 5,  30, "⛰️", 6, 4),
]


@dataclass
class Kingdom:
    name: str
    faction: str
    gold: int = 500
    food: int = 300
    turn: int = 1
    territories: List[Territory] = field(default_factory=list)
    army: List[Unit] = field(default_factory=list)
    victories: int = 0
    defeats: int = 0

    def gold_income(self) -> int:
        return sum(t.gold_yield for t in self.territories)

    def food_income(self) -> int:
        return sum(t.food_yield for t in self.territories) - self.upkeep()

    def upkeep(self) -> int:
        return sum(u.upkeep * u.count for u in self.army)

    def army_size(self) -> int:
        return sum(u.count for u in self.army)

    def collect_taxes(self):
        self.gold += self.gold_income()
        net_food = self.food_income()
        self.food = max(0, self.food + net_food)
        return self.gold_income(), net_food

    def recruit_unit(self, unit_key: str) -> Optional[str]:
        u = get_unit_for_faction(self.faction, unit_key)
        if u is None:
            return f"Unit '{unit_key}' not available for {self.faction}."
        if self.gold < u.cost_gold:
            return f"Not enough gold! Need {u.cost_gold}, have {self.gold}."
        if self.food < u.cost_food:
            return f"Not enough food! Need {u.cost_food}, have {self.food}."
        self.gold -= u.cost_gold
        self.food -= u.cost_food
        # Add to existing stack or new
        for existing in self.army:
            if existing.unit_type == u.unit_type and existing.name == u.name:
                existing.count += 1
                existing.hp = existing.max_hp
                return None
        u.count = 1
        self.army.append(u)
        return None

    def available_units(self) -> List[str]:
        return FACTION_UNITS.get(self.faction, [])

    def remove_dead_units(self):
        self.army = [u for u in self.army if u.count > 0]

    def heal_army(self, percent: int = 30):
        for u in self.army:
            u.heal(u.max_hp * percent // 100)

    def territory_names(self) -> List[str]:
        return [t.name for t in self.territories]


FACTION_BONUSES = {
    "Ironhold":   {"attack": 0, "defense": 2, "gold": 1.1, "description": "Sturdy defenders, strong economy"},
    "Ashenvale":  {"attack": 2, "defense": 0, "gold": 1.0, "description": "Powerful mages, forest warfare masters"},
    "Northclans": {"attack": 3, "defense": -1, "gold": 0.9, "description": "Ferocious berserkers, brutal offense"},
    "Sultanate":  {"attack": 1, "defense": 1, "gold": 1.2, "description": "Wealthy traders, swift cavalry"},
}

FACTION_COLORS = {
    "Ironhold": "gray",
    "Ashenvale": "green",
    "Northclans": "blue",
    "Sultanate": "yellow",
}

FACTION_ICONS = {
    "Ironhold": "⚔️",
    "Ashenvale": "🌿",
    "Northclans": "❄️",
    "Sultanate": "🌙",
}
