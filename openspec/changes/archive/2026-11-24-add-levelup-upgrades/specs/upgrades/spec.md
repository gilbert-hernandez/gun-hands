# Spec Delta

## Purpose

Defines the pick-1-of-3 upgrade choice on level-up: the upgrade pool and ranks, how the cards are drawn and chosen, what each upgrade does to the player's per-run stats, and the event and configuration behind them.

## ADDED Requirements

### Requirement: Upgrade pool and ranks
The game SHALL offer exactly these 7 upgrades: Damage, Fire Rate, Multishot, Pierce, Move Speed, Max HP, and Pickup Radius. Each upgrade SHALL have a max rank of at least 1. Every session SHALL start with every upgrade at rank 0, and choosing an upgrade SHALL raise its rank by 1. An upgrade at its max rank SHALL NOT be offered again in that session.

#### Scenario: Fresh session
- **WHEN** a new session starts after a previous run where upgrades were chosen
- **THEN** every upgrade is at rank 0 and the player's stats are the configured starting values

#### Scenario: Maxed upgrade leaves the pool
- **WHEN** Pierce reaches its max rank
- **THEN** no later LevelUp screen in that session offers Pierce

### Requirement: Three-card draw
Each time the LevelUp scene opens, it SHALL show cards for 3 different upgrades, picked at random with equal chance from the upgrades below max rank. When fewer than 3 upgrades are below max rank, it SHALL show one card for each of them. When none are below max rank, it SHALL show a single filler card that restores a configured amount of HP, capped at max HP. Every opening, including each one in a queue of level-ups, SHALL make a new draw.

#### Scenario: Three distinct cards
- **WHEN** the LevelUp scene opens with every upgrade below max rank
- **THEN** it shows 3 cards, each for a different upgrade

#### Scenario: Draw is random
- **WHEN** the unit tests draw 7000 times from a full pool with a seeded random source
- **THEN** each of the 7 upgrades appears in roughly 3/7 of the draws (within 5 percentage points), and no draw repeats an upgrade

#### Scenario: Two left
- **WHEN** every upgrade but Damage and Pierce is at max rank and the LevelUp scene opens
- **THEN** it shows exactly 2 cards, Damage and Pierce

#### Scenario: Everything maxed
- **WHEN** every upgrade is at max rank and the player, at 50 of 120 HP, picks the filler card
- **THEN** the player's HP rises by the configured filler amount, but not above 120, and no upgrade rank changes

### Requirement: Card contents
Each card SHALL show its number key (1, 2, or 3, left to right), the upgrade's icon, its name, a short text saying what the next rank does, and its rank after choosing out of its max rank. With placeholder art, each upgrade's icon SHALL be visually distinct.

#### Scenario: Rank shown
- **WHEN** Damage is at rank 1 of 5 and the LevelUp scene shows a Damage card
- **THEN** the card reads as rank 2/5

### Requirement: Choosing an upgrade
The player SHALL choose a card by clicking it or by pressing the number key shown on it. Hovering a card with the mouse SHALL highlight it. Number keys without a card, Enter, and clicks outside every card SHALL do nothing. For a configured input delay after the LevelUp scene opens, clicks and number keys SHALL be ignored. Exactly one upgrade SHALL be applied per opening, even if several inputs arrive at once. Choosing SHALL apply the upgrade immediately and then close the LevelUp scene, which hands off to the level-up flow.

#### Scenario: Pick by key
- **WHEN** the LevelUp scene is ready and the player presses 2
- **THEN** the middle card's upgrade is applied and the LevelUp scene closes

#### Scenario: Pick by click
- **WHEN** the LevelUp scene is ready and the player clicks the left card
- **THEN** the left card's upgrade is applied and the LevelUp scene closes

#### Scenario: Input delay
- **WHEN** the player presses 1 before the input delay has passed since the LevelUp scene opened
- **THEN** nothing is chosen and the scene stays open

#### Scenario: Missing card
- **WHEN** the LevelUp scene shows 2 cards and the player presses 3
- **THEN** nothing is chosen and the scene stays open

#### Scenario: Double input
- **WHEN** the player presses 1 and 2 in the same frame
- **THEN** exactly one upgrade is applied and exactly one pending level-up is consumed

### Requirement: Upgrade effects
Each rank of an upgrade SHALL change the player's per-run stats by a configured step, effective from the next frame (the next shot for weapon stats), without changing the configuration:
- Damage SHALL raise bullet damage;
- Fire Rate SHALL raise shots per second;
- Multishot SHALL add one projectile per shot and widen the spread angle by a configured step;
- Pierce SHALL add one to the enemies a bullet passes through;
- Move Speed SHALL raise the player's move speed;
- Max HP SHALL raise max HP and heal the player by the same amount;
- Pickup Radius SHALL raise the XP pickup radius.
Bullets already in flight SHALL keep the damage and pierce they were fired with.

#### Scenario: Damage
- **WHEN** bullet damage is 10, the Damage step is 3, and the player chooses Damage
- **THEN** the next bullet fired deals 13 damage

#### Scenario: Multishot
- **WHEN** the player fires 1 projectile per shot and chooses Multishot
- **THEN** each following shot fires 2 projectiles fanned across the widened spread angle

#### Scenario: Max HP heals
- **WHEN** the player has 60 of 100 HP, the Max HP step is 20, and the player chooses Max HP
- **THEN** the player has 80 of 120 HP

#### Scenario: Move Speed
- **WHEN** the move speed is 200 px/s, the Move Speed step is 20, and the player chooses Move Speed
- **THEN** holding D moves the player right at 220 px/s

#### Scenario: Config untouched
- **WHEN** the player chooses every upgrade at least once and the session ends
- **THEN** the weapon and player configuration values are unchanged, and the next session starts from them

### Requirement: Upgrade event
When an upgrade is chosen, the Game scene SHALL emit `upgrade-chosen` on its event emitter, with the upgrade id and its new rank, after the upgrade has been applied. Choosing the filler card SHALL emit `upgrade-chosen` with the filler id and rank 0. The event name SHALL be available as a shared constant.

#### Scenario: Event after apply
- **WHEN** the player chooses Max HP for the first time
- **THEN** `upgrade-chosen` is emitted with the Max HP id and rank 1, and the player's max HP is already raised when it is emitted

### Requirement: Upgrade numbers from configuration
Each upgrade's name, description, max rank, per-rank step, icon key, and placeholder icon color, the Multishot spread step, the filler card's heal amount, and the LevelUp input delay SHALL come from configuration.

#### Scenario: Config drives max rank
- **WHEN** the configured max rank of Pierce is changed to 1 and the game reloads
- **THEN** Pierce is not offered again after it has been chosen once

#### Scenario: Config sanity
- **WHEN** the unit tests read the upgrade configuration
- **THEN** there are exactly the 7 upgrades, each with a positive integer max rank and a positive step, each icon key exists in the asset manifest, and the Move Speed upgrade at max rank keeps the player slower than the XP magnet's maximum speed
