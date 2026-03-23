#!/usr/bin/env python3
"""
Medieval War — Age of Kingdoms
A turn-based terminal strategy game.

Usage:
    python main.py
"""
import sys
import copy

from game import setup_game, main_loop
from kingdom import ALL_TERRITORIES
import ui


def main():
    # Deep-copy territories so each game session is fresh
    territories = copy.deepcopy(ALL_TERRITORIES)

    ui.clear()
    ui.banner()

    while True:
        print("  1. ⚔️  New Game")
        print("  2. 🚪  Quit\n")
        choice = ui.prompt("Choose")

        if choice == "1":
            territories = copy.deepcopy(ALL_TERRITORIES)
            kingdom = setup_game()
            main_loop(kingdom, territories)
            print("\n  Play again? ")
        elif choice == "2":
            print("\n  Glory to those who dare to dream of empire. Farewell!\n")
            sys.exit(0)
        else:
            print("  Please choose 1 or 2.")


if __name__ == "__main__":
    main()
