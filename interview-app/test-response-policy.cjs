const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const core=require('./dist/app.js'),bank=require('./dist/questions.js');
for(const answer of ['','모르겠습니다.','잘 모르겠습니다.','죄송합니다. 모르겠습니다.','네','보고하겠습니다.','검역관에게 보고하겠습니다.']){const r=core.evaluate(bank[0],answer);assert.equal(r.score,1,answer);assert.equal(r.label,'매우 불만족');assert.ok(r.reason);assert.equal(r.error,undefined);}
assert.equal(core.evaluate(bank.find(q=>q.id==='unknown'),'정확한 반입 기준은 모르겠습니다. 현행 지침과 검역관에게 확인한 뒤 여행객에게 안내하겠습니다.').reason,undefined);
function setup({auto=false,mode='practice',voice=false}={}){
 let now=0,callback,utterance,rec;const stored=new Map(),ids={};
 const get=id=>ids[id]??={value:'',checked:false,disabled:false,hidden:false,textContent:'',innerHTML:'',style:{},classList:{toggle(){}},handlers:{},addEventListener(n,f){this.handlers[n]=f;},scrollIntoView(){},focus(){}};
 get('auto').checked=auto;get('mode').value=mode;get('count').value='5';get('rate').value='.85';
 const w={document:{getElementById:get},Date:class extends Date{static now(){return now;}},addEventListener(){},setInterval:f=>(callback=f,1),clearInterval(){callback=null;},setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},confirm:()=>true,console,Math};
 if(voice){w.SpeechRecognition=class{constructor(){rec=this;}start(){this.onstart();}abort(){this.onend?.();}stop(){this.onend?.();}};w.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};w.speechSynthesis={getVoices:()=>[],addEventListener(){},cancel(){},speak:u=>utterance=u};}
 w.window=w;vm.createContext(w);for(const f of ['questions.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'dist',f),'utf8'),w);
 return {get,w,stored,advance(ms){now+=ms;callback?.();},utterance:()=>utterance,rec:()=>rec};
}
(async()=>{
 const a=setup();await a.get('start').onclick();a.advance(9999);assert.equal(a.get('feedback').hidden,true);a.advance(1);assert.match(a.get('feedback').innerHTML,/매우 불만족/);assert.match(a.get('feedback').innerHTML,/10초 이상/);a.get('finish').onclick();assert.equal(JSON.parse(a.stored.get('dayun-interview-v1'))[0].items[0].result.score,1);
 const b=setup();await b.get('start').onclick();b.advance(9000);b.get('answer').value='검역관에게 사실을 확인한 뒤 정확한 절차를 안내하겠습니다.';b.get('answer').handlers.input();b.advance(9999);assert.equal(b.get('feedback').hidden,true);b.advance(1);assert.match(b.get('feedback').innerHTML,/10초 이상/);
 const c=setup({auto:true,voice:true});await c.get('start').onclick();c.advance(30000);assert.equal(c.get('feedback').hidden,true);c.utterance().onend();c.rec().onspeechstart();c.advance(20000);assert.equal(c.get('feedback').hidden,true);c.rec().onspeechend();c.advance(10000);assert.match(c.get('feedback').innerHTML,/10초 이상/);assert.equal(c.get('mic').disabled,true);
 const d=setup({mode:'exam'});await d.get('start').onclick();d.advance(10000);assert.equal(d.get('progressLabel').textContent,'질문 2 / 5');assert.equal(d.get('feedback').hidden,true);d.get('finish').onclick();assert.match(d.get('summary').innerHTML,/매우 불만족/);
 const e=setup();await e.get('start').onclick();e.get('answer').value='모르겠습니다.';e.get('submit').onclick();assert.match(e.get('feedback').innerHTML,/매우 불만족/);e.get('follow').onclick();e.advance(10000);assert.match(e.get('feedback').innerHTML,/매우 불만족/);e.get('finish').onclick();const item=JSON.parse(e.stored.get('dayun-interview-v1'))[0].items[0];assert.equal(item.followups[0].result.score,1);
 const f=setup({auto:true,voice:true});await f.get('start').onclick();f.utterance().onend();f.rec().onspeechstart();const final=[{transcript:'모르겠습니다.'}];final.isFinal=true;f.rec().onresult({resultIndex:0,results:[final]});f.advance(2000);assert.equal(f.get('feedback').hidden,false,'final short speech must produce feedback without clicking submit or receiving speechend');assert.match(f.get('feedback').innerHTML,/모르겠다는 답변/);
 const g=setup({auto:true,voice:true});await g.get('start').onclick();g.utterance().onend();const interim=[{transcript:'네'}];interim.isFinal=false;g.rec().onresult({resultIndex:0,results:[interim]});g.get('mic').onclick();assert.match(g.get('feedback').innerHTML,/단답형 답변/,'manual microphone stop must preserve interim speech and evaluate it');
 console.log('PASS: unknown/short answers, exact 10-second deadline, activity reset, question/speech exclusion, automatic scoring, exam mode, follow-up history, automatic short speech feedback, interim preservation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
