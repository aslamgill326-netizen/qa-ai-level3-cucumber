@API @AE-05
Feature: Login API contract
  @P1
  Scenario: Missing email
    When I submit the login API request without an email
    Then the API response code should be 400
    And the API message should contain "Bad request, email or password parameter is missing"

  @P1
  Scenario: Invalid credentials
    When I submit the login API request with invalid credentials
    Then the API response code should be 404
    And the API message should contain "User not found!"

  @P1
  Scenario: Unsupported DELETE
    When I send DELETE to the login API
    Then the API response code should be 405
    And the API message should contain "This request method is not supported."
