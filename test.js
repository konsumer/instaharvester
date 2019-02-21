const puppeteer = require('puppeteer')

const { login, getUser, findUsersInPost } = require('./insta')
const { csv } = require('./utils')

const { INSTAGRAM_USER, INSTAGRAM_PASSWORD } = process.env

const sourceAccounts = [
  'dominomag',
  'ruemagazine'
]

;(async () => {
  const browser = await puppeteer.launch()
  await login(INSTAGRAM_USER, INSTAGRAM_PASSWORD, browser)
  const source = await Promise.all(sourceAccounts.map(async username => getUser(username, browser)))

  // find all referenced twitter accounts
  const posts = source.reduce((p, influencer) => {
    const posts = influencer.edge_owner_to_timeline_media.edges.map(e => {
      const text = e.node.edge_media_to_caption.edges[0].node.text
      const found = findUsersInPost(text)
      return {
        source: influencer.username,
        id: e.node.id,
        found,
        date: (new Date(e.node.taken_at_timestamp * 1000)).toISOString()
      }
    })
    return [...p, ...posts]
  }, [])

  const users = new Set()
  const info = (await Promise.all(posts.map(async post => {
    return Promise.all(post.found.map(async username => {
      try {
        if (!users.has(username)) {
          users.add(username)
          const user = await getUser(username, browser)
          const { source, date } = post
          const { external_url, business_email, business_phone_number, full_name } = user
          return { source, business_email, business_phone_number, full_name, username, external_url, date }
        }
      } catch (e) {
        console.error(`Lost ${username}`)
        console.error(e.message)
      }
    }))
  })))
    .reduce((p, users) => [...p, ...users], [])
    .filter(u => u)

  csv(info)

  browser.close()
})()
