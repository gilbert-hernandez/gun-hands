# Spec Delta

## ADDED Requirements

### Requirement: Code quality checks
The project SHALL provide npm scripts that check formatting, lint the code and type-check the JavaScript using its JSDoc annotations. Each script SHALL exit with a non-zero status when it finds a problem and with zero when it finds none. The project SHALL also provide a script that rewrites files into the project's formatting style.

#### Scenario: Clean code passes every check
- **WHEN** a developer runs `npm run format:check`, `npm run lint` and `npm run typecheck` on the main branch
- **THEN** each command exits with status 0 and reports no errors

#### Scenario: A type mistake is caught
- **WHEN** code calls a documented function with an argument of the wrong type (for example, a string where JSDoc declares a number)
- **THEN** `npm run typecheck` reports the file and line and exits non-zero

#### Scenario: A lint problem is caught
- **WHEN** a source file references an undefined variable or declares an unused one
- **THEN** `npm run lint` reports the file and line and exits non-zero

#### Scenario: Formatting is fixed automatically
- **WHEN** a file is not in the project's formatting style and the developer runs `npm run format`
- **THEN** the file is rewritten in that style, and `npm run format:check` passes afterwards

### Requirement: Single combined check command
The project SHALL provide one `npm run check` command that runs the format check, lint, type-check and unit tests, and fails if any of them fails.

#### Scenario: All checks pass
- **WHEN** a developer runs `npm run check` and every step passes
- **THEN** the command exits with status 0

#### Scenario: One step fails
- **WHEN** any one of the format check, lint, type-check or unit tests fails
- **THEN** `npm run check` exits non-zero and its output names the failing step

### Requirement: Unit test coverage report
The project SHALL provide an npm script that runs the unit tests and reports line and branch coverage for the game's source code, both in the terminal and as a browsable HTML report. Coverage SHALL be reported only and SHALL NOT fail the run.

#### Scenario: Developer views coverage
- **WHEN** a developer runs `npm run coverage`
- **THEN** a per-file coverage table for `src/` is printed and an HTML report is written to `coverage/`, which is not committed to git

### Requirement: Continuous integration
The repository SHALL contain a CI workflow that, on every push and pull request, installs dependencies from the lockfile, runs the combined check command, and then runs the browser end-to-end tests. The workflow run SHALL fail if any step fails. When the end-to-end tests fail, the test report and videos SHALL be kept as downloadable run artifacts.

#### Scenario: Passing pull request
- **WHEN** a pull request is opened and all checks and end-to-end tests pass
- **THEN** the CI run is marked successful

#### Scenario: Failing end-to-end test
- **WHEN** an end-to-end test fails in CI
- **THEN** the CI run is marked failed and the Playwright report and videos can be downloaded from the run
