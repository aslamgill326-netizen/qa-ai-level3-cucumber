@rca-validation
Feature: AI Root Cause Analysis Validation
  Validate that intentionally failed tests are captured
  and displayed in the Failure Analysis & RCA dashboard.

  Scenario: Intentionally fail a product search assertion
    Given I am on the products page
    When I search for product "Blue Top"
    Then I should see matching search results for "RCA_DEMO_NON_EXISTENT_PRODUCT"