const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const bank=require('./dist/questions.js'),core=require('./dist/app.js');
const privacy=bank.find(q=>q.id==='privacy');
const bad=core.evaluate(privacy,'개인정보는 업무 목적과 관계없이 외부에 공유하겠습니다. 기관 기준은 지키지 않고 개인적으로 저장하겠습니다.');
assert.equal(bad.score,1);assert.deepEqual(bad.good,[]);
function setup(auto){
 const ids={},get=id=>ids[id]??={value:'',disabled:false,hidden:false,textContent:'',innerHTML:'',style:{},classList:{toggle(){}},addEventListener(){},scrollIntoView(){},focus(){}};
 get('auto').checked=auto;get('count').value='5';get('mode').value='practice';get('rate').value='.85';let requests=0,starts=0,utterance;const storage=new Map();
 const w={document:{getElementById:get},addEventListener(){},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setInterval:()=>1,clearInterval(){},setTimeout,clearTimeout,confirm:()=>true,console,Date,Math,SpeechRecognition:class{start(){starts++;this.onstart();}stop(){this.onend();}},navigator:{mediaDevices:{getUserMedia:async()=>{requests++;throw new Error('denied');}}},SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},speechSynthesis:{cancel(){},getVoices:()=>[],addEventListener(){},speak(u){utterance=u;}}};
 w.window=w;vm.createContext(w);for(const f of ['questions.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'dist',f),'utf8'),w);
 return {get,w,storage,requests:()=>requests,starts:()=>starts,utterance:()=>utterance};
}
(async()=>{
 const denied=setup(true);await denied.get('start').onclick();assert.equal(denied.requests(),1);assert.equal(denied.get('answer').disabled,false);assert.equal(denied.get('auto').checked,false);assert.match(denied.get('status').textContent,/直接|直接入力|직접 입력/);
 const a=setup(false),g=a.get;await g('start').onclick();assert.equal(a.requests(),0);g('replay').onclick();a.utterance().onend();assert.equal(a.starts(),0);
 const q=a.w.QUESTION_BANK.find(q=>q.text===g('question').textContent);g('answer').value=q.model;g('submit').onclick();g('retry').onclick();g('skip').onclick();g('finish').onclick();let record=JSON.parse(a.storage.get('dayun-interview-v1'))[0];assert.equal(record.items[0].skipped,false);assert.equal(record.items[0].answer,q.model);
 const b=setup(false),h=b.get;await h('start').onclick();const qb=b.w.QUESTION_BANK.find(q=>q.text===h('question').textContent);h('answer').value=qb.model;h('submit').onclick();h('retry').onclick();h('answer').value=qb.model;h('submit').onclick();h('follow').onclick();const follow='현장 상황과 담당자의 지시를 먼저 확인하겠습니다. 확인한 절차에 따라 안내하고 필요한 내용을 기록하겠습니다.';h('answer').value=follow;h('submit').onclick();assert.match(h('feedback').innerHTML,/별도 채점 없이/);h('finish').onclick();record=JSON.parse(b.storage.get('dayun-interview-v1'))[0];assert.equal(record.items[0].attempts.length,1);assert.equal(record.items[0].followups[0].answer,follow);assert.equal(record.items[0].result.score,core.evaluate(qb,qb.model).score);assert.match(h('summary').innerHTML,/꼬리질문/);
 console.log('PASS: unsafe privacy answer, denied microphone fallback, text-only start, replay opt-out, retry preservation, attempt history, unscored follow-ups.');
})().catch(e=>{console.error(e);process.exitCode=1;});
