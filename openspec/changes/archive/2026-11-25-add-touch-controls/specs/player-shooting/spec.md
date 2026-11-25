# player-shooting Specification

## MODIFIED Requirements

### Requirement: Gun-hands aim at the pointer
The gun-hands SHALL be drawn as a separate sprite on top of the body, centered on the player, and SHALL rotate to point from the player toward the mouse pointer's position in world coordinates. Aim SHALL stay correct while the camera scrolls, even if the mouse does not move. When the aim points to the left half (angle beyond ±90°), the guns SHALL be mirrored vertically so they are not drawn upside down. In touch mode the guns SHALL instead point at the aim stick's angle once it is past the dead zone, and SHALL keep the last aim when it is released or inside the dead zone; the move stick SHALL NOT affect an aim that has been set. The last touch aim SHALL stay until the mouse or aim stick sets a new one. Before the aim stick has been used or the mouse pointer has been moved over the game, the guns SHALL point in the direction the body faces.

#### Scenario: Aim at the pointer
- **WHEN** the pointer is above and to the right of the player
- **THEN** the guns' rotation equals the angle from the player to the pointer's world position (within 1°)

#### Scenario: Camera scrolls under a still mouse
- **WHEN** the mouse stays still while the player walks and the camera scrolls
- **THEN** the guns keep pointing at the world position under the pointer, recomputed every frame

#### Scenario: Aim to the left
- **WHEN** the pointer is to the left of the player
- **THEN** the guns point left and are mirrored vertically, so their top side stays up

#### Scenario: Pointer not used yet
- **WHEN** a session starts and the mouse has not moved over the game
- **THEN** the guns point in the body's facing direction (right at spawn)

#### Scenario: Aim by stick
- **WHEN** the aim stick is dragged straight up past the dead zone
- **THEN** the guns point up (within 1°) and shots go up, wherever the thumb is on screen

#### Scenario: Release the aim stick
- **WHEN** the aim thumb lifts while aiming up
- **THEN** the guns keep pointing and firing up
