
Feature: Product browsing and search

  @ui @p1
  Scenario: View product listing
    Given I am on the products page
    Then I should see the available products

  @ui @p1
  Scenario: Search for an existing product
    Given I am on the products page
    When I search for product "Blue Top"
    Then I should see matching search results for "Blue Top"

  @ui @negative @p1
  Scenario: Search for a nonexistent product
    Given I am on the products page
    When I search for product "zzzz_nonexistent_98765"
    Then no matching products should be displayed

  @ui @p2
  Scenario: View product details
    Given I am on the products page
    When I open the details of the first product
    Then I should see its name price and availability

  @ui @negative @p1
  Scenario: Search products with an empty keyword
    Given I am on the products page
    When I search for a product with an empty keyword
    Then the empty search should be handled correctly

  @ui @navigation @p2
  Scenario: Navigate back to product listing
    Given I am on the products page
    When I open the details of the first product
    And I navigate back to the products page
    Then I should see the available products
