import test from 'node:test';
import assert from 'node:assert/strict';
import {createTutorialProgress} from './mobile-tutorial.js';
import {createMechanicJourney} from './mechanic-state.mjs';
const context=(game,extra={})=>({...game.state,primary:game.primary,secondary:game.secondary,low:game.low,high:game.high,overview:false,nearWheel:false,holdingWheel:false,...extra});
const view=(tutorial,game,extra={},dt=0)=>tutorial.update(context(game,extra),dt);
function arrive(tutorial,game){game.state.pressed=[true,true,false];game.state.location=game.primary;game.state.stop=game.high;view(tutorial,game,{},3);view(tutorial,game);}

test('first repair, boarding and both uphill stops advance only after actual gameplay',()=>{
 const game=createMechanicJourney(2,{autoRepair:false}),tutorial=createTutorialProgress();
 assert.equal(view(tutorial,game).id,'first-fix');
 for(let i=0;i<20;i++)assert.equal(view(tutorial,game,{},10).id,'first-fix','waiting never completes a lesson');
 game.state.motion={type:'repair',index:0};assert.equal(view(tutorial,game),null);
 game.finishRepair();assert.equal(view(tutorial,game).id,'first-board');
 game.walk('carB');assert.equal(view(tutorial,game),null);game.finishWalk();assert.equal(view(tutorial,game).id,'first-ride');
 game.beginDrag();game.release(1);assert.equal(view(tutorial,game),null);game.finishSlide();assert.equal(view(tutorial,game).id,'ride-again');
 game.beginDrag();game.release(0);game.finishSlide();assert.equal(view(tutorial,game),null,'the uphill lesson ends without a step-off prompt');
 assert.equal(view(tutorial,game,{},3),null);
});
test('boarding before power repair and wrong-way rides remain possible without skipping the lesson',()=>{
 const game=createMechanicJourney(2,{autoRepair:false}),tutorial=createTutorialProgress();
 game.walk('carB');game.finishWalk();assert.match(view(tutorial,game).text,/Step off/);assert.equal(game.beginDrag(),false);
 game.state.pressed[0]=true;game.state.stop=1;assert.equal(view(tutorial,game).id,'ride-again');
 game.beginDrag();game.release(2);game.finishSlide();assert.equal(view(tutorial,game).id,'first-ride','downhill is not mistaken for learning uphill');
 game.state.stop=1;game.walk('dockNear');game.finishWalk();assert.equal(view(tutorial,game).target,'boardPrimary');
});
test('wheel instructions wait for proximity, distinguish taking hold from turning, and hide during movement',()=>{
 const game=createMechanicJourney(2,{autoRepair:false}),tutorial=createTutorialProgress();arrive(tutorial,game);game.state.location='station2Far';
 assert.equal(view(tutorial,game),null,'no distant wheel instructions');
 assert.equal(view(tutorial,game,{nearWheel:true}).id,'wheel-hold');
 assert.equal(view(tutorial,game),null,'walking away removes wheel guidance');
 assert.equal(view(tutorial,game,{holdingWheel:true}).id,'wheel-turn');
 game.beginDrag();assert.equal(view(tutorial,game,{holdingWheel:true}),null);
 game.release(1);game.finishSlide();assert.equal(view(tutorial,game,{holdingWheel:true}).id,'wheel-turn','wrong or partial turns can be corrected');
 game.beginDrag();game.release(2);game.finishSlide();assert.equal(view(tutorial,game,{nearWheel:true}),null,'no boarding follow-up after calling the cart');
 game.walk('carA');game.finishWalk();assert.equal(view(tutorial,game),null);
 game.walk('station2Far');game.finishWalk();assert.equal(view(tutorial,game,{nearWheel:true}),null,'completed wheel lesson does not nag on return');
});
test('a cart already waiting at the wheel platform needs no needless wheel turn',()=>{
 const game=createMechanicJourney(2,{autoRepair:false}),tutorial=createTutorialProgress();arrive(tutorial,game);
 game.state.location='station2Far';game.state.stop=2;
 assert.equal(view(tutorial,game,{nearWheel:true}),null,'no boarding follow-up after calling the cart');
});
test('hiding tips, restoring contextual help, restarting and overview never mutate puzzle state',()=>{
 const game=createMechanicJourney(2,{autoRepair:false}),tutorial=createTutorialProgress();const initial=JSON.stringify(game.state);
 view(tutorial,game);tutorial.hide();assert.equal(view(tutorial,game),null);tutorial.show();assert.equal(view(tutorial,game).id,'first-fix');
 assert.equal(view(tutorial,game,{overview:true}),null);assert.equal(JSON.stringify(game.state),initial);
 arrive(tutorial,game);tutorial.show();assert.equal(view(tutorial,game),null,'Tips does not add instructions for the later repairs');
 game.state.complete=true;assert.equal(view(tutorial,game),null);
 game.reset();tutorial.reset();assert.equal(view(tutorial,game).id,'first-fix');
});

test('later exploration stays unguided, including when Tips is enabled again',()=>{
 const game=createMechanicJourney(2,{autoRepair:false}),tutorial=createTutorialProgress();arrive(tutorial,game);
 game.state.location='station2Far';assert.equal(view(tutorial,game,{nearWheel:true}).id,'wheel-hold');
 game.state.stop=game.low;assert.equal(view(tutorial,game,{nearWheel:true}),null);
 for(const location of ['station2Far','dockFar','service','dockNear','carB']){
  for(const pressed of [[true,true,false],[true,true,true]]){
   game.state.location=location;game.state.pressed=pressed;game.state.stop=game.high;
   tutorial.hide();tutorial.show();assert.equal(view(tutorial,game,{nearWheel:location==='station2Far'}),null);
  }
 }
});
