# upgrades Specification

## MODIFIED Requirements

### Requirement: Choosing an upgrade
The player SHALL choose a card by clicking it, by tapping it, or by pressing the number key shown on it. A tap SHALL count only when the touch starts on a card after the configured touch delay and is released, not cancelled, on the same card. Hovering a card with the mouse SHALL highlight it. Number keys without a card, Enter, and clicks outside every card SHALL do nothing. For a configured input delay after the LevelUp scene opens, clicks and number keys SHALL be ignored. Exactly one upgrade SHALL be applied per opening, even if several inputs arrive at once. In touch mode the prompt SHALL say to tap a card. Choosing SHALL apply the upgrade immediately and then close the LevelUp scene, which hands off to the level-up flow.

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

#### Scenario: Pick by tap
- **WHEN** the touch delay has passed and the player taps the left card
- **THEN** the left card's upgrade is applied and the LevelUp scene closes

#### Scenario: Thumb held at level-up
- **WHEN** a thumb is already down when LevelUp opens and lifts over a card
- **THEN** nothing is chosen

#### Scenario: Slide off a card
- **WHEN** a touch starts on one card and lifts on another or outside
- **THEN** nothing is chosen

#### Scenario: Touch wording
- **WHEN** LevelUp opens in touch mode
- **THEN** the prompt tells the player to tap a card
