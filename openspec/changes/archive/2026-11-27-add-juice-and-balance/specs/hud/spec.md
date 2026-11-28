# Spec Delta

## Purpose

Tells the player when overtime starts, so the sudden jump in difficulty reads as intended (GH-13).

## ADDED Requirements

### Requirement: Overtime cue
When survival time reaches the configured overtime start (10:00 in the shipped configuration), the HUD timer SHALL change to the configured overtime color and stay that color for the rest of the session, and an "OVERTIME" banner SHALL appear below the timer, then fade out within a few seconds. The cue SHALL show once per session and SHALL use drawn text only (no art or sound). A new session SHALL start with the normal timer color and no banner.

#### Scenario: Overtime starts
- **WHEN** survival time passes 10:00
- **THEN** the timer turns the overtime color and the "OVERTIME" banner appears once, then fades out

#### Scenario: Before overtime
- **WHEN** survival time is 9:59
- **THEN** the timer has its normal color and no banner is showing

#### Scenario: New session
- **WHEN** a run that reached overtime ends and a new one starts
- **THEN** the timer has its normal color and no banner is showing
