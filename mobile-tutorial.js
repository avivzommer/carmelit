// Guidance observes real progress. It never moves the player or unlocks a route.
export function createTutorialProgress(){
 let enabled=true,reachedTop=false,wheelSeen=false,wheelDone=false;
 const cue=(id,title,text,target,gesture='tap',note='')=>({id,title,text,target,gesture,note});
 return {
  hide(){enabled=false;},
  show(){enabled=true;},
  reset(){enabled=true;reachedTop=false;wheelSeen=false;wheelDone=false;},
  update(c){
   const busy=Boolean(c.motion),aboard=c.location?.startsWith('car');
   if(c.pressed[0]&&c.location===c.primary&&c.stop===c.high&&!busy)reachedTop=true;
   if((wheelSeen||c.nearWheel)&&c.stop===c.low&&!busy)wheelDone=true;
   if(wheelSeen&&c.location===c.secondary&&!busy)wheelDone=true;
   if(!enabled||c.complete||c.overview||busy)return null;
   if(!c.pressed[0])return cue('first-fix','Restore the power',aboard?'Step off, then tap the blue cabinet.':'Tap the blue cabinet to make your first repair.','repair0');
   if(!reachedTop){
    if(c.location===c.primary)return cue(c.stop===1?'ride-again':'first-ride','Ride uphill',c.stop===1?'Swipe up once more to reach the upper station.':'Swipe up inside the cart to ride uphill.','ride','swipe','You can also tap the cabin arrows.');
    return cue('first-board','Power restored', 'Tap the open train door to board.','boardPrimary');
   }
   if(!wheelDone&&(c.nearWheel||c.holdingWheel)){
    wheelSeen=true;
    if(c.holdingWheel)return cue('wheel-turn','Call the other cart','Turn clockwise to bring the cart uphill.','wheel','turn','Reverse the turn to send it downhill.');
    return cue('wheel-hold','Call the other cart','Tap the yellow wheel to take hold.','wheel');
   }
   return null;
  }
 };
}

const symbols={
 tap:'<path d="M5 8V4h4m6 0h4v4M11 8v8m0-4 3-1 4 3v6H9l-4-6 3-2 3 3"/>',
 swipe:'<path d="M7 20V4m-4 4 4-4 4 4M17 20V10m-3 3 3-3 3 3"/>',
 turn:'<path d="M20 10a8 8 0 1 0-2 7M20 4v6h-6"/>'
};
export function createTutorialCoach({reducedMotion=false}={}){
 const card=document.createElement('aside');card.id='tutorial-coach';card.dataset.visible='false';card.setAttribute('aria-label','Gameplay guidance');
 const icon=document.createElement('div');icon.className='tutorial-symbol';icon.setAttribute('aria-hidden','true');
 const copy=document.createElement('div'),title=document.createElement('strong'),text=document.createElement('p'),note=document.createElement('small');
 copy.className='tutorial-copy';copy.setAttribute('role','status');copy.setAttribute('aria-live','polite');copy.setAttribute('aria-atomic','true');copy.append(title,text,note);
 card.append(icon,copy);
 const beacon=document.createElement('div');beacon.id='tutorial-beacon';beacon.setAttribute('aria-hidden','true');beacon.hidden=true;beacon.dataset.gesture='tap';
 document.body.append(card,beacon);let key='',visible=false,lastPosition='',lastDock='';
 function glyph(gesture){return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">${symbols[gesture]||symbols.tap}</svg>`;}
 return {
  get visible(){return visible;},
  update(cue,screen=null){
   const nextVisible=Boolean(cue);
   if(nextVisible!==visible){visible=nextVisible;card.dataset.visible=String(visible);}
   if(!cue){if(!beacon.hidden)beacon.hidden=true;return;}
   if(cue.id!==key){key=cue.id;title.textContent=cue.title;text.textContent=cue.text;note.textContent=cue.note;note.hidden=!cue.note;icon.innerHTML=glyph(cue.gesture);beacon.dataset.gesture=cue.gesture;
    if(!reducedMotion)copy.animate([{opacity:0,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});
   }
   if(beacon.hidden!==!screen)beacon.hidden=!screen;
   if(screen){const position=`translate3d(${screen.x.toFixed(1)}px,${screen.y.toFixed(1)}px,0)`;if(position!==lastPosition){lastPosition=position;beacon.style.transform=position;}}
   const dock=screen&&screen.y>screen.height*.65?'top':'bottom';if(dock!==lastDock){lastDock=dock;card.dataset.dock=dock;}
  }
 };
}
