const regex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/g

module.exports = {
  Comment: {
    afterFind: obj => {
      // add a contentWithLinks props that has all links replaced with anchor tags
      return {...obj, contentWithLinks: obj.content.replaceAll(regex, `<a href="$1">$1</a>`)}
    },
  },
}
