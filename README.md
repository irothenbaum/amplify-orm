# Amplify ORM

## Building
Use like:

`node scripts/build [config file] [output directory]`

i.e.: `node scripts/build ./amplify-orm.config.js ./build`

### Output
The output will be a folder with a bunch of models

### Requirements
- `node ^14.14.0`

 
## RunTime

### Project Dependencies
- "graphql-tag": "^2.12.6"

### Initialization
Before you can use the collections, you must first initialize the data layer using the `collections/index` -> `init` function.
This function takes a single argument: the Amplify config file.
It's recommended to initialize your collections as soon as possible after authentication is established.

Example initialization call:
```javascript
const AWSAppSyncClient = require('aws-appsync').default
const config = require('../src/aws-exports.js')
const {init} = require('../build/collections')

const client = new AWSAppSyncClient(
  {
    url: config.aws_appsync_graphqlEndpoint,
    region: config.aws_appsync_region,
    auth: {
      type: 'AMAZON_COGNITO_USER_POOLS',
      jwtToken: '/* Your auth Token */',
    },
    disableOffline: true,
  }
)

// handle session/token refresh in this callback function
init(() => client)
```

### Using Collections
Use like:
```javascript
const {Post} = require('./build/collections')

//....

// load all posts with all fields (excluding connections)
const allPosts = await Post.listPosts()

// using a custom fragment
const allPostsWithAuthor = await Post.as(Post.WithAuthor).listPosts()

// using an indexed query
const myPosts = await Post.listPostsByAuthor({authorId: 'xxxx'})

// combining fragment and query to load all posts with author data in last 24 hours
const recentPosts = await Post.as(Post.WithAuthor).listPosts({
  input: {
    createdAt: {
      gt: new Date(Date.now() - 86400000)
    }
  }
})
```

## Configuration

### Custom Fragments

Fragments define the structure of the response payload. 
You can define custom fragments (name and payload) by setting the `fragments` field on your config object.

The fragments object is multi-dimensional map that follows a `Model` -> `Fragment Name` -> `Fields` hierarchy.
For example:

```javascript
const fragments = {
  User: {
    ProfileOnly: ['firstName', 'lastName', 'birthday'],
  },
}

```

This would generate a GraphQL fragment like:

```graphql
fragment UserProfileOnly on User {
    firstName
    lastName
    birthday
}
```

#### Nested payloads
Every collection's default fragment includes all fields and excludes all connections. 
Custom Fragments can be defined to include associated models.

Include an object keyed by connection name with a value including the fields of that model you'd like to query.
Multiple models can be defined in a single object. 
And this pattern can be nested to include connections on related models as well. 
For example: 

```javascript
const fragments = {
  User: {
    WithEmployer: [
      'id', 
      'firstName', 
      {
        employer: [
          'id',
          'address',
          {
            industry: [
              'id',
              'label'
            ],
            // products is a one-to-many connection, but its definition is the same as a one-to-one connection
            products: [
              'id',
              'label'
            ]
          }
        ]
      }
    ],
  },
}

```

This would generate a GraphQL fragment like:

```graphql
fragment UserWithEmployer on User {
    id
    firstName
    employer {
        id
        address
        industry {
            id
            label
        }
        products {
           items {
               id
               label
           } 
           nextToken
        }
    }
}
```

Notice the `one to many` association between employer and products is handled automatically and abstracted from the fragment definition.

### TODO:
- ID input types should be treated like strings
- Output folder should be specified in the config file, not the second CLI param
