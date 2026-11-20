@UI @Authentication
Feature: Disposable account registration
  @P0 @AE-01
  Scenario: Register a disposable user
    Given the Automation Exercise application is available
    And I have registered a disposable user account
    Then I should see the registered account signed in
