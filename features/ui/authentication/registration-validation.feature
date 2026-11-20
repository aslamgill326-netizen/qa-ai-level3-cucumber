
Feature: Registration validation and account lifecycle

  @ui @negative @p1
  Scenario: Registration with missing required fields
    Given the Automation Exercise application is available
    When I submit registration with missing required fields
    Then the registration form should reject the submission

  @ui @p1
  Scenario: Delete a disposable registered account
    Given the Automation Exercise application is available
    And I have registered a disposable user account
    When I delete my disposable account
    Then the account should be deleted successfully
