const smooth=(a,b,t)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
export function restorationReveal(time,reducedMotion=false){
 const duration=reducedMotion?5.0:5.8;
 const rise=reducedMotion?.25:.65,fall=reducedMotion?4.2:4.8;
 return {surfaceReveal:smooth(0,rise,time)*(1-smooth(fall,duration,time)),complete:time>=duration,duration};
}

// Fit the entire projected model inside the space between controls and caption.
export function fittedView(size,center,width,height,{top=72,bottom=88,left=16,right=16}={}){
 const availableWidth=Math.max(1,width-left-right),availableHeight=Math.max(1,height-top-bottom);
 const scale=Math.min(availableWidth/(size.x*1.06),availableHeight/(size.y*1.06));
 const worldHeight=height/scale,worldWidth=width/scale;
 const cx=center.x+(right-left)/(2*scale),cy=center.y+(top-bottom)/(2*scale);
 return {left:cx-worldWidth/2,right:cx+worldWidth/2,top:cy+worldHeight/2,bottom:cy-worldHeight/2};
}

export function entranceFrame(time,reducedMotion=false){
 const duration=reducedMotion?4.0:7.5;
 return {duration,complete:time>=duration,opacity:smooth(0,reducedMotion?.6:.85,time),
  arrival:reducedMotion?1:smooth(.25,3.0,time),
  step:reducedMotion?1:smooth(.85,3.2,time),
  focus:reducedMotion?0:smooth(0,1.7,time)*(1-smooth(4.3,7.5,time))};
}
