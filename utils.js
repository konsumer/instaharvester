const csv = info => {
  const headers = Object.keys(info[0])
  console.log(headers.join('\t'))

  info.forEach(r => {
    console.log(Object.values(r).join('\t'))
  })
}

module.exports = { csv }
