@UI @Authentication
Feature: Duplicate registration prevention
  @P1 @AE-04
  Scenario: Existing email cannot be registered again
    Given the Automation Exercise application is available
    And I have registered a disposable user account
    When I log out
    And I attempt registration again with the same email
    Then I should see a duplicate email error
