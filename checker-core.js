// ── STATE ──
var S = {};
var activeQ = 0;

function init() {
  S = {};
  for (var i = 0; i < QS.length; i++) {
    var q = QS[i];
    S[q.id] = {step:0, ratioOk:false, correct:false, dismissed:false, skipped:false, value:'', hintsUsed:[], hintsShown:{}};
    if (q.type === 'trig') {
      S[q.id].oriOk = false;
      S[q.id].labelOk = false;
      S[q.id].tri = {placed:{}};
      S[q.id].fields = {opp:'',adj:'',hyp:'',angle:''};
      S[q.id].ratio = '';
      S[q.id].inverse = false;
      S[q.id].result = null;
      S[q.id].calcValue = '';
      S[q.id].calcUnit = '';
      S[q.id].calcFeedback = '';
    }
    if (q.type === 'clearance') {
      S[q.id].calcValue = '';
      S[q.id].calcFeedback = '';
    }
  }
  activeQ = 0;
}

// ── PROGRESSION ──
function stageOk(st) {
  if (st === 0) return true;
  for (var i = 0; i < QS.length; i++) { if (QS[i].stage === st-1 && !S[QS[i].id].dismissed) return false; }
  return true;
}
function qUnlocked(qi) {
  var q = QS[qi];
  if (!stageOk(q.stage)) return false;
  if (qi === 0) return true;
  var p = QS[qi-1];
  if (p.stage !== q.stage) return true;
  return S[p.id].dismissed;
}
function qReachable(qi) {
  // For nav: any question in an unlocked stage is reachable
  return stageOk(QS[qi].stage);
}
function stageDone(st) {
  for (var i = 0; i < QS.length; i++) { if (QS[i].stage === st && !S[QS[i].id].dismissed) return false; }
  return true;
}

// ── HELPERS ──
function inRange(v,ranges) {
  if (!ranges) return true;
  for (var i=0;i<ranges.length;i++){var r=ranges[i];if(Array.isArray(r)&&v>=r[0]&&v<=r[1])return true;}
  return false;
}
function fmt(n) {
  if (Math.abs(n)>=100) return Math.round(n).toLocaleString();
  if (Math.abs(n)>=10) return n.toFixed(1);
  return n.toFixed(4);
}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function copyObj(o){return JSON.parse(JSON.stringify(o));}
function detectUnit(q,s){
  if(q.unitType==='degrees')return 'degrees';
  if(q.unitType==='feet')return 'feet';
  var fk=['opp','adj','hyp'],nv=[];
  for(var i=0;i<fk.length;i++){var tv=(s.fields[fk[i]]||'').toString().trim();if(tv.toLowerCase()==='x'||!tv)continue;var n=parseFloat(tv);if(!isNaN(n))nv.push(n);}
  var small=true;for(var i=0;i<nv.length;i++){if(nv[i]>=100){small=false;break;}}
  return(nv.length>0&&small)?'miles':'feet';
}

function _h(s){var v=5381;for(var i=0;i<s.length;i++){v=((v<<5)+v)+s.charCodeAt(i);v=v&v;}return v>>>0;}

// ── ACTIONS ──
function navTo(qi) {
  if(qi<0||qi>=QS.length)return;
  if(qi>activeQ){for(var j=activeQ;j<qi;j++){if(!S[QS[j].id].dismissed&&!S[QS[j].id].correct)S[QS[j].id].skipped=true;}}
  S[QS[qi].id].skipped=false;
  activeQ=qi;render();window.scrollTo({top:0,behavior:'smooth'});
}
function advStep(id){S[id].step++;render();}
function dismissQ(id){
  S[id].dismissed=true;S[id].skipped=false;
  var qi=-1;for(var i=0;i<QS.length;i++){if(QS[i].id===id){qi=i;break;}}
  if(qi<QS.length-1){activeQ=qi+1;}
  render();window.scrollTo({top:0,behavior:'smooth'});
}
function showHint(id,hid){
  S[id].hintsShown[hid]=true;
  if(S[id].hintsUsed.indexOf(hid)===-1)S[id].hintsUsed.push(hid);
  render();
}
function updField(id,k,v){S[id].fields[k]=v;S[id].result=null;S[id].ratioOk=false;}
function selAns(id,v){S[id].value=v;S[id].correct=false;render();}
function chkSel(id){
  var q=null;for(var i=0;i<QS.length;i++){if(QS[i].id===id){q=QS[i];break;}}
  S[id].correct=(_h(S[id].value)===q.ch);render();
}
function updCalc(id,val){S[id].calcValue=val;S[id].calcFeedback='';}
function updCalcUnit(id,val){S[id].calcUnit=val;S[id].calcFeedback='';}

function clickRatio(id,ratio,inverse){
  var q=null;for(var i=0;i<QS.length;i++){if(QS[i].id===id){q=QS[i];break;}}
  var s=S[id],f=s.fields,ex=q.expected;
  var xField=null,xCount=0,fk=['opp','adj','hyp','angle'];
  for(var i=0;i<fk.length;i++){if((f[fk[i]]||'').toString().toLowerCase().trim()==='x'){xField=fk[i];xCount++;}}
  if(xCount!==1){s.result={error:'Mark exactly one field as "x" \u2014 the value you are solving for.'};render();return;}
  if(xField!==ex.x){s.result={error:'Think about what the question is asking you to find. Which measurement is the unknown?'};render();return;}
  if(xField==='angle'&&!inverse){s.result={error:'You\'re solving for an angle. When you know the sides and need the angle, you need an inverse trig function.'};render();return;}
  if(xField!=='angle'&&inverse){s.result={error:'You\'re solving for a side, not an angle. Use a regular trig ratio (SIN, COS, or TAN) instead of an inverse.'};render();return;}
  var errs={},names={opp:'Opposite',adj:'Adjacent',hyp:'Hypotenuse',angle:'Angle'};
  for(var i=0;i<fk.length;i++){var k=fk[i];if(k===xField)continue;var tv=(f[k]||'').toString().trim();if(!tv)continue;var n=parseFloat(tv);if(isNaN(n)){errs[k]=true;continue;}var expected=(k==='angle')?(ex.angle?[ex.angle]:null):ex[k];if(expected&&!inRange(n,expected))errs[k]=true;}
  if(Object.keys(errs).length>0){var bad=Object.keys(errs).map(function(k){return names[k];}).join(', ');s.result={error:'Check your value for: '+bad+'. Re-read the problem and review your diagram.',ef:errs};render();return;}
  if(ex.ratios.indexOf(ratio)===-1){s.result={error:'That ratio does not connect your angle to the unknown. Think: SOH-CAH-TOA. Which ratio uses the sides you have?'};render();return;}
  var vals={};for(var i=0;i<fk.length;i++){var k=fk[i];var tv=(f[k]||'').trim();if(tv.toLowerCase()==='x'||!tv)continue;vals[k]=parseFloat(tv);}
  var rad=function(d){return d*Math.PI/180;};var ans=null;
  if(xField==='opp'){if(ratio==='sin')ans=vals.hyp*Math.sin(rad(vals.angle));if(ratio==='tan')ans=vals.adj*Math.tan(rad(vals.angle));}
  if(xField==='adj'){if(ratio==='cos')ans=vals.hyp*Math.cos(rad(vals.angle));if(ratio==='tan')ans=vals.opp/Math.tan(rad(vals.angle));}
  if(xField==='hyp'){if(ratio==='sin')ans=vals.opp/Math.sin(rad(vals.angle));if(ratio==='cos')ans=vals.adj/Math.cos(rad(vals.angle));}
  if(xField==='angle'){if(ratio==='sin')ans=Math.asin(vals.opp/vals.hyp)*180/Math.PI;if(ratio==='cos')ans=Math.acos(vals.adj/vals.hyp)*180/Math.PI;if(ratio==='tan')ans=Math.atan(vals.opp/vals.adj)*180/Math.PI;}
  if(ans===null||isNaN(ans)){s.result={error:'Something went wrong. Check your values.'};render();return;}
  var rm={sin:['opp','hyp'],cos:['adj','hyp'],tan:['opp','adj']};var parts=rm[ratio];var eq='';
  if(xField==='angle'){eq=ratio+'\u207B\u00B9( '+vals[parts[0]]+' / '+vals[parts[1]]+' ) = ?';}
  else if(xField===parts[0]){eq=ratio+'('+vals.angle+'\u00B0) \u00D7 '+vals[parts[1]]+' = ?';}
  else if(xField===parts[1]){eq=vals[parts[0]]+' / '+ratio+'('+vals.angle+'\u00B0) = ?';}
  s.ratio=ratio;s.inverse=inverse;s.result={answer:ans,equation:eq};s.ratioOk=true;s.calcValue='';s.calcUnit='';s.calcFeedback='';render();
}

function checkCalc(id){
  var q=null;for(var i=0;i<QS.length;i++){if(QS[i].id===id){q=QS[i];break;}}
  var s=S[id];var typed=parseFloat(s.calcValue);
  if(isNaN(typed)){s.calcFeedback='err:Enter a number.';render();return;}
  var computed=s.result.answer;var computedUnit=detectUnit(q,s);
  var studentVal=typed;
  if(q.unitType==='length'){
    var su=s.calcUnit||'feet';
    if(computedUnit==='feet'&&su==='miles')studentVal=typed*5280;
    if(computedUnit==='miles'&&su==='feet')studentVal=typed/5280;
  }
  var diff=Math.abs(studentVal-computed);var pct=(computed!==0)?(diff/Math.abs(computed))*100:diff;
  if(pct<=2){s.correct=true;s.calcFeedback='ok';}
  else if(pct<=8){s.calcFeedback='warn:Close! Double-check your rounding or make sure your calculator is in degree mode.';}
  else{s.calcFeedback='err:That\'s not matching. Re-enter the equation in your calculator carefully. If you\'re stuck, bring your work to your teacher.';}
  render();
}

function resetQ(id){
  var hu=S[id].hintsUsed;
  S[id]={step:0,oriOk:false,labelOk:false,tri:{placed:{}},ratioOk:false,correct:false,dismissed:false,skipped:false,value:'',hintsUsed:hu,hintsShown:{},
    fields:{opp:'',adj:'',hyp:'',angle:''},ratio:'',inverse:false,result:null,calcValue:'',calcUnit:'',calcFeedback:''};
  render();
}

function updClearance(id,val){S[id].calcValue=val;S[id].calcFeedback='';}

function checkClearance(id){
  var q=null;for(var i=0;i<QS.length;i++){if(QS[i].id===id){q=QS[i];break;}}
  var s=S[id];var typed=parseFloat(s.calcValue);
  if(isNaN(typed)){s.calcFeedback='err:Enter a number.';render();return;}
  var _a=q.bridgeHeight*3+114,_b=q.bridgeHeight*5-10,_c=q.bridgeHeight*3-36,_d=q.bridgeHeight*6-72;
  if(typed>=_a&&typed<=_b){s.correct=true;s.calcFeedback='ok';}
  else if(typed>=_c&&typed<=_d){s.calcFeedback='warn:That\'s in the neighborhood but seems off. Clearance = (height at bridge) \u2212 212. Double-check your subtraction.';}
  else{s.calcFeedback='err:That doesn\'t seem right. Clearance = (your Q7 answer) \u2212 212 feet. Try again, or bring your work to your teacher.';}
  render();
}

// ── RENDER ──
function render(){
  var m=document.getElementById('main');m.innerHTML='';
  var cs=-1;
  for(var qi=0;qi<QS.length;qi++){
    var q=QS[qi];
    if(q.stage!==cs){
      cs=q.stage;
      var stageHasActive=false;for(var k=0;k<QS.length;k++){if(QS[k].stage===q.stage&&k===activeQ){stageHasActive=true;break;}}
      if(stageDone(q.stage)&&!stageHasActive){while(qi<QS.length-1&&QS[qi+1].stage===q.stage)qi++;continue;}
      if(stageHasActive||stageOk(q.stage)){var sh=document.createElement('div');sh.className='sh v';sh.innerHTML='<h2>'+STAGES[q.stage].t+'</h2><p>'+STAGES[q.stage].d+'</p>';m.appendChild(sh);}
    }
    var s=S[q.id];var card=document.createElement('div');
    if(s.dismissed){
      card.className='card done';card.id='c-'+q.id;
      card.innerHTML='<div class="qn">'+q.num+'<span class="done-check">\u2713 Complete</span></div>';
    }else if(s.skipped&&qi!==activeQ){
      card.className='card skipped';card.id='c-'+q.id;
      card.innerHTML='<div class="qn">'+q.num+'<span class="skip-tag">\u25CB Skipped \u2014 tap to return</span></div>';
      (function(idx){card.addEventListener('click',function(){navTo(idx);});})(qi);
    }else if(qi===activeQ){
      card.className='card v';card.id='c-'+q.id;
      var h='<div class="qn">'+q.num+'</div><div class="qp">'+q.prompt+'</div>';
      if(q.type==='trig')h+=renderTrig(q,s,qi);
      else if(q.type==='clearance')h+=renderClearance(q,s,qi);
      else h+=renderSel(q,s,qi);
      card.innerHTML=h;
    }else{continue;}
    m.appendChild(card);
  }
  renderTrack();renderDots();
  var aq=QS[activeQ];
  if(aq&&aq.type==='trig'&&!S[aq.id].labelOk&&!S[aq.id].dismissed){
    if(!S[aq.id].oriOk)mountOrientation(aq.id);else mountLabeler(aq.id);
  }
}

function renderTrig(q,s,qi){
  var h='';
  // Step 1 - LABEL THE TRIANGLE (drag & drop)
  h+='<div class="step show"><div class="step-label">Step 1 \u2014 Set Up the Triangle</div><div class="step-text">'+q.context+'</div>';
  if(!s.labelOk){
    h+='<div class="lab-wrap" id="lab-'+q.id+'"></div>';
  }else{
    h+=labStatic(q);
    h+='<div class="lab-done-note">\u2713 Triangle labeled \u2014 use it as your reference below.</div>';
    if(s.hintsShown.sketch){h+='<div class="hint-text" style="margin-top:10px">'+q.sketch+'</div>';}
    else if(!s.ratioOk&&!s.correct){h+='<div style="text-align:center;margin-top:10px"><button class="btn-hint" onclick="showHint(\''+q.id+'\',\'sketch\')">Need a hint?</button></div>';}
  }
  h+='</div>';
  // Step 2
  if(s.step>=1){
    var ef=(s.result&&s.result.ef)||{};
    h+='<div class="step show"><div class="step-label">Step 2 \u2014 Label What You Know</div><div class="step-text">Fill in the value for each part you know. Put <strong>x</strong> for the unknown. Leave unused fields blank.</div><div class="tri-grid">';
    var fk=['opp','adj','hyp','angle'],fn={opp:'Opposite',adj:'Adjacent',hyp:'Hypotenuse',angle:'Angle'};
    for(var i=0;i<fk.length;i++){var k=fk[i];h+='<div class="tri-field"><label>'+fn[k]+'</label><input type="text" value="'+esc(s.fields[k])+'" oninput="updField(\''+q.id+'\',\''+k+'\',this.value)" class="'+(ef[k]?'field-err':'')+'" '+((s.ratioOk||s.correct)?'readonly ':'')+' placeholder="value or x"></div>';}
    h+='</div>';
    if(s.step===1&&!s.ratioOk&&!s.correct){h+='<button class="btn btn-go" onclick="advStep(\''+q.id+'\')">I\'ve labeled my triangle \u2192</button>';}
    h+='</div>';
  }
  // Step 3
  if(s.step>=2&&!s.ratioOk&&!s.correct){
    h+='<div class="step show"><div class="step-label">Step 3 \u2014 Choose Your Ratio</div><div class="step-text">Which trig ratio connects your angle to the sides you labeled?</div><div class="ratio-row">';
    h+='<button class="ratio-btn" onclick="clickRatio(\''+q.id+'\',\'sin\',false)">SIN</button>';
    h+='<button class="ratio-btn" onclick="clickRatio(\''+q.id+'\',\'cos\',false)">COS</button>';
    h+='<button class="ratio-btn" onclick="clickRatio(\''+q.id+'\',\'tan\',false)">TAN</button>';
    h+='</div><div class="ratio-row">';
    h+='<button class="ratio-btn inv" onclick="clickRatio(\''+q.id+'\',\'sin\',true)">SIN\u207B\u00B9</button>';
    h+='<button class="ratio-btn inv" onclick="clickRatio(\''+q.id+'\',\'cos\',true)">COS\u207B\u00B9</button>';
    h+='<button class="ratio-btn inv" onclick="clickRatio(\''+q.id+'\',\'tan\',true)">TAN\u207B\u00B9</button>';
    h+='</div></div>';
  }
  // Ratio error
  if(s.result&&s.result.error&&!s.ratioOk&&!s.correct){
    h+='<div class="fb err show">\u26A0 '+s.result.error+'<br><br><strong>Bring your work to your teacher for help.</strong></div>';
    h+='<div style="margin-top:10px"><button class="btn btn-reset" onclick="resetQ(\''+q.id+'\')">\u21BA Start Over</button></div>';
  }
  // Step 4 - calculator
  if(s.ratioOk&&!s.correct){
    h+='<div class="step show"><div class="step-label">Step 4 \u2014 Solve with Your Calculator</div>';
    h+='<div class="result-box"><div class="result-eq">'+s.result.equation+'</div></div>';
    h+='<div class="step-text" style="margin-top:12px">Type this into your calculator and enter your answer:</div>';
    h+='<div class="calc-row">';
    var cfClass='';if(s.calcFeedback){if(s.calcFeedback==='ok')cfClass=' c-ok';else if(s.calcFeedback.indexOf('warn:')===0)cfClass=' c-warn';else if(s.calcFeedback.indexOf('err:')===0)cfClass=' c-err';}
    h+='<input type="text" inputmode="decimal" value="'+esc(s.calcValue)+'" placeholder="Your answer" oninput="updCalc(\''+q.id+'\',this.value)" class="'+cfClass.trim()+'">';
    if(q.unitType==='length'){h+='<select onchange="updCalcUnit(\''+q.id+'\',this.value)"><option value="feet"'+(s.calcUnit==='feet'||!s.calcUnit?' selected':'')+'>feet</option><option value="miles"'+(s.calcUnit==='miles'?' selected':'')+'>miles</option></select>';}
    else if(q.unitType==='feet'){h+='<span style="font-size:.85rem;color:var(--muted);font-weight:500">feet</span>';}
    else{h+='<span style="font-size:.85rem;color:var(--muted);font-weight:500">degrees</span>';}
    h+='<button class="btn btn-go" onclick="checkCalc(\''+q.id+'\')">Check</button></div>';
    if(s.calcFeedback&&s.calcFeedback!=='ok'){var fbType=s.calcFeedback.indexOf('warn:')===0?'warn':'err';var fbMsg=s.calcFeedback.split(':').slice(1).join(':');h+='<div class="fb '+fbType+' show" style="margin-top:10px">'+fbMsg+'</div>';}
    h+='</div>';
  }
  // Success
  if(s.correct){
    var du=detectUnit(q,s);var doneEq=s.result.equation.replace('= ?','= '+fmt(s.result.answer)+' '+du);
    h+='<div class="step show"><div class="result-box"><div class="result-eq">'+doneEq+'</div><div class="result-val">\u2713 '+s.calcValue+' '+(s.calcUnit||du)+'</div></div>';
    h+='<div class="fb ok show" style="margin-top:12px">\u2713 Nice work! Your setup and calculation are correct.</div>';
    h+='<div style="margin-top:10px"><button class="btn btn-next" onclick="dismissQ(\''+q.id+'\')">'+(qi<QS.length-1?'Continue':'Finish')+' \u2192</button></div></div>';
  }
  return h;
}

function renderSel(q,s,qi){
  var h='<div class="step show">';
  if(s.hintsShown.hint){h+='<div class="hint-text" style="margin-bottom:12px">'+q.hint+'</div>';}
  else if(!s.correct){h+='<div style="margin-bottom:12px"><button class="btn-hint" onclick="showHint(\''+q.id+'\',\'hint\')">Need a hint?</button></div>';}
  h+='<select onchange="selAns(\''+q.id+'\',this.value)" class="'+(s.correct?'s-ok':(s.value&&s.value!==q.options[0]&&!s.correct?'s-err':''))+'">';
  for(var i=0;i<q.options.length;i++){var o=q.options[i];h+='<option value="'+esc(o)+'" '+(s.value===o?'selected':'')+'>'+o+'</option>';}
  h+='</select>';
  if(!s.correct){h+='<div style="margin-top:10px"><button class="btn btn-go" onclick="chkSel(\''+q.id+'\')">Check</button></div>';}
  if(s.correct){h+='<div class="fb ok show" style="margin-top:10px">\u2713 That\'s right!</div><div style="margin-top:10px"><button class="btn btn-next" onclick="dismissQ(\''+q.id+'\')">Continue \u2192</button></div>';}
  else if(s.value&&s.value!==q.options[0]){h+='<div class="fb err show" style="margin-top:10px">Not quite \u2014 try again.</div>';}
  h+='</div>';return h;
}

function renderClearance(q,s,qi){
  var h='<div class="step show">';
  h+='<div class="step-text">Air traffic controllers reported seeing the plane clear the George Washington Bridge by less than 900 feet. The bridge is '+q.bridgeHeight+' feet tall.</div>';
  if(s.hintsShown.hint){h+='<div class="hint-text">'+q.hint+'</div>';}
  else if(!s.correct){h+='<div style="margin-bottom:12px"><button class="btn-hint" onclick="showHint(\''+q.id+'\',\'hint\')">Need a hint?</button></div>';}
  if(!s.correct){
    h+='<div class="step-text" style="font-weight:600">How many feet of clearance did the plane have above the bridge?</div>';
    h+='<div class="calc-row">';
    var cfClass='';if(s.calcFeedback){if(s.calcFeedback==='ok')cfClass=' c-ok';else if(s.calcFeedback.indexOf('warn:')===0)cfClass=' c-warn';else if(s.calcFeedback.indexOf('err:')===0)cfClass=' c-err';}
    h+='<input type="text" inputmode="decimal" value="'+esc(s.calcValue)+'" placeholder="Clearance in feet" oninput="updClearance(\''+q.id+'\',this.value)" class="'+cfClass.trim()+'">';
    h+='<span style="font-size:.85rem;color:var(--muted);font-weight:500">feet</span>';
    h+='<button class="btn btn-go" onclick="checkClearance(\''+q.id+'\')">Check</button></div>';
    if(s.calcFeedback&&s.calcFeedback!=='ok'){var fbType=s.calcFeedback.indexOf('warn:')===0?'warn':'err';var fbMsg=s.calcFeedback.split(':').slice(1).join(':');h+='<div class="fb '+fbType+' show" style="margin-top:10px">'+fbMsg+'</div>';}
  }
  if(s.correct){
    var val=parseFloat(s.calcValue);
    h+='<div class="result-box" style="margin-top:12px"><div class="result-eq">Plane height at bridge \u2212 Bridge height = Clearance</div><div class="result-val">\u2248 '+Math.round(val)+' feet of clearance</div></div>';
    if(val<q.atcReport){h+='<div class="fb ok show" style="margin-top:12px">\u2713 Your answer confirms the controllers\' report \u2014 the plane cleared the bridge by less than '+q.atcReport+' feet. An incredibly tight margin.</div>';}
    else{h+='<div class="fb warn show" style="margin-top:12px">Your answer of '+Math.round(val)+' feet is right at the '+q.atcReport+'-foot mark. Due to rounding, the actual clearance was likely just under '+q.atcReport+' feet \u2014 confirming the controllers\' report. Either way, an incredibly tight margin.</div>';}
    // Flight path summary
    h+='<div style="margin-top:16px;padding:14px;background:var(--bg);border-radius:10px;border:1px solid var(--border)">';
    h+='<div style="font-size:.8rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Your Flight Path Summary</div>';
    var sm=[{id:'q1',label:'Height at bird strike'},{id:'q2',label:'Distance climbed to max altitude'},{id:'q5',label:'Descent angle'},{id:'q6',label:'Altitude drop during 3\u00B0 descent'},{id:'q7',label:'Height at GW Bridge'}];
    for(var i=0;i<sm.length;i++){var ss=S[sm[i].id];if(ss&&ss.correct&&ss.result&&ss.result.answer!==undefined){var sq=null;for(var j=0;j<QS.length;j++){if(QS[j].id===sm[i].id){sq=QS[j];break;}}var du=sq?detectUnit(sq,ss):'feet';h+='<div style="font-size:.88rem;padding:3px 0;color:var(--text)">'+sm[i].label+': <strong>'+fmt(ss.result.answer)+' '+du+'</strong></div>';}}
    h+='</div>';
    h+='<div style="margin-top:12px"><button class="btn btn-next" onclick="dismissQ(\''+q.id+'\')">Finish \u2192</button></div>';
  }
  h+='</div>';return h;
}

// ── HEADER DOTS ──
function renderDots(){
  var c=document.getElementById('hdrDots');c.innerHTML='';
  for(var i=0;i<QS.length;i++){
    var q=QS[i],s=S[q.id];
    var dot=document.createElement('div');dot.className='qd';
    if(s.dismissed){dot.classList.add('done');}
    else if(s.skipped){dot.classList.add('skip');}
    else if(i===activeQ){dot.classList.add('active');}
    dot.textContent=(i+1);
    (function(idx){dot.addEventListener('click',function(){navTo(idx);});})(i);
    c.appendChild(dot);
  }
}

// ── FLIGHT TRACK ──
function renderTrack(){
  var t=document.getElementById('ft');if(!t)return;t.innerHTML='';
  if(!NODES||NODES.length===0){return;}
  // Find which node the active question belongs to
  var activeNode=0;
  for(var i=NODES.length-1;i>=0;i--){if(activeQ>=NODE_Q_MAP[i]){activeNode=i;break;}}
  var nodeSkipped=[];
  for(var i=0;i<NODES.length;i++){var startQ=NODE_Q_MAP[i];var endQ=(i<NODES.length-1)?NODE_Q_MAP[i+1]:QS.length;var hs=false;for(var j=startQ;j<endQ;j++){if(S[QS[j].id].skipped){hs=true;break;}}nodeSkipped.push(hs);}
  // Check which nodes are fully complete
  var nodeDone=[];
  for(var i=0;i<NODES.length;i++){var startQ=NODE_Q_MAP[i];var endQ=(i<NODES.length-1)?NODE_Q_MAP[i+1]:QS.length;var allDone=true;for(var j=startQ;j<endQ;j++){if(!S[QS[j].id].dismissed){allDone=false;break;}}nodeDone.push(allDone);}
  for(var i=0;i<NODES.length;i++){
    if(i>0){var ln=document.createElement('div');ln.className='fl'+(nodeDone[i-1]?' c':'');t.appendChild(ln);}
    var n=document.createElement('div');var cls='fn';
    if(nodeDone[i])cls+=' c';
    else if(i===activeNode)cls+=' a';
    if(nodeSkipped[i])cls+=' sk';
    n.className=cls;
    n.innerHTML='<div class="d"></div><div class="l">'+NODES[i]+'</div>';
    (function(idx){n.addEventListener('click',function(){var tq=NODE_Q_MAP[idx];for(var j=tq;j<QS.length;j++){if(!S[QS[j].id].dismissed){navTo(j);return;}}navTo(tq);});})(i);
    t.appendChild(n);
  }
}

function initChecker(){init();for(var i=0;i<QS.length;i++){if(!S[QS[i].id].dismissed){activeQ=i;break;}}render();}
