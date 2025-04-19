import { 
    signIn as amplifySignIn, 
    signOut as amplifySignOut, 
    getCurrentUser as amplifyGetCurrentUser 
  } from '@aws-amplify/auth';
  
  // Track authentication state for both environments
  let sourceAuthenticated = false;
  let targetAuthenticated = false;
  
  export const signIn = async (username, password, environment = 'source') => {
    try {
      const user = await amplifySignIn({ username, password });
      
      // Update authentication state for the specific environment
      if (environment === 'source') {
        sourceAuthenticated = true;
      } else {
        targetAuthenticated = true;
      }
      
      return user;
    } catch (error) {
      console.error(`Error signing in to ${environment}:`, error);
      throw error;
    }
  };
  
  export const signOut = async (environment = 'source') => {
    try {
      await amplifySignOut();
      
      // Update authentication state for the specific environment
      if (environment === 'source') {
        sourceAuthenticated = false;
      } else {
        targetAuthenticated = false;
      }
    } catch (error) {
      console.error(`Error signing out from ${environment}:`, error);
      throw error;
    }
  };
  
  export const getCurrentUser = async (environment = 'source') => {
    try {
      const user = await amplifyGetCurrentUser();
      return user;
    } catch (error) {
      console.error(`Error getting current user for ${environment}:`, error);
      return null;
    }
  };
  
  export const isAuthenticated = (environment = 'source') => {
    return environment === 'source' ? sourceAuthenticated : targetAuthenticated;
  };
  
  export const setAuthenticated = (value, environment = 'source') => {
    if (environment === 'source') {
      sourceAuthenticated = value;
    } else {
      targetAuthenticated = value;
    }
  };
  