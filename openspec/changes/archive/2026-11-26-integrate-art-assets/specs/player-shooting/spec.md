## MODIFIED Requirements

### Requirement: Muzzle flash hook
Every shot SHALL emit one event carrying the gun-tip position and aim angle, so effects and sound can subscribe. A muzzle flash SHALL play once at the gun tip, pointed along the aim, on each shot. On each shot the gun-hands SHALL play their recoil animation once and then return to the idle frame. A new shot SHALL restart the recoil animation. Recoil SHALL NOT change the aim, the gun-tip position or the fire rate.

#### Scenario: Shot fired
- **WHEN** the guns fire
- **THEN** one fired event is emitted with the gun-tip position and angle, and a muzzle flash is visible at the gun tip until it fades

#### Scenario: Recoil
- **WHEN** the guns fire one shot and then stop firing
- **THEN** the gun-hands play the recoil animation once and then show the idle frame

#### Scenario: Recoil at a high fire rate
- **WHEN** shots come faster than the recoil animation lasts
- **THEN** each shot restarts the recoil from its first frame, and the fire rate is unchanged
