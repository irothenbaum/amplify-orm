module.exports = {
  Blog: {
    JustID: ['id'],
    SuperDeepNested: [
      'id',
      'name',
      {
        posts: [
          'id',
          'title',
          {
            blog: [
              'id',
              'name',
              {
                posts: [
                  'id',
                  'title',
                  {
                    blog: [
                      'id',
                      'name',
                      {
                        posts: [
                          'id',
                          'title',
                          {
                            blog: [
                              'id',
                              'name'
                            ],
                            comments: [
                              'id',
                              'content'
                            ]
                          }
                        ]
                      }
                    ],
                    comments: [
                      'id',
                      'content'
                    ]
                  }
                ]
              }
            ],
            comments: [
              'id',
              'content'
            ]
          }
        ]
      }
    ],
  },
  Comment: {
    WithPostAndBlog: [
      'id',
      'content',
      {
        post: [
          'id',
          'title',
          {
            blog: [
              'id',
              'name'
            ]
          }
        ]
      }
    ]
  },

  Post: {
    WithCommentsAndBlog: [
      'id',
      'title',
      {
        blog: [
          'id',
          'name'
        ],
        comments: [
          'id',
          'content'
        ]
      }
    ]
  }
}
