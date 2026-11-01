(() => {
  "use strict";
  const STORAGE_KEY = "sclintex_v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = value => new Intl.NumberFormat("es-PE", {style:"currency",currency:"PEN"}).format(Number(value)||0);
  const number = value => new Intl.NumberFormat("es-PE", {maximumFractionDigits:1}).format(Number(value)||0);
  const dateKey = date => { const d = date instanceof Date ? date : new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric"});
  const timeLabel = value => value ? new Date(value).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"}) : "—";
  const monthKey = (y,m) => `${y}-${String(m+1).padStart(2,"0")}`;
  const monthLabel = (y,m) => new Date(y,m,1).toLocaleDateString("es-PE",{month:"long",year:"numeric"});
  const today = new Date();
  const initialState = () => ({version:1,settings:{monthlyGoal:1600,serviceInterval:4000,currentOdometer:0},activeJourney:null,journeys:[],maintenance:{lastServiceOdometer:0,lastServiceDate:null,serviceCount:0}});
  let state = loadState();
  let historyDate = new Date(today.getFullYear(),today.getMonth(),1);
  let confirmCallback = null;

  function loadState(){
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || !Array.isArray(parsed.journeys) || !parsed.settings) return initialState();
      return {...initialState(),...parsed,settings:{...initialState().settings,...parsed.settings},maintenance:{...initialState().maintenance,...parsed.maintenance}};
    } catch { return initialState(); }
  }
  function save(){ try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); } catch { toast("No se pudieron guardar los datos del navegador.","error"); } }
  function toast(message,type="success"){
    const node=document.createElement("div"); node.className=`toast ${type==="error"?"error":""}`;
    node.innerHTML=`<i data-lucide="${type==="error"?"alert-circle":"check-circle-2"}"></i><span></span>`;
    $(".toast-region").append(node); $("span",node).textContent=message; if(window.lucide) lucide.createIcons();
    setTimeout(()=>node.remove(),3600);
  }
  function confirmAction(title,message,callback){
    $("#confirmTitle").textContent=title; $("#confirmMessage").textContent=message; confirmCallback=callback; $("#confirmModal").showModal();
  }
  function closeConfirm(accepted){ $("#confirmModal").close(); const cb=confirmCallback; confirmCallback=null; if(accepted&&cb) cb(); }
  function monthJourneys(y,m){const key=monthKey(y,m);return state.journeys.filter(j=>j.date.slice(0,7)===key);}
  function sum(items,key){return items.reduce((total,item)=>total+(Number(item[key])||0),0);}
  function totals(items){const income=sum(items,"income"),fuel=sum(items,"fuel"),other=sum(items,"other");return {income,fuel,other,expenses:fuel+other,net:income-fuel-other,km:sum(items,"km")};}
  function getDistanceSinceService(){return Math.max(0,(Number(state.settings.currentOdometer)||0)-(Number(state.maintenance.lastServiceOdometer)||0));}
  function remainingService(){return Number(state.settings.serviceInterval)-getDistanceSinceService();}
  function maintenanceState(){
    const remaining=remainingService(), interval=Number(state.settings.serviceInterval)||4000, progress=Math.min(100,Math.max(0,getDistanceSinceService()/interval*100));
    return {remaining,interval,progress,done:remaining<=0,soon:remaining>0&&remaining<=Math.max(250,interval*.1)};
  }
  function renderAll(){renderDashboard();renderJourney();renderHistory();renderMaintenance();renderSettings();updateNotification();if(window.lucide)lucide.createIcons();}
  function renderDashboard(){
    const items=monthJourneys(today.getFullYear(),today.getMonth()), t=totals(items), goal=Number(state.settings.monthlyGoal)||0, percent=goal>0?Math.min(100,t.income/goal*100):0;
    $("#statIncome").textContent=money(t.income);$("#statNet").textContent=money(t.net);$("#statFuel").textContent=money(t.fuel);$("#statKm").textContent=`${number(t.km)} km`;
    $("#goalAmount").textContent=money(goal);$("#goalIncome").textContent=money(t.income);$("#goalPercent").textContent=`${Math.round(percent)}%`;
    $("#goalRemaining").textContent=goal===0?"Configura una meta mensual":t.income>=goal?"¡Meta mensual alcanzada!":`Te faltan ${money(goal-t.income)} para alcanzar tu meta`;
    $("#goalProgress").style.width=`${percent}%`;$("#goalPeriod").textContent=monthLabel(today.getFullYear(),today.getMonth());
    $("#currentMonthLabel").textContent=monthLabel(today.getFullYear(),today.getMonth());
    $("#welcomeDate").textContent=today.toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long"}).toUpperCase();
    const recent=[...state.journeys].sort((a,b)=>b.date.localeCompare(a.date)||b.startAt.localeCompare(a.startAt)).slice(0,4);
    $("#recentList").innerHTML=recent.length?recent.map(j=>`<div class="recent-row"><div class="date-block"><strong>${new Date(j.date+"T12:00:00").getDate()}</strong><small>${new Date(j.date+"T12:00:00").toLocaleDateString("es-PE",{month:"short"})}</small></div><div class="recent-desc"><strong>Jornada completada</strong><small>${timeLabel(j.startAt)} – ${timeLabel(j.endAt)} · ${number(j.km)} km</small></div><div class="recent-money"><strong class="${j.net>=0?"positive":"negative"}">${money(j.net)}</strong><small>Ganancia neta</small></div><i data-lucide="chevron-right" class="row-arrow"></i></div>`).join(""):`<div class="empty-inline"><i data-lucide="calendar-clock"></i>Aún no tienes jornadas registradas.</div>`;
    const m=maintenanceState();$("#maintenanceStatus").innerHTML=`<strong>${m.done?"¡Es momento de cambiar el aceite!":m.soon?"Se acerca el próximo cambio":"Tu mantenimiento está al día"}</strong><small>${m.done?"Has superado el intervalo configurado.":`${number(m.remaining)} km restantes para el próximo cambio.`}</small>`;
    $("#maintenanceProgressText").textContent=`${number(getDistanceSinceService())} / ${number(m.interval)} km`;$("#maintenanceProgress").style.width=`${m.progress}%`;
  }
  function renderJourney(){
    const active=state.activeJourney, isActive=!!active;
    $("#journeyStartBlock").classList.toggle("hidden",isActive);$("#journeyActiveBlock").classList.toggle("hidden",!isActive);
    $("#journeyState").textContent=isActive?"Jornada en curso":"Sin jornada activa";$("#journeyIndicator").classList.toggle("on",isActive);
    $("#journeyDate").textContent=isActive?`Iniciada ${dateLabel(active.date)}`:"Listo para comenzar";
    $("#workDate").textContent=today.toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long"});
    if(isActive){$("#activeStartTime").textContent=timeLabel(active.startAt);$("#activeStartKm").textContent=`${number(active.startOdometer)} km`;$("#endOdometer").min=active.startOdometer;$("#endOdometer").placeholder=`Mínimo ${number(active.startOdometer)}`;}
    $("#dashboardStart").innerHTML=isActive?'<i data-lucide="clock"></i> Jornada en curso':'<i data-lucide="play"></i> Iniciar jornada';
    $("#dashboardStart").disabled=isActive;$("#dashboardStart").classList.toggle("disabled",isActive);
  }
  function renderHistory(){
    const y=historyDate.getFullYear(),m=historyDate.getMonth(),items=monthJourneys(y,m).sort((a,b)=>b.date.localeCompare(a.date)||b.startAt.localeCompare(a.startAt)),t=totals(items);
    $("#historyMonth").textContent=monthLabel(y,m);$("#historySummary").innerHTML=[["Ingresos",money(t.income)],["Gasolina",money(t.fuel)],["Ganancia neta",money(t.net)],["Kilómetros",`${number(t.km)} km`]].map(([a,b])=>`<div><small>${a.toUpperCase()}</small><strong>${b}</strong></div>`).join("");
    $("#historyEmpty").classList.toggle("hidden",items.length>0);$("#historyTable").innerHTML=items.map(j=>`<tr><td><strong>${dateLabel(j.date)}</strong></td><td>${timeLabel(j.startAt)} – ${timeLabel(j.endAt)}</td><td>${number(j.km)} km</td><td>${money(j.income)}</td><td>${money(j.fuel+j.other)}</td><td><strong class="${j.net>=0?"positive":"negative"}">${money(j.net)}</strong></td><td><div class="table-actions"><button class="table-icon" data-detail="${j.id}" title="Ver detalle"><i data-lucide="eye"></i></button><button class="table-icon" data-delete="${j.id}" title="Eliminar"><i data-lucide="trash-2"></i></button></div></td></tr>`).join("");
  }
  function renderMaintenance(){
    const m=maintenanceState(),distance=getDistanceSinceService();
    $("#oilRemaining").textContent=m.done?`${number(Math.abs(m.remaining))} km excedidos`:`${number(m.remaining)} km`;
    $("#oilDescription").textContent=m.done?"Has alcanzado o superado el intervalo de cambio.": "Kilómetros restantes para tu próximo cambio.";
    $("#oilProgressText").textContent=`${number(distance)} / ${number(m.interval)} km`;$("#oilProgress").style.width=`${m.progress}%`;
    $("#oilInterval").textContent=`${number(m.interval)} km`;$("#lastOilDate").textContent=state.maintenance.lastServiceDate?dateLabel(state.maintenance.lastServiceDate):"Sin registrar";
    $("#oilStatusPill").textContent=m.done?"Cambio pendiente":m.soon?"Próximo cambio":"En seguimiento";
    $("#oilStatusPill").style.background=m.done?"#fff0ef":m.soon?"#fff6e9":"#e8f8f1";$("#oilStatusPill").style.color=m.done?"#c35e54":m.soon?"#a8752c":"#188b69";
    const alert=$("#maintenanceAlert");alert.className=`alert-box ${m.done?"danger":m.soon?"warning":""}`;
    alert.textContent=m.done?`Aviso: ya recorriste ${number(distance)} km desde el último cambio. Registra el cambio de aceite para reiniciar el contador.`:m.soon?`Atención: estás cerca del cambio de aceite. Te quedan ${number(m.remaining)} km según tu intervalo de ${number(m.interval)} km.`:`Todo bien. Has recorrido ${number(distance)} de ${number(m.interval)} km desde el último cambio de aceite.`;
    $("#maintenanceNavDot").style.display=m.done||m.soon?"block":"none";
  }
  function renderSettings(){$("#monthlyGoal").value=state.settings.monthlyGoal;$("#serviceInterval").value=state.settings.serviceInterval;$("#lastServiceOdometer").value=state.maintenance.lastServiceOdometer||"";$("#currentOdometer").value=state.settings.currentOdometer||"";}
  function updateNotification(){
    const m=maintenanceState(),has=!!(m.done||m.soon);$("#notificationDot").style.display=has?"block":"none";
  }
  function navigate(view){
    $$(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${view}`));$$(".nav-item[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    const names={dashboard:"Resumen",jornada:"Jornada diaria",historial:"Historial",mantenimiento:"Mantenimiento",ajustes:"Configuración"};$("#breadcrumbCurrent").textContent=names[view]||"Resumen";
    $("#sidebar").classList.remove("open");if(view==="historial")renderHistory();window.scrollTo({top:0,behavior:"smooth"});
  }
  function startJourney(event){
    event.preventDefault();if(state.activeJourney){toast("Ya tienes una jornada activa.","error");return;}
    const odo=Number($("#startOdometer").value);if(!Number.isFinite(odo)||odo<0){toast("Ingresa un kilometraje inicial válido.","error");return;}
    if(state.settings.currentOdometer>0&&odo<state.settings.currentOdometer){toast(`El kilometraje debe ser al menos ${number(state.settings.currentOdometer)} km. Revisa el odómetro en Configuración si necesitas corregirlo.`,"error");return;}
    state.activeJourney={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),date:dateKey(new Date()),startAt:new Date().toISOString(),startOdometer:odo,startNote:$("#startNote").value.trim()};
    state.settings.currentOdometer=odo;save();$("#startForm").reset();renderAll();toast("Jornada iniciada. ¡Buen trabajo!");
  }
  function endJourney(event){
    event.preventDefault();const active=state.activeJourney;if(!active)return;
    const endOdo=Number($("#endOdometer").value),income=Number($("#dayIncome").value),fuel=Number($("#dayFuel").value||0),other=Number($("#dayOther").value||0);
    if(!Number.isFinite(endOdo)||endOdo<active.startOdometer){toast("El kilometraje final no puede ser menor al inicial.","error");return;}
    if(!Number.isFinite(income)||income<0||fuel<0||other<0){toast("Revisa los importes ingresados.","error");return;}
    const km=Number((endOdo-active.startOdometer).toFixed(1)),net=Number((income-fuel-other).toFixed(2)),endAt=new Date().toISOString();
    const journey={...active,endAt,endOdometer:endOdo,km,income:Number(income.toFixed(2)),fuel:Number(fuel.toFixed(2)),other:Number(other.toFixed(2)),net,endNote:$("#endNote").value.trim()};
    state.journeys.push(journey);state.settings.currentOdometer=endOdo;state.activeJourney=null;save();$("#endForm").reset();renderAll();toast(`Jornada guardada: ${number(km)} km recorridos.`);navigate("dashboard");
  }
  function showDetail(id){
    const j=state.journeys.find(x=>x.id===id);if(!j)return;
    $("#detailContent").innerHTML=`<p class="eyebrow">DETALLE DE JORNADA</p><h3>${dateLabel(j.date)}</h3><p>Resumen de tu jornada registrada.</p><div class="detail-grid"><div><small>HORA DE INICIO</small><strong>${timeLabel(j.startAt)}</strong></div><div><small>HORA DE CIERRE</small><strong>${timeLabel(j.endAt)}</strong></div><div><small>KILOMETRAJE INICIAL</small><strong>${number(j.startOdometer)} km</strong></div><div><small>KILOMETRAJE FINAL</small><strong>${number(j.endOdometer)} km</strong></div><div><small>RECORRIDO</small><strong>${number(j.km)} km</strong></div><div><small>INGRESOS</small><strong>${money(j.income)}</strong></div><div><small>GASOLINA</small><strong>${money(j.fuel)}</strong></div><div><small>OTROS GASTOS</small><strong>${money(j.other)}</strong></div><div><small>GANANCIA NETA</small><strong class="${j.net>=0?"positive":"negative"}">${money(j.net)}</strong></div></div><div class="detail-note">${j.startNote?`Inicio: ${escapeHtml(j.startNote)}<br>`:""}${j.endNote?`Cierre: ${escapeHtml(j.endNote)}`:""}${!j.startNote&&!j.endNote?"Sin notas para esta jornada.":""}</div>`;
    $("#detailModal").showModal();if(window.lucide)lucide.createIcons();
  }
  function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function deleteJourney(id){
    confirmAction("Eliminar jornada","Este registro se eliminará del historial. El kilometraje actual no se modificará automáticamente.",()=>{state.journeys=state.journeys.filter(j=>j.id!==id);save();renderAll();toast("Jornada eliminada.");});
  }
  function recordOilChange(){
    const odo=Number(state.settings.currentOdometer)||0;
    confirmAction("¿Registrar cambio de aceite?","Se reiniciará el contador de mantenimiento desde el kilometraje actual de "+number(odo)+" km.",()=>{state.maintenance.lastServiceOdometer=odo;state.maintenance.lastServiceDate=dateKey(new Date());state.maintenance.serviceCount=(state.maintenance.serviceCount||0)+1;save();renderAll();toast("Cambio de aceite registrado. Contador reiniciado.");});
  }
  function csvEscape(v){return `"${String(v??"").replace(/"/g,'""')}"`;}
  function exportCsv(){
    const items=monthJourneys(historyDate.getFullYear(),historyDate.getMonth()).sort((a,b)=>a.date.localeCompare(b.date));
    if(!items.length){toast("No hay jornadas para exportar en este mes.","error");return;}
    const rows=[["Fecha","Hora inicio","Hora cierre","Km inicial","Km final","Km recorridos","Ingresos S/","Gasolina S/","Otros gastos S/","Ganancia neta S/","Nota inicio","Nota cierre"],...items.map(j=>[j.date,timeLabel(j.startAt),timeLabel(j.endAt),j.startOdometer,j.endOdometer,j.km,j.income,j.fuel,j.other,j.net,j.startNote,j.endNote])];
    downloadFile("\uFEFF"+rows.map(r=>r.map(csvEscape).join(";")).join("\r\n"),`sclintex-${monthKey(historyDate.getFullYear(),historyDate.getMonth())}.csv`,"text/csv;charset=utf-8");toast("Control mensual descargado.");
  }
  function exportJson(){
    const data={...state,exportedAt:new Date().toISOString(),app:"Sclintex"};downloadFile(JSON.stringify(data,null,2),`sclintex-respaldo-${dateKey(new Date())}.json`,"application/json");toast("Respaldo descargado.");
  }
  function downloadFile(content,name,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);}
  function importJson(file){
    const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!data||!Array.isArray(data.journeys)||!data.settings)throw new Error("Formato inválido");confirmAction("Restaurar respaldo","Se reemplazarán los datos actuales por los del archivo seleccionado.",()=>{state={...initialState(),...data,settings:{...initialState().settings,...data.settings},maintenance:{...initialState().maintenance,...data.maintenance}};save();renderAll();toast("Respaldo restaurado correctamente.");});}catch{toast("El archivo no parece ser un respaldo válido de Sclintex.","error");}};reader.readAsText(file);
  }
  function updateNetPreview(){const income=Number($("#dayIncome").value)||0,fuel=Number($("#dayFuel").value)||0,other=Number($("#dayOther").value)||0;$("#closeNetPreview").textContent=money(income-fuel-other);}
  function init(){
    $("#todayLabel").textContent=today.toLocaleDateString("es-PE",{day:"numeric",month:"short",year:"numeric"});
    $$("[data-view]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));
    $$("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
    $("#dashboardStart").addEventListener("click",()=>{if(!state.activeJourney)navigate("jornada");});
    $("#menuToggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
    $("#startForm").addEventListener("submit",startJourney);$("#endForm").addEventListener("submit",endJourney);
    ["#dayIncome","#dayFuel","#dayOther"].forEach(s=>$(s).addEventListener("input",updateNetPreview));
    $("#prevMonth").addEventListener("click",()=>{historyDate.setMonth(historyDate.getMonth()-1);renderHistory();});
    $("#nextMonth").addEventListener("click",()=>{historyDate.setMonth(historyDate.getMonth()+1);renderHistory();});
    $("#exportCsv").addEventListener("click",exportCsv);$("#exportJson").addEventListener("click",exportJson);$("#settingsExport").addEventListener("click",exportJson);
    $("#historyTable").addEventListener("click",e=>{const detail=e.target.closest("[data-detail]"),del=e.target.closest("[data-delete]");if(detail)showDetail(detail.dataset.detail);if(del)deleteJourney(del.dataset.delete);});
    $("#oilChanged").addEventListener("click",recordOilChange);
    $("#goalForm").addEventListener("submit",e=>{e.preventDefault();const val=Number($("#monthlyGoal").value);if(!Number.isFinite(val)||val<0){toast("Ingresa una meta válida.","error");return;}state.settings.monthlyGoal=val;save();renderAll();toast("Meta mensual actualizada.");});
    $("#intervalForm").addEventListener("submit",e=>{e.preventDefault();const val=Number($("#serviceInterval").value),baseline=Number($("#lastServiceOdometer").value||0);if(!Number.isFinite(val)||val<100){toast("El intervalo debe ser de al menos 100 km.","error");return;}if(!Number.isFinite(baseline)||baseline<0||baseline>(Number(state.settings.currentOdometer)||baseline)){toast("Revisa el kilometraje del último cambio de aceite.","error");return;}state.settings.serviceInterval=val;state.maintenance.lastServiceOdometer=baseline;save();renderAll();toast("Configuración de mantenimiento actualizada.");});
    $("#odometerForm").addEventListener("submit",e=>{e.preventDefault();const val=Number($("#currentOdometer").value);if(!Number.isFinite(val)||val<0){toast("Ingresa un kilometraje válido.","error");return;}if(state.activeJourney&&val<state.activeJourney.startOdometer){toast("No puede ser menor al kilometraje inicial de tu jornada activa.","error");return;}state.settings.currentOdometer=val;save();renderAll();toast("Kilometraje actualizado.");});
    $("#importBackup").addEventListener("change",e=>{if(e.target.files[0])importJson(e.target.files[0]);e.target.value="";});
    $("#clearData").addEventListener("click",()=>confirmAction("Borrar todos los datos","Se eliminarán todas tus jornadas, ajustes y registros de mantenimiento. Esta acción no se puede deshacer.",()=>{state=initialState();save();renderAll();navigate("dashboard");toast("Se borraron los datos.");}));
    $("#confirmCancel").addEventListener("click",()=>closeConfirm(false));$("#confirmAccept").addEventListener("click",()=>closeConfirm(true));
    $("#notificationButton").addEventListener("click",()=>{const m=maintenanceState();if(m.done||m.soon){navigate("mantenimiento");}else toast("No tienes avisos pendientes.");});
    renderAll();
  }
  document.addEventListener("DOMContentLoaded",init);
})();