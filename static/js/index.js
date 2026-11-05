/** Seven original navigation entries, with a single owner for each page renderer. */
document.addEventListener("DOMContentLoaded",async()=>{
    if(!localStorage.getItem("access_token")){location.href="/static/login.html";return;}
    document.querySelectorAll(".nav-item").forEach(nav=>nav.addEventListener("click",e=>{e.preventDefault();UI.show(nav.dataset.page);}));
    document.getElementById("logoutBtn").onclick=()=>{API.logout();location.href="/static/login.html";};
    document.getElementById("menuToggle").onclick=()=>{const s=document.querySelector(".sidebar");s.classList.toggle("show");document.getElementById("menuToggle").setAttribute("aria-expanded",s.classList.contains("show"));};
    try{
        UI.user=await API.getCurrentUser();localStorage.setItem("user",JSON.stringify(UI.user));
        const memberships=UI.user.memberships||[],ids=[...new Set(memberships.map(m=>String(m.organization)))];
        if(!ids.includes(localStorage.getItem("organization_id"))) {
            if(ids.length)localStorage.setItem("organization_id",ids[0]);else if(UI.user.platform_admin)localStorage.setItem("organization_id","all");else throw Error("账号尚未配置单位，请联系管理员");
        }
        document.getElementById("userName").textContent=UI.user.full_name||UI.user.username;
        document.getElementById("userAvatar").textContent=(UI.user.full_name||UI.user.username).slice(0,1);
        const sel=document.getElementById("organizationSelect");
        const options=ids.map(id=>[id,memberships.find(m=>String(m.organization)===id).organization__name]);
        if(UI.user.platform_admin)options.push(["all","平台全部（只读跨单位视图）"]);
        sel.innerHTML=options.map(([id,name])=>'<option value="'+UI.esc(id)+'">'+UI.esc(name)+'</option>').join("");
        sel.value=localStorage.getItem("organization_id");sel.onchange=()=>{localStorage.setItem("organization_id",sel.value);UI.closeModal();UI.show(UI.page);};
        document.getElementById("demoNotice").textContent=UI.notice;
        await UI.show("dashboard");
    }catch(e){UI.toast(e.message,true);}
});
const Dashboard={
    async render(){
        const [s,wo,parts]=await Promise.all([API.get("/reports/overview/"),API.get("/workorders/",{ordering:"-created_at"}),API.get("/spareparts/",{low_stock:"true"})]);
        const cards=[["总设备数",s.assets.total],["待维修工单",s.workorders.pending],["点检异常记录",s.inspections.abnormal_records],["低库存备件",parts.count]].map(([label,value])=>'<div class="stat-card"><div class="stat-label">'+label+'</div><div class="stat-value">'+value+'</div></div>').join("");
        UI.mount("dashboard",'<div class="stats-grid">'+cards+'</div>'+UI.card("最近工单",UI.table(["工单号","设备","类型","状态","创建时间"],wo.results.slice(0,10).map(w=>[UI.esc(w.wo_code),UI.esc(w.equipment_name),UI.status(w.wo_type),UI.status(w.status),UI.datetime(w.created_at)])),UI.btn("查看工单","UI.show(\'workorders\')"))+UI.card("演示业务边界",'<p>当前为P0：台账、日常点检、维护维修、生命周期及统计。检测、检验、安装登记和报废审批尚未进入P1开发。</p><p>日期由人工录入模拟资料，不按设备类别自动推算法定周期。</p>'));
    }
};
