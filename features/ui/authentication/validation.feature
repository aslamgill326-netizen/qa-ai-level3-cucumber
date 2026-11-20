
Feature: Authentication form validation

  @ui @negative @p1
  Scenario: Login with missing password
    Given the Automation Exercise application is available
    When I submit login without a password
    Then the login form should reject the submission

  @ui @negative @p1
  Scenario: Login with missing email
    Given the Automation Exercise application is available
    When I submit login without an email
    Then the login form should reject the submission
