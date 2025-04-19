import { generateClient } from '@aws-amplify/api';
import { sourceConfig, targetConfig } from './amplify-config';

// Create separate clients for source and target
const sourceClient = generateClient({ config: sourceConfig });
const targetClient = generateClient({ config: targetConfig });

export const executeSourceQuery = async (query, variables = {}) => {
  try {
    const response = await sourceClient.graphql({
      query,
      variables
    });
    return response.data;
  } catch (error) {
    console.error('Source GraphQL query error:', error);
    throw error;
  }
};

export const executeTargetQuery = async (query, variables = {}) => {
  try {
    const response = await targetClient.graphql({
      query,
      variables
    });
    return response.data;
  } catch (error) {
    console.error('Target GraphQL query error:', error);
    throw error;
  }
};

export const executeTargetMutation = async (mutation, variables = {}) => {
  try {
    const response = await targetClient.graphql({
      query: mutation,
      variables
    });
    return response.data;
  } catch (error) {
    console.error('Target GraphQL mutation error:', error);
    throw error;
  }
};
