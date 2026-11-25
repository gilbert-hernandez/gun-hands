# touch-controls Specification

## Purpose
Defines how the game is played on a touch screen: switching between touch and keyboard and mouse, the twin thumbsticks and which touch owns them, when they let go, how they are drawn, and the browser gestures that are blocked.

## Requirements

### Requirement: Input mode
The game SHALL switch to touch mode when the screen is touched during play, and to keyboard-and-mouse mode when W, A, S or D is pressed or a mouse moves or presses. The mode SHALL carry over to the next session. Touches SHALL NOT count as mouse use.

#### Scenario: Touch then keyboard
- **WHEN** the player touches the arena and later presses W
- **THEN** touch mode starts on the touch, and on W the sticks let go and keyboard-and-mouse mode starts

#### Scenario: Desktop unaffected
- **WHEN** a session is played only with keyboard and mouse
- **THEN** no stick or on-screen pause button appears

### Requirement: Twin floating sticks
A touch on the left half of the game SHALL start the move stick and a touch on the right half SHALL start the aim stick, centered where the touch began. Touches in the black bars beside the canvas SHALL count as the half they are next to. Both SHALL work at once. A touch on an on-screen button SHALL NOT start a stick.

#### Scenario: Both thumbs
- **WHEN** the left thumb drags left while the right thumb drags up
- **THEN** the player moves left while aiming up

#### Scenario: Thumbs in the side bars
- **WHEN** both thumbs press and drag in the side bars
- **THEN** the player moves and aims as if they were on the canvas, and stops moving when the move thumb lifts

### Requirement: Pointer ownership
Each stick SHALL follow only the touch that started it, even across the center line, until that touch ends. Another touch on the same side SHALL be ignored while the stick is held.

#### Scenario: Thumb crosses the center
- **WHEN** the move thumb drags into the right half
- **THEN** it still controls movement and the aim doesn't change

#### Scenario: One thumb lifts
- **WHEN** both sticks are held and the aim thumb lifts
- **THEN** the move stick keeps working

### Requirement: Stick reset
Both sticks SHALL let go when Game pauses for any reason, when the player dies, when the session ends, and when the input mode changes. A cancelled touch SHALL let go of its stick. A finger held through a pause SHALL NOT control a stick until it is lifted and pressed again.

#### Scenario: Released while paused
- **WHEN** the move stick is held, LevelUp opens, the thumb lifts, and play resumes
- **THEN** the player stands still

#### Scenario: Held through a pause
- **WHEN** the move stick is held while the game pauses and resumes
- **THEN** the player stands still until the thumb lifts and presses again

#### Scenario: Cancelled touch
- **WHEN** the system cancels the move thumb's touch
- **THEN** the player stops

### Requirement: On-screen display
A held stick SHALL be drawn as a translucent base with a knob kept within the stick radius, and SHALL be hidden when released. A stick started in a side bar SHALL be drawn at the nearest point of the canvas. These shapes SHALL need no art files.

#### Scenario: Drag past the radius
- **WHEN** a thumb drags farther than the stick radius
- **THEN** the knob stays on the edge of the base in the thumb's direction

#### Scenario: Stick in a side bar
- **WHEN** a thumb holds a stick in the left bar
- **THEN** part of the stick shows at the canvas's left edge

### Requirement: Browser gestures blocked
Touching or dragging on the game canvas or the bars around it SHALL NOT scroll the page, select text, or open a long-press menu, and SHALL NOT request pan or zoom gestures from the browser.

#### Scenario: Drag on the canvas
- **WHEN** the player drags a thumb across the canvas
- **THEN** the page does not scroll or select text

#### Scenario: Drag in a bar
- **WHEN** the player drags a thumb in a side bar
- **THEN** the page does not scroll or select text

### Requirement: Touch numbers from configuration
Stick radius, dead zone, colors, opacity, pause button layout and the touch LevelUp delay SHALL come from configuration.

#### Scenario: Change the dead zone
- **WHEN** a developer changes the dead zone in the configuration
- **THEN** the sticks use it without scene code changes
