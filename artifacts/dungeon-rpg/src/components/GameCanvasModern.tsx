import React,{useEffect,useRef}from'react';
import{GameState}from'../game/engine';
import{runScene}from'./scene/sceneLoop';

export function GameCanvasModern({gameState}:{gameState:GameState}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const stateRef=useRef(gameState);
 stateRef.current=gameState;
 useEffect(()=>{
  const canvas=canvasRef.current;
  if(!canvas)return;
  return runScene(canvas,()=>stateRef.current);
 },[]);
 return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{imageRendering:'pixelated'}}/>;
}
