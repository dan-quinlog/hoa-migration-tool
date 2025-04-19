# HOA Migration Tool

A tool for migrating HOA data between databases.

## Purpose

This tool facilitates the migration of data from a legacy HOA database to a new database structure. It handles:

- Profile/Owner data migration
- Property/Unit data migration
- Payment history migration
- Data verification between source and target

## Usage

1. Configure source and target database connections
2. Sign in to source database
3. Fetch source data
4. Sign out from source database
5. Sign in to target database
6. Load data to target
7. Verify migration

## Technical Details

- Built with React and AWS Amplify
- Uses GraphQL for database interactions
- Implements data transformation between legacy and new schemas
- Provides verification to ensure data integrity

## Notes

This tool is intended for internal use during the migration process.