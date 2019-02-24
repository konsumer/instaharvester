const csv = (info, headers) => {
  headers = headers || Object.keys(info[0])
  console.log(headers.join('\t'))

  info.forEach(r => {
    console.log(headers.map(h => r[h]).join('\t'))
  })
}

module.exports = { csv }
