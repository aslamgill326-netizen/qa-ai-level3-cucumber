
Feature: Shopping cart management

  @ui @p1
  Scenario: Add a product to cart
    Given I am on the products page
    When I add the first product to my cart
    Then the product should appear in my cart

  @ui @p1
  Scenario: Remove a product from cart
    Given I have added a product to my cart
    When I remove the product from my cart
    Then the product should no longer appear in my cart

  @ui @p2
  Scenario: Update product quantity
    Given I am viewing a product's details
    When I add the product with quantity 3
    Then the cart should show quantity 3 for that product
