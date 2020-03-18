var ineed = require('ineed')
var http = require('http');
const request = require('request');
const stripHtml = require("string-strip-html");

function transformToJson(words){
  let markers = words.split("var marker")
  let icons = words.split("var icon")
  // let regexMarker = /([^\[]*)\]/ig;
  let regexMarker = /(L.marker*[\s\S]*)\]\)/ig;
  let regexIcon = /(L.AwesomeMarkers*[\s\S]*)\)/ig;
  let regexInfo = /(bindPopup*[\s\S]*)\'/ig;
  let r_coordinates = []
  let r_colors = []
  let r_info = []
  // console.log(markers.length)
  markers.forEach((marker,k)=>{
    // console.log(v)
    if((coordinates = regexMarker.exec(marker)) !== null){
      let coord = coordinates[1].replace('L.marker([', '').replace(/\s/,'').split(',')
      r_coordinates.push(coord)
    }
  })
  icons.forEach((icon,k)=>{
    let i = icon.split(".setIcon")
    if(i.length > 0 && (_icon = regexIcon.exec(i[0])) !== null){
      let color = /(\{*[\s\S]*)/ig.exec(_icon[0].replace('L.AwesomeMarkers.icon(', '').replace(/\s/,'').replace(')',''));
      let _color = color[0].split(':')[2].replace(/  |\r\n|\n|\r|\t|\s/gm,'').split(',')[0].replace('"','').replace('"','')
      r_colors.push(_color)
    }
  })
  icons.forEach((info,k)=>{
    let j = info.split(".setIcon")
    // console.log(j)

    if((_info = regexInfo.exec(j)) !== null){
      let __info = _info[0].replace('/  |\r\n|\n|\r|\t|\'/gm','').replace("bindPopup(",'').replace(/[\\']/g,'').split('</div>')
      _infodata = [];
      __info.forEach((v,k)=>{
        if(v.includes('<li>')){
          if((v.match(/\<ul\>/g)).length > 1){
            let slice_ul = v.split('</ul>');
            let _slices_ul=[]
            slice_ul.forEach((x,y)=>{
              let slice = x.split('</li>');
              let _slice = [];
              slice.forEach((o,j)=>{
                let s = stripHtml(o)
                if(s)_slice.push(s)
              })
              _slices_ul.push(_slice)
            })
            _infodata.push(_slices_ul)
          }else{
            let slice = v.split('</li>');
            let _slice = [];
            slice.forEach((o,j)=>{
              let s = stripHtml(o)
              if(s)_slice.push(s)
            })
            // __info[k] = _slice
            _infodata.push(_slice)
          }

        }else{
          // __info[k] = stripHtml(v)
          _infodata.push(stripHtml(v))
        }
      })
      // .replace("bindPopup(",'').replace(/\'/,'')
      r_info.push(_infodata)
      // console.log(_infodata)
      // console.log(stripHtml(__info))
    }
  })
  let refactor_info = [];
  r_info.forEach((v,k)=>{
    refactor_info.push({
      case: v[0],
      data: v[1]
    })
  })
  //Build json
  let results = [];
  r_coordinates.forEach((v,k)=>{
    let case_type = 'ODP';
    switch(r_colors[k]){
      case 'blue': case_type = 'odp';break;
      case 'orange': case_type = 'pdp';break;
      case 'red': case_type = 'positif';break;
      default: break;
    }
    let item = {
      coordinates:[parseFloat(v[0]), parseFloat(v[1])],
      case_type: case_type,
      details: refactor_info[k]
    }
    results.push(item)
  })
  return results;
}
http.createServer(function (_req, _res) {
  request.get('https://corona.jogjaprov.go.id/map-covid-19-diy', {"rejectUnauthorized": false}, function(err, res, body) {
      let collected = ineed.collect.jsCode.fromHtml(body);
      let results = transformToJson(collected.jsCode[1]);
      _res.setHeader('Content-Type', 'application/json');
      _res.write(JSON.stringify(results));
      _res.end();
  });
}).listen(234);
console.log('Server at localhost')
