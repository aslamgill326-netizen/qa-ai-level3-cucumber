
Feature: Contact form

  @ui @p2
  Scenario: Submit a valid contact form
    Given I am on the contact us page
    When I submit the contact form with valid details
    Then I should see the contact submission confirmation
