/* ===== TRIANGLE LABELER v2 (orientation + 7-box label, elev/depr) ===== */


var LABREL={sin:{rel:['opp','hyp'],dis:'adj'},tan:{rel:['opp','adj'],dis:'hyp'}};
var LABNM={opp:'opposite',adj:'adjacent',hyp:'hypotenuse',theta:'\u03B8'};
var VBW=340,VBH=250;
function lU(a,b){var dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1;return[dx/n,dy/n];}
function lMid(s){return[(s[0][0]+s[1][0])/2,(s[0][1]+s[1][1])/2];}
function lCen(c){return[(c.R[0]+c.LOW[0]+c.HIGH[0])/3,(c.R[1]+c.LOW[1]+c.HIGH[1])/3];}
function lOff(p,g,d){var dx=p[0]-g[0],dy=p[1]-g[1],n=Math.hypot(dx,dy)||1;return[p[0]+dx/n*d,p[1]+dy/n*d];}
function lSeg(c,k){if(k==='opp')return[c.R,c.HIGH];if(k==='adj')return[c.R,c.LOW];return[c.LOW,c.HIGH];}
function lThetaBox(c){return c.type==='elev'?'in_LOW':'out_HIGH';}
function lBoxes(c){ // returns {id:[x,y]} for all 7
  var g=lCen(c),b={};
  ['opp','adj','hyp'].forEach(function(k){var m=lOff(lMid(lSeg(c,k)),g,32);b[k]=m;});
  b.in_LOW=lOff(c.LOW,g,-26); b.out_LOW=lOff(c.LOW,g,40);
  b.in_HIGH=lOff(c.HIGH,g,-26); b.out_HIGH=lOff(c.HIGH,g,40);
  return b;
}
// transforms for orientation candidates
function tCfg(c,fn){var n={type:c.type,ratio:c.ratio};['R','LOW','HIGH'].forEach(function(k){n[k]=fn(c[k]);});return n;}
function tRot180(c){return tCfg(c,function(p){return[VBW-p[0],VBH-p[1]];});}
function tFlipH(c){return tCfg(c,function(p){return[VBW-p[0],p[1]];});}
function tFlipV(c){return tCfg(c,function(p){return[p[0],VBH-p[1]];});}
// SVG of triangle. opts: {arc:bool, labels:bool, mini:bool}
function lSVG(c,opts){
  opts=opts||{};var g=lCen(c);
  var s='<svg viewBox="0 0 '+VBW+' '+VBH+'" preserveAspectRatio="xMidYMid meet">';
  // horizontal sight lines at acute vertices
  [c.LOW,c.HIGH].forEach(function(V){s+='<line x1="'+(V[0]-46)+'" y1="'+V[1]+'" x2="'+(V[0]+46)+'" y2="'+V[1]+'" stroke="#B8B0A2" stroke-width="1.5" stroke-dasharray="5 4"/>';});
  // triangle
  s+='<polygon points="'+c.R[0]+','+c.R[1]+' '+c.LOW[0]+','+c.LOW[1]+' '+c.HIGH[0]+','+c.HIGH[1]+'" fill="#FFFFFF" stroke="#2C2A26" stroke-width="2.5" stroke-linejoin="round"/>';
  // right-angle square at R
  var ul=lU(c.R,c.LOW),uh=lU(c.R,c.HIGH);
  var qp=[c.R[0]+ul[0]*14,c.R[1]+ul[1]*14],pp=[c.R[0]+uh[0]*14,c.R[1]+uh[1]*14],fp=[qp[0]+pp[0]-c.R[0],qp[1]+pp[1]-c.R[1]];
  s+='<path d="M '+qp[0]+' '+qp[1]+' L '+fp[0]+' '+fp[1]+' L '+pp[0]+' '+pp[1]+'" fill="none" stroke="#2C2A26" stroke-width="2"/>';
  if(opts.arc){ // draw the angle marker at its correct spot
    if(c.type==='elev'){ // interior arc at LOW
      var V=c.LOW,ur=lU(V,c.R),uH=lU(V,c.HIGH);
      var pr=[V[0]+ur[0]*24,V[1]+ur[1]*24],pa=[V[0]+uH[0]*24,V[1]+uH[1]*24];
      var cr=(pr[0]-V[0])*(pa[1]-V[1])-(pr[1]-V[1])*(pa[0]-V[0]),sw=cr>0?1:0;
      s+='<path d="M '+V[0]+' '+V[1]+' L '+pr[0]+' '+pr[1]+' A 24 24 0 0 '+sw+' '+pa[0]+' '+pa[1]+' Z" fill="#1B6B93" fill-opacity="0.20" stroke="#1B6B93" stroke-width="2"/>';
    } else { // depression: outside arc at HIGH between horizontal(away from triangle) and hyp
      var V=c.HIGH,uH2=lU(V,c.LOW); // ray toward LOW along hypotenuse
      var horizOut=(g[0]>V[0])?-1:1; // horizontal points away from centroid
      var pr=[V[0]+horizOut*24,V[1]];
      var pa=[V[0]+uH2[0]*24,V[1]+uH2[1]*24];
      var cr=(pr[0]-V[0])*(pa[1]-V[1])-(pr[1]-V[1])*(pa[0]-V[0]),sw=cr>0?1:0;
      s+='<path d="M '+V[0]+' '+V[1]+' L '+pr[0]+' '+pr[1]+' A 24 24 0 0 '+sw+' '+pa[0]+' '+pa[1]+' Z" fill="#1B6B93" fill-opacity="0.20" stroke="#1B6B93" stroke-width="2"/>';
    }
  }
  if(opts.labels){
    var rel=LABREL[c.ratio].rel,b=lBoxes(c);
    rel.forEach(function(k){var p=b[k];s+='<text x="'+p[0]+'" y="'+(p[1]+4)+'" font-family="DM Sans,sans-serif" font-size="12" font-weight="700" fill="#3A7D44" text-anchor="middle">'+LABNM[k]+'</text>';});
    var tp=b[lThetaBox(c)];s+='<text x="'+tp[0]+'" y="'+(tp[1]+5)+'" font-family="DM Sans,sans-serif" font-size="15" font-weight="700" fill="#1B6B93" text-anchor="middle">\u03B8</text>';
  }
  s+='</svg>';return s;
}
function labStatic(q){return '<div class="lab-static">'+lSVG(LABQ[q.id],{arc:true,labels:true})+'</div>';}
var LAB_DIS_MSG={
 hyp:'Hold on \u2014 you don\u2019t need the hypotenuse for this one. This works between the two legs: <b>opposite</b> and <b>adjacent</b>. Leave it in the tray.',
 adj:'Hold on \u2014 you don\u2019t need the adjacent side here. This works between the <b>opposite</b> side and the <b>hypotenuse</b>. Leave it in the tray.'
};
/* ---- STEP 1: ORIENTATION PICKER ---- */
function mountOrientation(qid){
  var host=document.getElementById('lab-'+qid);if(!host||host.dataset.mounted==='ori')return;host.dataset.mounted='ori';
  var c=LABQ[qid];
  var pr='Read the situation above, then pick the triangle that matches it \u2014 is this angle measured up from the ground or down from a height? Put the right angle, \u03B8, and the horizontal where the problem puts them.';
  var slot=LAB_CORRECT_SLOT[qid],tf=[tRot180,tFlipH,tFlipV],ti=0,cells=[];
  for(var i=0;i<4;i++){if(i===slot){cells.push({ok:true,cfg:c});}else{cells.push({ok:false,cfg:tf[ti](c)});ti++;}}
  var html='<div class="lab-prompt">'+pr+'</div><div class="ori-grid">';
  for(var i=0;i<4;i++){html+='<div class="ori-cell" data-ok="'+(cells[i].ok?1:0)+'" data-i="'+i+'">'+lSVG(cells[i].cfg,{arc:true,mini:true})+'</div>';}
  html+='</div><div class="lab-fb" id="labfb-'+qid+'"></div>';
  host.innerHTML=html;
  var fb=document.getElementById('labfb-'+qid);
  var cs=host.querySelectorAll('.ori-cell');
  for(var i=0;i<cs.length;i++){(function(cell){cell.addEventListener('click',function(){
    if(cell.dataset.ok==='1'){cell.classList.add('ori-ok');S[qid].oriOk=true;setTimeout(function(){render();},350);}
    else{cell.classList.add('ori-bad');fb.className='lab-fb show nudge';fb.innerHTML=(c.type==='elev'?'Not that one. The angle should be <b>inside</b> the triangle at the base, with the ground horizontal beneath it.':'Not that one. A depression angle is <b>outside</b>, off the horizontal at the <b>top</b> \u2014 not inside, not at the bottom.');setTimeout(function(){cell.classList.remove('ori-bad');},500);}
  });})(cs[i]);}
}
/* ---- STEP 2: 7-BOX LABELER ---- */
function mountLabeler(qid){
  var host=document.getElementById('lab-'+qid);if(!host||host.dataset.mounted==='lab')return;host.dataset.mounted='lab';
  var q=null;for(var i=0;i<QS.length;i++){if(QS[i].id===qid){q=QS[i];break;}}
  var c=LABQ[qid],s=S[qid];if(!s.tri)s.tri={placed:{}};
  var rel=LABREL[c.ratio].rel,dis=LABREL[c.ratio].dis,boxes=lBoxes(c),thetaBox=lThetaBox(c);
  var chips=['opp','adj','hyp','theta'];
  var boxIds=['opp','adj','hyp','in_LOW','out_LOW','in_HIGH','out_HIGH'];
  var html='<div class="lab-prompt">Drag each label onto the right box. Where does \u03B8 belong \u2014 inside or outside, top or bottom? Only place the sides this relationship needs.</div>';
  html+='<div class="lab-stage" id="labstage-'+qid+'">'+lSVG(c,null);
  boxIds.forEach(function(id){var p=boxes[id];var isTh=(id.indexOf('in_')===0||id.indexOf('out_')===0);html+='<div class="lab-zone'+(isTh?' ang':'')+'" data-zk="'+id+'" style="left:'+(p[0]/VBW*100).toFixed(2)+'%;top:'+(p[1]/VBH*100).toFixed(2)+'%"></div>';});
  html+='</div><div class="lab-tray" id="labtray-'+qid+'">';
  chips.forEach(function(k){html+='<div class="lab-chip'+(k==='theta'?' theta':'')+'" data-chip="'+k+'">'+LABNM[k]+'</div>';});
  html+='</div><div class="lab-fb" id="labfb-'+qid+'"></div>';
  host.innerHTML=html;
  var stage=document.getElementById('labstage-'+qid),fb=document.getElementById('labfb-'+qid);
  function zEl(k){return stage.querySelector('.lab-zone[data-zk="'+k+'"]');}
  function cEl(k){return host.querySelector('.lab-chip[data-chip="'+k+'"]');}
  function correctBoxFor(chip){if(chip==='theta')return thetaBox;return chip;} // side chip -> same-name side box
  function fill(chip){var bx=correctBoxFor(chip);var z=zEl(bx);if(z){z.classList.add('filled');z.textContent=LABNM[chip];}var ch=cEl(chip);if(ch)ch.classList.add('placed');}
  Object.keys(s.tri.placed).forEach(function(k){if(s.tri.placed[k])fill(k);});
  function showFb(cls,msg){fb.className='lab-fb show '+cls;fb.innerHTML=msg;}
  function complete(){var need=rel.concat(['theta']);for(var i=0;i<need.length;i++){if(!s.tri.placed[need[i]])return false;}return true;}
  function startDrag(chip,e){
    if(chip.classList.contains('placed'))return;e.preventDefault();
    var key=chip.dataset.chip;
    var ghost=document.createElement('div');ghost.className='lab-ghost'+(key==='theta'?' theta':'');ghost.textContent=LABNM[key];document.body.appendChild(ghost);
    var ip=(e.touches?e.touches[0]:e);ghost.style.left=ip.clientX+'px';ghost.style.top=ip.clientY+'px';chip.classList.add('dragging');
    function move(ev){var p=(ev.touches?ev.touches[0]:ev);ghost.style.left=p.clientX+'px';ghost.style.top=p.clientY+'px';
      var zs=stage.querySelectorAll('.lab-zone:not(.filled)');for(var i=0;i<zs.length;i++){var r=zs[i].getBoundingClientRect();zs[i].classList.toggle('hot',p.clientX>=r.left&&p.clientX<=r.right&&p.clientY>=r.top&&p.clientY<=r.bottom);}}
    function up(ev){
      var p=(ev.changedTouches?ev.changedTouches[0]:ev);
      document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);
      if(ghost.parentNode)ghost.parentNode.removeChild(ghost);chip.classList.remove('dragging');
      var zs=stage.querySelectorAll('.lab-zone:not(.filled)'),hit=null;
      for(var i=0;i<zs.length;i++){var r=zs[i].getBoundingClientRect();zs[i].classList.remove('hot');if(p.clientX>=r.left&&p.clientX<=r.right&&p.clientY>=r.top&&p.clientY<=r.bottom)hit=zs[i];}
      var sr=stage.getBoundingClientRect(),over=p.clientX>=sr.left-20&&p.clientX<=sr.right+20&&p.clientY>=sr.top-20&&p.clientY<=sr.bottom+20;
      if(key===dis){if(over||hit)showFb('badger',LAB_DIS_MSG[dis]);return;}
      if(!hit)return;
      var zk=hit.dataset.zk,want=correctBoxFor(key),isAng=(zk.indexOf('in_')===0||zk.indexOf('out_')===0);
      if(zk===want){s.tri.placed[key]=true;fill(key);fb.className='lab-fb';fb.innerHTML='';
        if(complete()){showFb('','\u2713 Triangle set up correctly. On to the values\u2026');fb.style.background='var(--ok-lt)';fb.style.color='var(--ok)';fb.style.borderLeft='3px solid var(--ok)';fb.className='lab-fb show';setTimeout(function(){completeLabeling(qid);},800);}
        return;}
      // wrong placement
      if(key==='theta'){
        if(!isAng){showFb('nudge','\u03B8 marks an <b>angle</b>, not a side \u2014 it goes at a corner.');}
        else if(c.type==='elev'){showFb('nudge','Close, but an <b>elevation</b> angle is <b>inside</b> the triangle at the <b>base</b>. Try the inside corner where the path meets the ground.');}
        else{showFb('nudge','Close, but a <b>depression</b> angle is <b>outside</b>, off the horizontal at the <b>top</b>. Look above the triangle.');}
      } else {
        if(isAng){showFb('nudge','That\u2019s a <b>side</b> label \u2014 it goes on a side, not at an angle.');}
        else{showFb('nudge','Not that side. <b>Opposite</b> is across from the base angle; <b>adjacent</b> is the leg touching it; <b>hypotenuse</b> is across from the square corner.');}
      }
    }
    document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);
  }
  var cs=host.querySelectorAll('.lab-chip');for(var i=0;i<cs.length;i++){(function(ch){ch.addEventListener('pointerdown',function(e){startDrag(ch,e);});})(cs[i]);}
}
function completeLabeling(qid){if(typeof onLabelComplete==="function"){onLabelComplete(qid);return;}var s=S[qid];s.labelOk=true;if(s.step<1)s.step=1;render();}
/* ===== END LABELER v2 ===== */
