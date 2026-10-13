// Static, decorative game objects accompany short, accessible instructions.
const icons={
 walk:'<path fill="#f3bf31" d="M7 9h8v5h5v8H9v-4H5v-6h2zm22 16h8v5h5v8H31v-4h-4v-6h2z"/><path fill="#084d88" d="M8 25h5v5H8zm8 8h5v5h-5zm7-22h5v5h-5zm8 6h5v5h-5z"/>',
 repair:'<path fill="#07375e" d="M10 5h29v38H10z"/><path fill="#084d88" d="M7 3h27v37H7z"/><path fill="#f4ecd9" d="M11 9h19v20H11z"/><path fill="#f3bf31" d="M16 12h4v4h4v-4h4v8h-4v4h-4v-4h-4zm4 12h4v10h-4z"/><path fill="#67a9db" d="M9 5h23v3H9z"/><path fill="#f3bf31" d="M28 32h3v3h-3z"/>',
 wheel:'<path fill="#07375e" d="M21 24h7v19H18v-5h3z"/><circle cx="24" cy="20" r="16" fill="#07375e" stroke="#f3bf31" stroke-width="5"/><path d="M24 7v25M11 20h26m-22-9 18 18m0-18L15 29" stroke="#f3bf31" stroke-width="3"/><circle cx="24" cy="20" r="4" fill="#084d88"/><path fill="#f4ecd9" d="M33 9h6v6h-6z"/>',
 train:'<path fill="#07375e" d="M9 8h26v31H9zM11 39h6v5h-6zm16 0h6v5h-6z"/><path fill="#ed351c" d="M6 4h28v32H6z"/><path fill="#f3bf31" d="M9 7h22v3H9z"/><path fill="#07375e" d="M10 12h20v14H10z"/><path fill="#f4ecd9" d="M10 29h5v4h-5zm15 0h5v4h-5z"/><path fill="#084d88" d="M40 5h4v27h-4zM36 9h12l-6-7zm0 19h12l-6 7z"/>',
 board:'<path fill="#ed351c" d="M5 6h25v34H5z"/><path fill="#07375e" d="M10 11h15v29H10z"/><path fill="#f3bf31" d="M9 38h18v5H9z"/><path fill="#084d88" d="M28 21h11v-6l9 9-9 9v-6H28z"/>'
};
export function createIntroHints({mobile=true}={}){
 const items=mobile?[
  ['walk','Explore','Tap floors & stairs'],
  ['repair','Fix','Tap blue cabinets'],
  ['wheel','Call a cart','Turn the upper-left wheel'],
  ['train','Ride','Board, then swipe ↑ ↓','Or tap cabin arrows']
 ]:[
  ['walk','Explore','Click platforms & stairs'],
  ['repair','Fix','Step on ▲ ■ ●'],
  ['board','Board','Click an open train'],
  ['train','Ride','Drag along the rails']
 ];
 const list=document.createElement('ul');list.className='intro-hints';list.setAttribute('aria-label','How to play');
 for(const [icon,label,caption,note]of items){
  const item=document.createElement('li');
  item.innerHTML=`<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${icons[icon]}</svg>`;
  const title=document.createElement('strong');title.textContent=label;
  const text=document.createElement('span');text.textContent=caption;item.append(title,text);
  if(note){const small=document.createElement('small');small.textContent=note;item.append(small);}
  list.append(item);
 }
 return list;
}
