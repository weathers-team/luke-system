/* Native opportunity tracker. Browser-local trial; no automatic outreach. */
var OpportunityTracker=(function(){
"use strict";
var KEY="luke.opportunities.v1", records=[], error="", filter="all", search="";
var fields=[["name","Person referred","text"],["date","Date referred","date"],["type","Buyer / Seller","type"],["timeframe","Timeframe","text"],["connected","Connected","yesno"],["appointment","Appointment held","yesno"],["source","Source","text"],["phone","Phone","tel"],["email","Email","email"],["status","Status","status"],["lastContact","Last contact","date"],["nextFollowup","Next follow-up","date"],["nextAction","Next action","text"],["notes","Notes","textarea"]];
var types=["Buyer","Seller","Buy / Sell"], statuses=["New","Connected","Appointment scheduled","Appointment held","Active client","Closed","Paused"];
function e(s){return String(s||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function today(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function load(){try{var raw=localStorage.getItem(KEY);records=raw?JSON.parse(raw):[];if(!Array.isArray(records))throw Error();error="";}catch(x){records=[];error="Saved opportunities could not be read. Do not overwrite them; restore from an export backup.";}}
function persist(next){try{localStorage.setItem(KEY,JSON.stringify(next));records=next;error="";return true;}catch(x){error="Could not save. Your changes have not been stored. Check browser storage before trying again.";return false;}}
function active(r){return r.status!=="Closed"&&r.status!=="Paused";}
function due(r){return active(r)&&r.nextFollowup&&r.nextFollowup<=today();}
function visible(){return records.filter(function(r){return (filter==="all"||filter==="due"&&due(r)||r.type===filter)&&(!search||fields.some(function(f){return String(r[f[0]]||"").toLowerCase().includes(search);}));}).sort(function(a,b){return (a.nextFollowup||"9999").localeCompare(b.nextFollowup||"9999")||a.name.localeCompare(b.name);});}
function redraw(){if(typeof draw==="function")draw();}
function html(){
var rows=visible();
return '<section class="opp"><div class="opp-top"><div><b>'+records.filter(active).length+' active opportunities</b><span>'+records.filter(due).length+' follow-ups due</span></div><button onclick="OpportunityTracker.edit()">+ Add opportunity</button><button onclick="OpportunityTracker.exportData()">Export backup</button></div>'+
'<p class="opp-storage">Trial version · Saved only in this browser. Export a backup before switching devices. No messages are sent automatically.</p>'+
(error?'<p role="alert" class="opp-error">'+e(error)+'</p>':'')+
'<div class="opp-filters"><label>Show <select onchange="OpportunityTracker.setFilter(this.value)">'+["all","due","Buyer","Seller","Buy / Sell"].map(function(v){return '<option value="'+v+'"'+(v===filter?' selected':'')+'>'+({all:"All opportunities",due:"Follow-ups due"}[v]||v)+'</option>';}).join("")+'</select></label><label>Search <input type="search" value="'+e(search)+'" onchange="OpportunityTracker.setSearch(this.value)" placeholder="Name, source or notes"></label></div>'+
'<div class="opp-table-wrap"><table class="opp-table"><thead><tr><th>Person</th><th>Buyer / Seller</th><th>Timeframe</th><th>Connected</th><th>Appointment held</th><th>Source</th><th>Next follow-up</th><th>Next action</th><th>Status</th><th></th></tr></thead><tbody>'+
rows.map(function(r){return '<tr class="'+(due(r)?'opp-due':'')+'"><td><b>'+e(r.name)+'</b><small>'+e(r.date)+'</small></td><td>'+e(r.type)+'</td><td>'+e(r.timeframe)+'</td><td>'+e(r.connected)+'</td><td>'+e(r.appointment)+'</td><td>'+e(r.source)+'</td><td>'+e(r.nextFollowup)+(due(r)?'<small>Due</small>':'')+'</td><td>'+e(r.nextAction)+'</td><td>'+e(r.status)+'</td><td><button data-opp-id="'+e(r.id)+'" onclick="OpportunityTracker.edit(this.dataset.oppId)">Edit</button></td></tr>';}).join("")+
'</tbody></table>'+(rows.length?'':'<p class="opp-empty">No opportunities here yet. Add a person to start tracking their plans and next follow-up.</p>')+'</div></section>';
}
function edit(id){
if(error){redraw();return;}
var r=records.find(function(x){return x.id===id;})||{date:today(),status:"New",connected:"Not yet",appointment:"Not yet",type:"Buyer"};
var old=document.getElementById("opp-dialog");if(old)old.remove();
var dialog=document.createElement("dialog");dialog.id="opp-dialog";dialog.className="opp-dialog";
dialog.innerHTML='<form id="opp-form"><h2>'+(id?'Edit':'Add')+' opportunity</h2><div class="opp-form-grid">'+fields.map(function(f){
var k=f[0], kind=f[2], value=r[k]||"", control;
if(["type","yesno","status"].includes(kind)){var opts=kind==="type"?types:kind==="status"?statuses:["Not yet","Yes","Unknown"];control='<select name="'+k+'">'+opts.map(function(o){return '<option'+(o===value?' selected':'')+'>'+e(o)+'</option>';}).join("")+'</select>';}
else if(kind==="textarea")control='<textarea name="'+k+'">'+e(value)+'</textarea>';
else control='<input name="'+k+'" type="'+kind+'" value="'+e(value)+'"'+(k==="name"?' required maxlength="200"':'')+'>';
return '<label>'+f[1]+control+'</label>';}).join("")+'</div><p id="opp-form-error" role="alert"></p><div class="opp-dialog-actions"><button type="button" id="opp-cancel">Cancel</button><button type="submit">Save opportunity</button></div></form>';
document.body.appendChild(dialog);
dialog.querySelector("#opp-cancel").onclick=function(){dialog.close();dialog.remove();};
dialog.querySelector("form").onsubmit=function(ev){ev.preventDefault();var value=Object.fromEntries(new FormData(ev.target));Object.keys(value).forEach(function(k){value[k]=value[k].trim();});
if(!value.name)return;
var duplicate=records.find(function(x){return x.id!==id&&x.name.toLowerCase()===value.name.toLowerCase()&&x.type===value.type;});
if(duplicate){dialog.querySelector("#opp-form-error").textContent="This person already has an opportunity of this type. Edit the existing entry.";return;}
value.id=id||crypto.randomUUID();value.updatedAt=new Date().toISOString();
var next=records.filter(function(x){return x.id!==value.id;}).concat([value]);
if(!persist(next)){dialog.querySelector("#opp-form-error").textContent=error;return;}
dialog.close();dialog.remove();redraw();
};dialog.showModal();
}
function exportData(){var blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),opportunities:records},null,2)],{type:"application/json"});var url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="opportunities-"+today()+".json";a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);}
load();window.addEventListener("storage",function(event){if(event.key===KEY){load();redraw();}});
return {html:html,edit:edit,exportData:exportData,setFilter:function(v){filter=v;redraw();},setSearch:function(v){search=v.toLowerCase().trim();redraw();}};
})();
