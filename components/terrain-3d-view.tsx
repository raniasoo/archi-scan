"use client"

import { useState, useMemo, useEffect } from "react"
import { Box, Maximize2 } from "lucide-react"

interface Terrain3DViewProps {
  lng: number
  lat: number
  address?: string
  className?: string
}

export function Terrain3DView({ lng, lat, address, className = "" }: Terrain3DViewProps) {
  const [expanded, setExpanded] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  const html3d = useMemo(() => {
    if (!origin) return ''

    const tileProxy = (layer: string, z: number, x: number, y: number) =>
      `${origin}/api/tile?layer=${layer}&z=${z}&x=${x}&y=${y}`

    return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0}html,body,#c{width:100%;height:100%;overflow:hidden;background:#1e293b}
#info{position:absolute;bottom:8px;left:8px;color:rgba(255,255,255,0.7);font:11px/1.4 sans-serif;
background:rgba(0,0,0,0.5);padding:4px 10px;border-radius:6px;pointer-events:none}
#loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#5eead4;font:14px sans-serif}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
</head><body>
<canvas id="c"></canvas>
<div id="info">${(address||'대상지').replace(/'/g,"\\'")} · 3D 지적도</div>
<div id="loading">3D 지적도 로딩중...</div>
<script>
(async function(){
  const LAT=${lat}, LNG=${lng};
  const GRID=32, RANGE=0.003; // 약 300m 범위, 32x32 그리드
  
  // 1) 표고 데이터 수집 (그리드)
  var points=[];
  for(var gy=0;gy<GRID;gy++){
    for(var gx=0;gx<GRID;gx++){
      var plat=LAT-RANGE+gy*(2*RANGE/(GRID-1));
      var plng=LNG-RANGE+gx*(2*RANGE/(GRID-1));
      points.push({latitude:plat,longitude:plng});
    }
  }
  
  var elevations=[];
  try{
    // Open-Meteo Elevation API (빠르고 안정적)
    var lats=points.map(p=>p.latitude).join(',');
    var lngs=points.map(p=>p.longitude).join(',');
    var r=await fetch('https://api.open-meteo.com/v1/elevation?latitude='+lats+'&longitude='+lngs);
    var d=await r.json();
    elevations=d.elevation||[];
  }catch(e){}
  
  if(elevations.length<GRID*GRID){
    // fallback: 평탄 지형
    elevations=new Array(GRID*GRID).fill(0);
  }
  
  // 표고 범위 정규화
  var minE=Math.min(...elevations), maxE=Math.max(...elevations);
  var eRange=maxE-minE;
  if(eRange<0.5) eRange=1; // 평탄 지형 보정
  
  // 2) 지도 타일 텍스처 로드
  var canvas=document.getElementById('c');
  var W=canvas.clientWidth, H=canvas.clientHeight;
  canvas.width=W; canvas.height=H;
  
  // Three.js 세팅
  var scene=new THREE.Scene();
  scene.background=new THREE.Color(0x1e293b);
  scene.fog=new THREE.Fog(0x1e293b,200,500);
  
  var camera=new THREE.PerspectiveCamera(45,W/H,0.1,2000);
  
  var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true});
  renderer.setSize(W,H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.shadowMap.enabled=true;
  
  // 3) 지형 메시 생성
  var geo=new THREE.PlaneGeometry(120,120,GRID-1,GRID-1);
  var verts=geo.attributes.position.array;
  
  // 표고 적용 (높이 과장: 극대화 — 반드시 시각적으로 보이도록)
  var exaggeration=eRange<3?25:eRange<8?18:eRange<20?12:8;
  var maxZ=0;
  for(var i=0;i<GRID*GRID;i++){
    var norm=(elevations[i]-minE)/eRange;
    var z=norm*exaggeration*15;
    verts[i*3+2]=z;
    if(z>maxZ)maxZ=z;
  }
  geo.computeVertexNormals();
  
  // 카메라 위치: maxZ 위에서 비스듬히 내려보기
  camera.position.set(80, maxZ+60, 120);
  camera.lookAt(0, maxZ*0.3, 0);
  
  // 높이별 색상 (초록→노랑→갈색→흰색)
  var colors=new Float32Array(GRID*GRID*3);
  for(var i=0;i<GRID*GRID;i++){
    var h=verts[i*3+2]/Math.max(maxZ,1);
    var r,g,b;
    if(h<0.25){r=0.18+h*1.2;g=0.45+h*0.8;b=0.15;}
    else if(h<0.5){var t=(h-0.25)*4;r=0.48+t*0.4;g=0.65-t*0.15;b=0.15-t*0.05;}
    else if(h<0.75){var t=(h-0.5)*4;r=0.88-t*0.1;g=0.5-t*0.15;b=0.1+t*0.15;}
    else{var t=(h-0.75)*4;r=0.78+t*0.15;g=0.35+t*0.15;b=0.25+t*0.2;}
    colors[i*3]=r;colors[i*3+1]=g;colors[i*3+2]=b;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  
  // 4) 지도 텍스처 (VWorld 타일)
  var texCanvas=document.createElement('canvas');
  texCanvas.width=512; texCanvas.height=512;
  var ctx=texCanvas.getContext('2d');
  ctx.fillStyle='#e2e8f0';
  ctx.fillRect(0,0,512,512);
  
  // 타일 좌표 계산 (줌 16)
  var z=16;
  var n=Math.pow(2,z);
  var tx=Math.floor((LNG+180)/360*n);
  var ty=Math.floor((1-Math.log(Math.tan(LAT*Math.PI/180)+1/Math.cos(LAT*Math.PI/180))/Math.PI)/2*n);
  
  // 3x3 타일 그리드 로드
  var loaded=0, total=9;
  for(var dy=-1;dy<=1;dy++){
    for(var dx=-1;dx<=1;dx++){
      (function(ddx,ddy){
        var img=new Image();
        img.crossOrigin='anonymous';
        img.onload=function(){
          var px=(ddx+1)*(512/3), py=(ddy+1)*(512/3);
          ctx.drawImage(img,px,py,512/3,512/3);
          loaded++;
          if(loaded>=total){
            texture.needsUpdate=true;
            // 지적도 오버레이
            loadCadastral();
          }
        };
        img.onerror=function(){loaded++;if(loaded>=total){texture.needsUpdate=true;loadCadastral();}};
        img.src='https://xdworld.vworld.kr/2d/Base/service/'+z+'/'+(tx+ddx)+'/'+(ty+ddy)+'.png';
      })(dx,dy);
    }
  }
  
  function loadCadastral(){
    var cLoaded=0;
    for(var dy=-1;dy<=1;dy++){
      for(var dx=-1;dx<=1;dx++){
        (function(ddx,ddy){
          var img=new Image();
          img.crossOrigin='anonymous';
          img.onload=function(){
            var px=(ddx+1)*(512/3), py=(ddy+1)*(512/3);
            ctx.globalAlpha=0.6;
            ctx.drawImage(img,px,py,512/3,512/3);
            ctx.globalAlpha=1;
            cLoaded++;
            if(cLoaded>=9) texture.needsUpdate=true;
          };
          img.onerror=function(){cLoaded++;};
          img.src='${origin}/api/tile?layer=lt_c_cadastral&z='+z+'&x='+(tx+ddx)+'&y='+(ty+ddy);
        })(dx,dy);
      }
    }
  }
  
  var texture=new THREE.CanvasTexture(texCanvas);
  texture.minFilter=THREE.LinearFilter;
  
  var mat=new THREE.MeshStandardMaterial({
    map:texture,
    roughness:0.7,
    metalness:0.0,
    side:THREE.DoubleSide,
  });
  
  var terrain=new THREE.Mesh(geo,mat);
  terrain.rotation.x=-Math.PI/2;
  terrain.receiveShadow=true;
  scene.add(terrain);
  
  // 5) 중심 마커
  var markerGeo=new THREE.CylinderGeometry(0.3,0.3,15,8);
  var markerMat=new THREE.MeshStandardMaterial({color:0xef4444,emissive:0x991b1b});
  var marker=new THREE.Mesh(markerGeo,markerMat);
  var centerElev=(elevations[Math.floor(GRID*GRID/2)]-minE)/eRange*exaggeration*15;
  marker.position.set(0,centerElev+8,0);
  scene.add(marker);
  
  // 마커 상단 구
  var sphereGeo=new THREE.SphereGeometry(1.2,16,16);
  var sphereMat=new THREE.MeshStandardMaterial({color:0xef4444,emissive:0xef4444,emissiveIntensity:0.5});
  var sphere=new THREE.Mesh(sphereGeo,sphereMat);
  sphere.position.set(0,centerElev+16,0);
  scene.add(sphere);
  
  // 6) 조명
  var amb=new THREE.AmbientLight(0xffffff,0.35);
  scene.add(amb);
  var dir=new THREE.DirectionalLight(0xffffff,1.2);
  dir.position.set(80,150,30);
  dir.castShadow=true;
  scene.add(dir);
  var hemi=new THREE.HemisphereLight(0x87CEEB,0x8B7355,0.4);
  scene.add(hemi);
  
  // 7) 마우스/터치 컨트롤 (간단한 궤도 카메라)
  var isDragging=false, prevX=0, prevY=0;
  var theta=Math.PI/4, phi=Math.PI/3, dist=140;
  
  function updateCamera(){
    camera.position.x=dist*Math.sin(phi)*Math.sin(theta);
    camera.position.y=dist*Math.cos(phi);
    camera.position.z=dist*Math.sin(phi)*Math.cos(theta);
    camera.lookAt(0,centerElev/2,0);
  }
  updateCamera();
  
  canvas.addEventListener('pointerdown',function(e){isDragging=true;prevX=e.clientX;prevY=e.clientY;});
  canvas.addEventListener('pointermove',function(e){
    if(!isDragging)return;
    theta+=(e.clientX-prevX)*0.01;
    phi=Math.max(0.2,Math.min(Math.PI/2-0.1,phi-(e.clientY-prevY)*0.01));
    prevX=e.clientX;prevY=e.clientY;
    updateCamera();
  });
  canvas.addEventListener('pointerup',function(){isDragging=false;});
  canvas.addEventListener('wheel',function(e){
    dist=Math.max(50,Math.min(300,dist+e.deltaY*0.3));
    updateCamera();
  },{passive:true});
  
  // 터치 줌
  var lastDist=0;
  canvas.addEventListener('touchstart',function(e){
    if(e.touches.length===2){
      lastDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    }
  });
  canvas.addEventListener('touchmove',function(e){
    if(e.touches.length===2){
      var d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      dist=Math.max(50,Math.min(300,dist-(d-lastDist)*0.5));
      lastDist=d;
      updateCamera();
    }
  });
  
  // 8) 렌더 루프
  document.getElementById('loading').style.display='none';
  
  function animate(){
    requestAnimationFrame(animate);
    // 마커 애니메이션
    sphere.position.y=centerElev+16+Math.sin(Date.now()*0.002)*1;
    renderer.render(scene,camera);
  }
  animate();
  
  // 리사이즈
  window.addEventListener('resize',function(){
    W=canvas.clientWidth;H=canvas.clientHeight;
    canvas.width=W;canvas.height=H;
    camera.aspect=W/H;
    camera.updateProjectionMatrix();
    renderer.setSize(W,H);
  });
})();
<\/script>
</body></html>`
  }, [lat, lng, origin, address])

  const blobUrl = useMemo(() => {
    if (!html3d) return ''
    const blob = new Blob([html3d], { type: 'text/html;charset=utf-8' })
    return URL.createObjectURL(blob)
  }, [html3d])

  if (!blobUrl) return null

  return (
    <div className={`rounded-xl border border-border/60 bg-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-b border-border/40">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Box className="h-3.5 w-3.5 text-primary" />
          <span>3D 지적도</span>
          <span className="text-[10px] text-muted-foreground">(드래그: 회전 / 핀치: 줌)</span>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>
      <div className={`relative ${expanded ? 'h-[400px] sm:h-[500px]' : 'h-[260px] sm:h-[320px]'} transition-all`}>
        <iframe key={expanded ? 'exp' : 'col'} src={blobUrl} className="w-full h-full border-0" title="3D 지적도" />
      </div>
    </div>
  )
}
