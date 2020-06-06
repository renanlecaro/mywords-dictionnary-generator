const fs=require('fs')
const common = JSON.parse(fs.readFileSync('./mywords/common.json').toString()).map(l=>l.to)
fs.writeFileSync('common-russian-words.json', JSON.stringify(common))
