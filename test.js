const puppeteer = require('puppeteer')

const config = require('./config.json')
const { login, getUser } = require('./insta')
const { csv } = require('./utils')

const { INSTAGRAM_USER, INSTAGRAM_PASSWORD } = process.env

// build regex from config
const getUsersRegex = (precedingRules, usernameRules) => {
  let r = usernameRules.map(u => `@([a-z0-9._]*${u}[a-z0-9._]*)`).join('|')
  r += '|' + precedingRules.map(p => `${p} @([a-z0-9._]+)`).join('|')
  return new RegExp(r, 'ig')
}

// simply find all matches & remove duplicates
const find = (regex, string) => {
  let m
  let out = []
  while ((m = regex.exec(string)) !== null) {
    out = out.concat(out, m.slice(1))
  }
  return out.filter((v, i, a) => i && a.indexOf(v) === i)
}

;(async () => {
  const browser = await puppeteer.launch()
  await login(INSTAGRAM_USER, INSTAGRAM_PASSWORD, browser)
  const source = await Promise.all(config.influencers.map(async username => getUser(username, browser)))
  const userRegex = getUsersRegex(config.rules.preceding, config.rules.username)

  // find all interesting usernames in text of message
  const users = new Set()
  source.forEach(influencer => {
    const text = influencer.edge_owner_to_timeline_media.edges.map(e => e.node.edge_media_to_caption.edges[0].node.text).join('\n')
    find(userRegex, text).forEach(u => users.add(u))
  })

  const data = (await Promise.all([...users].map(async username => {
    try {
      const user = await getUser(username, browser)
      const { external_url, full_name, business_phone_number, business_email, business_address_json, connected_fb_page } = user
      const business_address = JSON.parse(business_address_json)
      return {
        url: external_url,
        phone: business_phone_number,
        email: business_email,
        ...business_address,
        instagram: username,
        facebook: connected_fb_page,
        full_name
      }
    } catch (e) {
      console.error(username, e.message)
    }
  }))).filter(u => u)
  browser.close()
  console.log(csv(data, ['url', 'phone', 'email', 'instagram', 'facebook', 'full_name', 'street_address', 'zip_code', 'city_name', 'region_name', 'country_code']))
})()
