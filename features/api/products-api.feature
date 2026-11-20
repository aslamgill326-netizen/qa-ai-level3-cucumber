
Feature: Products API contract

  @api @p1
  Scenario: Retrieve all products
    When I request the complete products list
    Then the API response code should be 200
    And the products list should not be empty

  @api @p1
  Scenario: Search products using a valid keyword
    When I search products through API using "top"
    Then the API response code should be 200
    And the API search results should contain products

  @api @negative @p1
  Scenario: Search products without a keyword
    When I search products through API without a keyword
    Then the API response code should be 400
    And the API message should contain "Bad request, search_product parameter is missing"

  @api @negative @p2
  Scenario: Send unsupported POST to products list
    When I send POST to the products list API
    Then the API response code should be 405
    And the API message should contain "This request method is not supported"

  @api @p2
  Scenario: Retrieve all brands
    When I request the complete brands list
    Then the API response code should be 200
    And the brands list should not be empty
