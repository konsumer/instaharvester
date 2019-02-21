const puppeteer = require('puppeteer')

const { INSTAGRAM_USER, INSTAGRAM_PASSWORD } = process.env

const sourceAccounts = [
  'dominomag',
  'ruemagazine'
]

const rAccounts = /@([a-zA-Z0-9._]+)/gm

const login = async (username, password, browser) => {
  const page = await browser.newPage()
  await page.goto('https://www.instagram.com/accounts/login/')

  /* Click on the username field using the field selector */
  await page.waitFor(2500)
  await page.click('input[type="text"]')
  await page.keyboard.type(username)
  await page.click('input[type="password"]')
  await page.keyboard.type(password)
  await page.click('button[type="submit"]')
  await page.waitForNavigation()
}

const getUser = async (username, browser) => {
  const page = await browser.newPage()
  try {
    return page.goto(`https://www.instagram.com/${username}/?__a=1`).then(r => r.json()).then(d => d.graphql.user)
  } catch (e) {
    console.error(e.message)
  }
}

;(async () => {
  const browser = await puppeteer.launch()
  await login(INSTAGRAM_USER, INSTAGRAM_PASSWORD, browser)
  const source = await Promise.all(sourceAccounts.map(async username => getUser(username, browser)))

  // find all referenced twitter accounts
  const posts = source.reduce((p, influencer) => {
    const posts = influencer.edge_owner_to_timeline_media.edges.map(e => {
      const text = e.node.edge_media_to_caption.edges[0].node.text
      const found = []
      let m
      while ((m = rAccounts.exec(text)) !== null) {
        if (m.index === rAccounts.lastIndex) { rAccounts.lastIndex++ }
        if (m && m[1]) {
          found.push(m[1].replace(/\.$/, ''))
        }
      }
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

  const headers = Object.keys(info[0])
  console.log(headers.join('\t'))

  info.forEach(r => {
    console.log(Object.values(r).join('\t'))
  })

  browser.close()
})()
