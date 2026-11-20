# Playwright skill contract

Use Playwright TypeScript through the project's Cucumber `AppWorld` (not Playwright Test fixtures). Prefer semantic and scoped locators; use web-first assertions and page objects. No arbitrary sleeps, forced clicks or weakened assertions. Use unique disposable data and clean only accounts created in the scenario. Preserve screenshot, trace, video and self-healing evidence in hooks. Record healing attempts, but never silently replace assertions or mask failures. Keep all external AI calls outside test hooks and after test execution.
