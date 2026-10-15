// Guidance observes real progress. It never moves the player or unlocks a route.
export function createTutorialProgress(){
 let enabled=true,reachedTop=false,wheelSeen=false,wheelDone=false,celebrate=0,manual=false;
 const cue=(id,title,text,target,gesture='tap',note='')=>({id,title,text,target,gesture,note});
 return {
  hide(){enabled=false;manual=false;},
  show(){enabled=true;manual=true;},
  reset(){enabled=true;reachedTop=false;wheelSeen=false;wheelDone=false;celebrate=0;manual=false;},
  update(c,dt=0){
   const busy=Boolean(c.motion),aboard=c.location?.startsWith('car');
   if(!reachedTop&&c.pressed[0]&&c.location===c.primary&&c.stop===c.high&&!busy){reachedTop=true;celebrate=2.6;}
   if(wheelSeen&&c.location===c.secondary&&!busy)wheelDone=true;
   const celebrating=celebrate>0;celebrate=Math.max(0,celebrate-dt);
   if(!enabled||c.complete||c.overview||busy)return null;
   if(!c.pressed[0])return cue('first-fix','Restore the power',aboard?'Step off, then tap the blue cabinet.':'Tap the blue cabinet to make your first repair.','repair0');
   if(!reachedTop){
    if(c.location===c.primary)return cue(c.stop===1?'ride-again':'first-ride','Ride uphill',c.stop===1?'Swipe up once more to reach the upper station.':'Swipe up inside the cart to ride uphill.','ride','swipe','You can also tap the cabin arrows.');
    return cue('first-board','Power restored', 'Tap the open train door to board.','boardPrimary');
   }
   if(celebrating)return cue('first-lesson-done','You’ve got it','Tap the open door to step off and explore.','boardPrimary','done');
   if(!wheelDone&&(c.nearWheel||c.holdingWheel)){
    wheelSeen=true;
    if(c.stop===c.low)return cue('wheel-arrived','Your cart is here','Tap its open door to board.','boardSecondary');
    if(c.holdingWheel)return cue('wheel-turn','Call the other cart','Turn clockwise to bring the cart uphill.','wheel','turn','Reverse the turn to send it downhill.');
    return cue('wheel-hold','Call the other cart','Tap the yellow wheel to take hold.','wheel');
   }
   if(manual){
    if(!c.pressed[1])return cue('help-square','Explore the upper station','Look for the blue cabinet with the square mark.','repair1');
    if(!c.pressed[2])return cue('help-service','One repair left','Explore the underground maintenance passage.',null,'explore');
    return cue('help-exit','The line is ready','Board a cart and ride toward the open exit.',null,'swipe');
   }
   return null;
  }
 };
}

const symbols={
 tap:'<circle cx="12" cy="10" r="7"/><path d="M12 9v9m0-5 3-1 4 3v5H9l-3-5 2-2 4 3"/>',
 swipe:'<path d="M8 21V3m-4 4 4-4 4 4M16 19v-8m-3 3 3-3 3 3"/>',
 turn:'<path d="M20 10a8 8 0 1 0-2 7M20 4v6h-6"/>',
 done:'<path d="m5 12 4 4L20 5"/>',
 explore:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Zm6-3v15m6-12v15"/>'
};
export function createTutorialCoach({onDismiss,reducedMotion=false}={}){
 const card=document.createElement('aside');card.id='tutorial-coach';card.dataset.visible='false';card.setAttribute('aria-label','Gameplay guidance');
 const icon=document.createElement('div');icon.className='tutorial-symbol';icon.setAttribute('aria-hidden','true');
 const copy=document.createElement('div'),title=document.createElement('strong'),text=document.createElement('p'),note=document.createElement('small');
 copy.className='tutorial-copy';copy.setAttribute('role','status');copy.setAttribute('aria-live','polite');copy.setAttribute('aria-atomic','true');copy.append(title,text,note);
 const close=document.createElement('button');close.type='button';close.className='tutorial-dismiss';close.setAttribute('aria-label','Hide guidance');close.title='Hide guidance';close.textContent='×';close.onclick=onDismiss;
 card.append(icon,copy,close);
 const beacon=document.createElement('div');beacon.id='tutorial-beacon';beacon.setAttribute('aria-hidden','true');beacon.hidden=true;beacon.dataset.gesture='tap';
 document.body.append(card,beacon);let key='',visible=false,lastPosition='',lastDock='';close.inert=true;
 function glyph(gesture){return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">${symbols[gesture]||symbols.tap}</svg>`;}
 return {
  get visible(){return visible;},
  update(cue,screen=null){
   const nextVisible=Boolean(cue);
   if(nextVisible!==visible){visible=nextVisible;card.dataset.visible=String(visible);close.inert=!visible;}
   if(!cue){if(!beacon.hidden)beacon.hidden=true;return;}
   if(cue.id!==key){key=cue.id;title.textContent=cue.title;text.textContent=cue.text;note.textContent=cue.note;note.hidden=!cue.note;icon.innerHTML=glyph(cue.gesture);beacon.innerHTML=glyph(cue.gesture);beacon.dataset.gesture=cue.gesture;
    if(!reducedMotion)copy.animate([{opacity:0,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});
   }
   if(beacon.hidden!==!screen)beacon.hidden=!screen;
   if(screen){const position=`translate3d(${screen.x.toFixed(1)}px,${screen.y.toFixed(1)}px,0)`;if(position!==lastPosition){lastPosition=position;beacon.style.transform=position;}}
   const dock=screen&&screen.y>screen.height*.65?'top':'bottom';if(dock!==lastDock){lastDock=dock;card.dataset.dock=dock;}
  }
 };
}
