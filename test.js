const puppeteer = require('puppeteer')
const pThrottle = require('p-throttle')
const json2csv = require('json2csv').parse
const { readFile } = require('fs')

const { INSTAGRAM_USER, INSTAGRAM_PASSWORD } = process.env

// get a 1-per-line text file list as an array
const getList = async (name) => new Promise((resolve, reject) => {
  readFile(`${__dirname}/settings/${name}.txt`, (err, results) => {
    if (err) reject(err)
    resolve(results.toString().split('\n').map(i => i.trim()).filter(i => i && i !== ''))
  })
})

// get a single user from instagram
const getUser = pThrottle(async (username, browser) => {
  try {
    const page = await browser.newPage()
    const u = await page.goto(`https://www.instagram.com/${username.replace(/\.$/, '')}/?__a=1`)
    if (u.status() !== 200) {
      console.error(`${username}: bad status`)
      return
    }
    const text = await u.text()
    const user = JSON.parse(text)
    // .then(r => r.json())
    if (user && user.graphql && user.graphql.user) {
      return user.graphql.user
    } else {
      console.error(`${username}: bad JSON shape`)
    }
  } catch (e) {
    console.error(`${username}: ${e.message}`)
  }
}, 2, 1000)

// login to instagram
const login = async (username, password, browser) => {
  const page = await browser.newPage()
  await page.goto('https://www.instagram.com/accounts/login/')
  await page.waitFor(2500)
  await page.click('input[type="text"]')
  await page.keyboard.type(username)
  await page.click('input[type="password"]')
  await page.keyboard.type(password)
  await page.click('button[type="submit"]')
  await page.waitForNavigation()
}

// build the user-finding regex from positive rules
const getUsersRegex = async () => new RegExp((await getList('rules_username'))
  .map(u => `@([a-z0-9._]*${u}[a-z0-9._]*)`)
  .join('|') + '|' +
  (await getList('rules_preceding'))
    .map(p => `${p} @([a-z0-9._]+)`)
    .join('|'),
'ig')

// build the no-prefix rules regex
const getNotRegex = async () => new RegExp((await getList('rules_notprefix')).map(p => `${p} @([a-z0-9._]+)`).join('|'), 'ig')

// simply find all matches & remove duplicates
const find = (regex, string) => {
  let m
  const out = []
  while ((m = regex.exec(string)) !== null) {
    out.push(m[1])
  }
  return out.filter((v, i, a) => i && a.indexOf(v) === i)
}

const fields = [
  'FirstName',
  'LastName',
  'Organization',
  'Phone',
  'Email',
  'Website',
  'Street',
  'City',
  'State',
  'PostalCode',
  'Country',
  'Source Detail',
  'Account Status',
  'Account Type'
]

const run = async () => {
  const browser = await puppeteer.launch()
  await login(INSTAGRAM_USER, INSTAGRAM_PASSWORD, browser)
  const influencers = (await Promise.all((await getList('influencers')).map(u => getUser(u, browser)))).filter(u => u)
  const rPositive = await getUsersRegex()
  const rNegative = await getNotRegex()
  let text = ''
  influencers.forEach(influencer => {
    if (influencer && influencer.edge_owner_to_timeline_media && influencer.edge_owner_to_timeline_media.edges) {
      influencer.edge_owner_to_timeline_media.edges.forEach(e => {
        if (e && e.node && e.node.edge_media_to_caption && e.node.edge_media_to_caption.edges && e.node.edge_media_to_caption.edges[0] && e.node.edge_media_to_caption.edges[0].node && e.node.edge_media_to_caption.edges[0].node.text) {
          text += '\n' + e.node.edge_media_to_caption.edges[0].node.text
        }
      })
    }
  })
  const data = (await Promise.all(find(rPositive, text.replace(rNegative, ''))
    .filter((u, i, a) => u && a.indexOf(u) === i)
    .map(u => getUser(u, browser))
  ))
    .filter(u => u)
    .map(user => {
      console.log(JSON.stringify(user, null, 2))
      const [FirstName, ...LastName] = user.full_name.split(' ')
      const businessAddress = user.business_address_json ? JSON.parse(user.business_address_json) : { city_name: ', ' }
      const [ City, State ] = businessAddress.city_name.split(', ')
      console.error(Object.keys(user))
      return {
        FirstName,
        LastName: LastName.join(' '),
        Organization: user.username,
        Phone: user.business_phone_number,
        Email: user.business_email,
        Website: user.external_url,
        Street: businessAddress.street_address,
        City,
        State,
        PostalCode: businessAddress.zip_code,
        Country: businessAddress.country_code,
        'Source Detail': 'Instagram',
        'Account Status': 'Pending Customer',
        'Account Type': 'Trade'
      }
    })
  browser.close()
  // console.log(json2csv(data, { fields }))
}
run()
