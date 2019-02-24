/**
 * This will collect a bunch of info about users and
 */

// authenticate on instagram, browser is from puppeeer
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

// get info about a insta user, browser is from puppeeer and should already be authenticated with login()
const getUser = async (username, browser) => {
  const page = await browser.newPage()
  try {
    return page.goto(`https://www.instagram.com/${username}/?__a=1`).then(r => r.json()).then(d => d.graphql.user)
  } catch (e) {
    console.error(e.message)
  }
}

module.exports = { login, getUser }
