import {useEffect,useMemo,useState} from "react";
import {CircleMarker,MapContainer,TileLayer,Tooltip,useMap} from "react-leaflet";
import {ArrowUpRight,LocateFixed,MapPin,Search,Zap} from "lucide-react";
import stations from "./stations.json";
type Point={lat:number,lng:number};
function distance(a:Point,b:Point){
 const rad=Math.PI/180;
 const h=Math.sin((a.lat-b.lat)*rad/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((a.lng-b.lng)*rad/2)**2;
 return 12742*Math.asin(Math.sqrt(Math.min(1,h)));
}
function Focus({point}:{point:Point}){
 const map=useMap();
 useEffect(()=>{map.flyTo([point.lat,point.lng],13,{duration:0.65,animate:!matchMedia('(prefers-reduced-motion: reduce)').matches})},[map,point]);return null;
}
export default function Directory({initialQuery="",nearby=false}:{initialQuery?:string,nearby?:boolean}){
 const [query,setQuery]=useState(initialQuery),[position,setPosition]=useState<Point|null>(null),[message,setMessage]=useState(''),[id,setId]=useState(0);
 const rows=useMemo(()=>stations.filter(s=>(s.name+' '+s.city+' '+s.address).toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>position?distance(position,a)-distance(position,b):0),[query,position]);
 const active=rows.find(s=>s.id===id)||rows[0];
 function locate(){
 if(!navigator.geolocation){setMessage('Location unavailable. Search by city instead.');return;}
 setMessage('Finding your location…');
 navigator.geolocation.getCurrentPosition(p=>{setPosition({lat:p.coords.latitude,lng:p.coords.longitude});setQuery('');setId(0);setMessage('Sorted by distance from you.');},()=>setMessage('Location unavailable. Enter a city or station name.'),{timeout:12000});
 }
 useEffect(()=>{if(nearby)locate();},[nearby]);
 return <section className="atlas"><div className="atlas-head"><div><h2>Station results</h2></div><a href="#explore">Book a host <ArrowUpRight size={16}/></a></div>
 <div className="atlas-tools"><label><Search size={19}/><input aria-label="Search public stations" placeholder="City, station or street" value={query} onChange={e=>setQuery(e.target.value)}/></label><button onClick={locate}><LocateFixed size={17}/> Near me</button></div>
 <div aria-live="polite">{message}</div><div className="atlas-body"><div className="atlas-results"><strong>{rows.length} mapped stations</strong>{rows.map(s=><button key={s.id} className={active?.id===s.id?'picked':''} onClick={()=>setId(s.id)}><Zap size={18}/><span><b>{s.name}</b><small>{s.city}{position?' · '+distance(s,position).toFixed(1)+' km':''}</small></span></button>)}{!rows.length&&<p>No matching stations in this directory. <button onClick={()=>setQuery('')}>Show all</button></p>}</div>
 <div className="atlas-map"><MapContainer center={[22,79]} zoom={4} scrollWheelZoom={false} style={{height:325}}><TileLayer attribution="© OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{active&&<Focus point={active}/>}
 {rows.map(s=><CircleMarker key={s.id} center={[s.lat,s.lng]} radius={active?.id===s.id?12:7} pathOptions={{color:'#fff',weight:3,fillColor:active?.id===s.id?'#FF5A36':'#131311',fillOpacity:1}} eventHandlers={{click:()=>setId(s.id)}}><Tooltip>{s.name}</Tooltip></CircleMarker>)}</MapContainer>
 {active&&<div className="station-detail"><div><MapPin size={17}/><b>{active.name}</b></div><p>{[active.address,active.city].filter(Boolean).join(', ')}</p><a href={'https://www.google.com/maps/dir/?api=1&destination='+active.lat+','+active.lng} target="_blank" rel="noreferrer">Directions ↗</a> · <a href={'https://openchargemap.org/site/poi/details/'+active.id} target="_blank" rel="noreferrer">Station record ↗</a></div>}</div></div>
 <small className="atlas-credit">Selected Indian station records from Open Charge Map contributors (CC BY 4.0). Confirm access and availability with the operator before travel.</small></section>
}
