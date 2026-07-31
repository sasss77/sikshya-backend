const fs = require('fs');
const lines = fs.readFileSync('coverage/lcov.info', 'utf8').split('\n');
let sl=0, sf=0, bl=0, bf=0, fl=0, ff=0;
for(const l of lines){
  if(l.startsWith('LH:')) sl+=parseInt(l.slice(3));
  else if(l.startsWith('LF:')) sf+=parseInt(l.slice(3));
  else if(l.startsWith('BRH:')) bl+=parseInt(l.slice(4));
  else if(l.startsWith('BRF:')) bf+=parseInt(l.slice(4));
  else if(l.startsWith('FNH:')) fl+=parseInt(l.slice(4));
  else if(l.startsWith('FNF:')) ff+=parseInt(l.slice(4));
}
console.log('Lines: ' + (sl/sf*100).toFixed(2));
console.log('Branches: ' + (bl/bf*100).toFixed(2));
console.log('Functions: ' + (fl/ff*100).toFixed(2));

let file_bl=0, file_bf=0, currentFile=''; const files=[];
for(const l of lines){
  if(l.startsWith('SF:')) { currentFile=l.slice(3); file_bl=0; file_bf=0; }
  else if(l.startsWith('BRH:')) { file_bl=parseInt(l.slice(4)); }
  else if(l.startsWith('BRF:')) { file_bf=parseInt(l.slice(4)); files.push({file: currentFile, pct: file_bf ? (file_bl/file_bf*100) : 100}); }
}
console.log('Low branch coverage files:', files.sort((a,b)=>a.pct-b.pct).filter(x=>x.pct<80).slice(0, 15));
