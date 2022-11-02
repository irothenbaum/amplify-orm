## Building
Use like:

`node scripts/build [config file] [output directory]`

i.e.: `node scripts/build ./amplify-orm.config.js ./build`

## Output
The output will be a folder with a bunch of models

##Extensions


## RunTime
Use like:
```javascript
const {fragments, Post} = require('./orm')

//....

const userPosts = await Post.as(fragments.Post.USER).listAll({isDeleted: {eq: false}})
```

## Requirements
- `node ^14.14.0`
