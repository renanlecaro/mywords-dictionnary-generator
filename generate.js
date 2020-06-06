const fs=require('fs')
function readCSV(filename) {
  var str=fs.readFileSync(filename).toString()
  var lines= str.split('\n').map(l=>l.split(/\t/).map(w=>w.trim()))

  const headers=lines[0]
  const result=[]
  lines.slice(1).forEach(l=>{
    const obj={}
    headers.forEach((k, i)=>{
      let v=l[i]||''
      if(v==='0') v=false
      if(v==='1') v=true
      obj[k]=v
    })
    result.push(obj)
  })
  return result.filter(obj=>obj.translations_en && obj.bare)
}

function parseNouns() {

  const finalDict=[]

  readCSV('./openrussian/nouns.csv').forEach(({bare,gender,translations_en, indeclinable,sg_only,
                                  pl_only,pl_nom})=>{

    let from=limitTranslationSize(translations_en)

    if(indeclinable) from+=' (indeclinable)'
    if(sg_only) from+=' (always singular)'
    if(pl_only) from+=' (always plural)'

    const lastLetter= bare[bare.length];
    if(lastLetter==='ь') from+= '('+gender+')'

    finalDict.push({from, to:bare})

    // if(pl_nom){
    //   const fromPlural = limitTranslationSize(translations_en) + ' (plural)'
    //
    //   finalDict.push({from:fromPlural, to:unaccent(pl_nom)})
    // }
  })
  return finalDict
}


function unaccent(str){
  return str.replace(/'/gi,'')
}

const sizeLimit=50
function limitTranslationSize(str){
  if(str.length<sizeLimit) return str
  const result=''
  const meanings=str.split(/; /gi).map(s=>s.split(/, /))
  const variants=[4,3,2,1]
    .map(maxWords=>{
      return meanings.map(words=>words.slice(0, maxWords).join(', ')).join('; ')
    })
  const match= variants.find(v=>v.length<sizeLimit)
  if(match) return match
  return meanings[0][0]

}

function parseVerb() {

  return readCSV('./openrussian/verbs.csv')
    .map(({bare,translations_en,aspect,partner,
            presfut_sg1,presfut_sg2,presfut_sg3,presfut_pl1,presfut_pl2,presfut_pl3})=>{
      return {
        from:limitTranslationSize(translations_en)+' ('+aspect+')',
        to:bare
      }
    })

}

function parseAdj() {
  const list=[]
  readCSV('./openrussian/adjectives.csv')
    .map(({bare,translations_en,comparative, superlative})=>{
      list.push({
        from:limitTranslationSize(translations_en)+' (ajd)',
        to:bare
      });

    })
  return list
}

const final={}

function isRussian(txt){
  const russianLettersCount = txt.replace(/[^тоэкрыйамсбльшдугвпежнхиёюзщцячфъ]/gi,'').length
  const latinLettersCount=txt.replace(/[^a-z]/gi,'')
  return russianLettersCount>latinLettersCount
}



function cleanList(list){
  const result=[]
  list.forEach(({from, to})=> {
    from=from.trim().toLowerCase()
    to=to.trim().toLowerCase().replace(/‐/gi,'-')
    if(!from||!to) return
    result.push({from,to})
  })
  return result
}

function normaliseTo(list) {
  const result=[]
  list.forEach(word=>{

    if(word.to.match(/[^тоэкрыйамсбльшдугвпежнхиёюзщцячфъ -]/)){
      if(word.to.match(/\*[^*]+\*\/[^ ]+( \([^)]+\))*/)){

        const imperfective = word.to.split('*')[1].trim()
        let  perfective = word.to.split('/')[1].replace(/\(.*/gi,'').trim()
          .replace(/-$/, imperfective)
        const notes = word.to.replace(/^[^(]+/,'').trim()

        result.push({
          from:word.from+' '+notes+' (imperfective)',
          to:imperfective
        })
        result.push({
          from:word.from+' '+notes+' (perfective)',
          to:perfective
        })
      }else if(word.to.match(/\*[^*]+\* \([p|i]\)( \([^)]+\))*/)){
        const form=word.to.split('*')[1].trim()
        const perf= word.to.match('(p)')
        const notes = word.to.split(/\([p|i]\)/)[1]
        const formatted = {
          from:word.from+' '+notes+(perf?' (perfective)':' (imperfective)'),
          to:form
        }
        result.push(formatted)
      }else{
        let [_, to, desc] = word.to.split('*')
        if(!to || !desc) return console.log('ignored : '+word.to)
        to=to.trim();
        desc=desc.trim();
        if(!isRussian(desc)){

          result.push({
            from:word.from+desc,
            to
          })
        }else{
          return console.log('ignored : '+word.to)
        }
      }
    }else{
      result.push(word)
    }
  })
  return result
}

function addToFinalDict(list){
  list=cleanList(list)
  // Normalize twice to clean starred words
  list=normaliseTo(list)
  list=normaliseTo(list)

  list.forEach(({from,to})=>{
    if(!final[to]){
      final[to]=from
    }
  })
}

addToFinalDict(parseAdj())
addToFinalDict(parseNouns())
addToFinalDict(parseVerb())


function prebaked(filename){
  return JSON.parse(fs.readFileSync(filename).toString())
}
addToFinalDict(prebaked('mywords/common.json'))
addToFinalDict(prebaked('mywords/alltypes.json'))
addToFinalDict(prebaked('mywords/big.json'))

let asArray=[]
Object.keys(final).forEach(k=>asArray.push({to:k,from:final[k]}))



function wordsStats(list){
  const letterStats={}
  list.forEach(({to})=>{
    to.split('').forEach(letter=>{
      letterStats[letter]=letterStats[letter]||0
      letterStats[letter]++
    })
  })

  console.log(letterStats)
}
wordsStats(asArray)

fs.writeFileSync('dictionnary.json', JSON.stringify(asArray))