# Spec Delta

## MODIFIED Requirements

### Requirement: Twin floating sticks
A touch on the left half of the game SHALL start the move stick and a touch on the right half SHALL start the aim stick, centered where the touch began. Touches in the black bars beside the canvas SHALL count as the half they are next to. Both SHALL work at once. A touch on an on-screen button SHALL NOT start a stick.

#### Scenario: Both thumbs
- **WHEN** the left thumb drags left while the right thumb drags up
- **THEN** the player moves left while aiming up

#### Scenario: Thumbs in the side bars
- **WHEN** both thumbs press and drag in the side bars
- **THEN** the player moves and aims as if they were on the canvas, and stops moving when the move thumb lifts

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
