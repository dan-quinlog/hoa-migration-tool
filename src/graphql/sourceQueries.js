export const listOwners = /* GraphQL */ `
  query ListOwners(
    $filter: ModelOwnerFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listOwners(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        email
        phone
        address1
        address2
        city
        state
        zip
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

export const listUnits = /* GraphQL */ `
  query ListUnits(
    $filter: ModelUnitFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUnits(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        unitNumber
        owner {
          id
        }
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

export const listPayments = /* GraphQL */ `
  query ListPayments(
    $filter: ModelPaymentFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listPayments(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        checkDate
        checkNumber
        checkAmount
        invoiceNumber
        invoiceAmount
        ownerPaymentsId
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
