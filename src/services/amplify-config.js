const sourceConfig = {
    aws_project_region: 'us-east-1',
    aws_appsync_graphqlEndpoint: 'https://oavt76dom5d65ntgjesmoyd7ry.appsync-api.us-east-1.amazonaws.com/graphql',
    aws_appsync_region: 'us-east-1',
    aws_appsync_authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    aws_cognito_region: 'us-east-1',
    aws_user_pools_id: 'us-east-1_DGieUt2Tg',
    aws_user_pools_web_client_id: '5vb8rthmm69vulq9t2sf8chr8p',
    oauth: {
      domain: 'lexhoa-dev.auth.us-east-1.amazoncognito.com',
      scope: [
        'email',
        'openid',
        'profile',
        'aws.cognito.signin.user.admin'
      ],
      redirectSignIn: 'http://localhost:3000/',
      redirectSignOut: 'http://localhost:3000/',
      responseType: 'code'
    }
  };
  
  const targetConfig = {
    aws_project_region: 'us-east-1',
    aws_appsync_graphqlEndpoint: 'https://ols3xe2mijaxxjnnfw4ljj5ava.appsync-api.us-east-1.amazonaws.com/graphql',
    aws_appsync_region: 'us-east-1',
    aws_appsync_authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    aws_cognito_region: 'us-east-1',
    aws_user_pools_id: 'us-east-1_bQMOu81V8',
    aws_user_pools_web_client_id: '328l2fttuvtr04kom9cbhhjh92',
    oauth: {
      domain: 'lexhoa-staging.auth.us-east-1.amazoncognito.com',
      scope: [
        'email',
        'openid',
        'profile',
        'aws.cognito.signin.user.admin'
      ],
      redirectSignIn: 'http://localhost:3000/',
      redirectSignOut: 'http://localhost:3000/',
      responseType: 'code'
    }
  };
  
  export { sourceConfig, targetConfig };
  