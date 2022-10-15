## Building
Use like:

`node scripts/build [api folder] [output directory]`

i.e.: `node scripts/build ./amplify/backend/api/example ./orm`

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