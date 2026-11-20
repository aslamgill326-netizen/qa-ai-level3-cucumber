@UI @Authentication
Feature: Authentication
  @P0 @AE-02
  Scenario: Valid login and logout
    Given the Automation Exercise application is available
    And I have registered a disposable user account
    And I am logged out
    When I log in using valid credentials
    Then I should be logged in successfully
    When I log out
    Then I should be redirected to the login page

  @P0 @AE-03
  Scenario: Invalid login
    Given the Automation Exercise application is available
    When I log in using invalid credentials
    Then I should see an invalid credentials error
    And I should remain logged out
