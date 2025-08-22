from itertools import combinations
from collections import defaultdict
import random

def generate_matches(players, n, level_gap):
    # Step 1: Generate all possible pairs and their level sums
    player_list = list(players.keys())
    num_players = len(player_list)
    pairs = list(combinations(player_list, 2))
    pair_levels = [(p1, p2, players[p1] + players[p2]) for p1, p2 in pairs]

    # Step 2: Generate all valid matches (4 distinct players, level difference <= 1)
    valid_matches = []
    for i, (p1, p2, level1) in enumerate(pair_levels):
        for (p3, p4, level2) in pair_levels[i+1:]:
            if p1 not in (p3, p4) and p2 not in (p3, p4):  # Ensure 4 distinct players
                if abs(level1 - level2) <= level_gap:  # Level difference <= 1
                    valid_matches.append(((p1, p2), (p3, p4), level1, level2))

    # Step 3: Validate n (must be multiple of num_players and divisible by 2 for 2 courts)
    if n % num_players != 0:
        raise ValueError(f"n must be a multiple of {num_players} to ensure equal participation")
    if n % 2 != 0:
        raise ValueError("n must be divisible by 2 for 2 courts per round")

    matches_per_player = (4 * n) // num_players  # Each match involves 4 players
    num_rounds = n // 2  # 2 matches per round
    if num_rounds * (num_players - 1) < num_players:
        raise ValueError(f"Number of rounds ({num_rounds}) too small to ensure unique byes")

    # Step 4: Select matches with equal participation and unique players per round
    selected_matches = []
    player_counts = defaultdict(int)
    bye_counts = defaultdict(int)
    attempts = 0
    max_attempts = 10000

    while len(selected_matches) < n and attempts < max_attempts:
        random.shuffle(valid_matches)
        selected_matches = []
        player_counts = defaultdict(int)
        bye_counts = defaultdict(int)
        rounds = []
        used_pairs = set()

        for round_num in range(num_rounds):
            round_matches = []
            round_players = set()
            bye_candidate = None

            # Determine bye player for this round
            for player in player_list:
                if bye_counts[player] == 0 and player not in round_players:
                    bye_candidate = player
                    break
            if not bye_candidate:
                for player in player_list:
                    if bye_counts[player] < max(bye_counts.values()) and player not in round_players:
                        bye_candidate = player
                        break
            if not bye_candidate:
                break  # Cannot find a suitable bye player

            # Select 2 matches for the round with 8 distinct players
            for match in valid_matches:
                (p1, p2), (p3, p4), level1, level2 = match
                match_players = {p1, p2, p3, p4}
                if (len(match_players) == 4 and  # Ensure 4 distinct players in match
                    not match_players & round_players and  # No overlap with round
                    bye_candidate not in match_players and  # Bye player not in match
                    all(player_counts[p] < matches_per_player for p in match_players) and  # Within match limit
                    tuple(sorted([p1, p2])) not in used_pairs and  # Avoid repeating pairs
                    tuple(sorted([p3, p4])) not in used_pairs):
                    round_matches.append(match)
                    round_players.update(match_players)
                    used_pairs.add(tuple(sorted([p1, p2])))
                    used_pairs.add(tuple(sorted([p3, p4])))
                    for p in match_players:
                        player_counts[p] += 1
                    if len(round_matches) == 2:
                        break
            if len(round_matches) < 2:
                break  # Cannot form a valid round
            rounds.append((round_matches, bye_candidate))
            bye_counts[bye_candidate] += 1
            selected_matches.extend(round_matches)

        if len(selected_matches) == n:
            break
        attempts += 1

    if len(selected_matches) < n:
        raise ValueError(f"Could not find {n} matches with constraints after {max_attempts} attempts")

    # Step 5: Format output
    result = []
    for round_num, (matches, bye) in enumerate(rounds, 1):
        for i, ((p1, p2), (p3, p4), level1, level2) in enumerate(matches):
            result.append({
                "Round": round_num,
                "Court": i + 1,
                "Match": f"({p1}+{p2}) vs ({p3}+{p4})",
                "Level Sum": f"{level1:.1f} vs {level2:.1f}",
                "Bye": bye
            })

    # Verify participation and byes
    if not all(count == matches_per_player for count in player_counts.values()):
        raise ValueError("Participation counts are not equal")
    if len(set(player_counts.keys())) != num_players:
        raise ValueError("Not all players are included")

    return result, player_counts, bye_counts

# Example usage
players = {
    "蔡晓峰": 4.0, 
    "闫铭": 4.0, 
    "周国栋": 4.0, 
    "常慧鑫": 4.0,
    "许潇民": 3.0, 
    "罗妹秋": 2.5, 
    "刘戈": 2.5, 
    "孙江月": 2.5, 
    "于虹": 2.5,
}
n = 18  # 9 rounds, 2 matches per round, each player 8 matches
level_gap = 1

try:
    matches, player_counts, bye_counts = generate_matches(players, n, level_gap)
    print(f"\nSelected {n} matches across {n//2} rounds:")
    for match in matches:
        print(f"Round {match['Round']} Court {match['Court']}: {match['Match']} | Level Sum: {match['Level Sum']} | Bye: {match['Bye']}")

except ValueError as e:
    print(f"Error: {e}")