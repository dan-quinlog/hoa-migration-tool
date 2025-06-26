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

   const targetConfig = { //prod
    aws_project_region: 'us-east-1',
    aws_appsync_graphqlEndpoint: 'https://tzuyym2jmjehtaesbseawlpe4i.appsync-api.us-east-1.amazonaws.com/graphql',
    aws_appsync_region: 'us-east-1',
    aws_appsync_authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    aws_appsync_apiKey: 'da2-lphxgwhhlrd77mnp3uvgtp3dre',
    aws_cognito_region: 'us-east-1',
    aws_user_pools_id: 'us-east-1_yMI8mp0oH',
    aws_user_pools_web_client_id: '84l1f3ri1v8dh3vmd0pbu06jn',
    oauth: {
      domain: 'lexhoa49625c75-49625c75-main.auth.us-east-1.amazoncognito.com',
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

  /*const targetConfig = { //staging
    aws_project_region: 'us-east-1',
    aws_appsync_graphqlEndpoint: 'https://vgapqco2fbagnjkl4lanfqlj4q.appsync-api.us-east-1.amazonaws.com/graphql',
    aws_appsync_region: 'us-east-1',
    aws_appsync_authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    aws_appsync_apiKey: 'da2-tkf6c7qxjvdufljccqr4rhacie',
    aws_cognito_region: 'us-east-1',
    aws_user_pools_id: 'us-east-1_FHEKnkQoY',
    aws_user_pools_web_client_id: '52ish0kdddgrh94uji05uabvaq',
    oauth: {
      domain: 'lexhoa49625c75-49625c75-stagin.auth.us-east-1.amazoncognito.com',
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
  };*/
  
  export { sourceConfig, targetConfig };
  