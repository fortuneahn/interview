const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
class Element{constructor(){this.value='';this.disabled=false;this.hidden=false;this.textContent='';this.innerHTML='';this.style={};this.classList={toggle(){}};this.options=[];}addEventListener(){}scrollIntoView(){}focus(){}}
const ids={},get=id=>ids[id]??=new Element();get('auto').checked=true;get('count').value='5';get('mode').value='practice';get('rate').value='.95';let starts=0,utterance,rec;
class Recognition{constructor(){this.events={};rec=this;}addEventListener(name,f){this.events[name]=f;if(name==="start")f();}start(){starts++;this.onstart();this.events.start?.();}stop(){this.onend();}}
const w={document:{getElementById:get},addEventListener(){},localStorage:{getItem:()=>null,setItem(){}},setInterval:()=>1,clearInterval(){},setTimeout,clearTimeout,confirm:()=>true,console,Date,Math,SpeechRecognition:Recognition,SpeechSynthesisUtterance:class{constructor(t){this.text=t;}},speechSynthesis:{cancel(){},getVoices:()=>[{name:'Microsoft InJoon',lang:'ko-KR',voiceURI:'injoon'}],addEventListener(){},speak(u){utterance=u;}}};w.window=w;vm.createContext(w);for(const f of ['questions.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'dist',f),'utf8'),w);

(async()=>{
let resolvePermission,stopped=0;
w.navigator={mediaDevices:{getUserMedia:()=>new Promise(resolve=>{resolvePermission=resolve;})}};
const starting=get('start').onclick();assert.equal(starts,0);assert.equal(utterance,undefined,'question waits for permission');assert.equal(get('start').disabled,true);
resolvePermission({getTracks:()=>[{stop(){stopped++;}}]});await starting;assert.equal(stopped,1,'permission stream released');assert.ok(utterance);assert.equal(starts,0);utterance.onend();assert.equal(starts,1);assert.equal(get('mic').disabled,false,'onstart clears pending state');get('mic').onclick();assert.equal(get('submit').disabled,false);
console.log('PASS: microphone permission before question, stream release, automatic start, usable stop button.');
})().catch(e=>{console.error(e);process.exitCode=1;});
