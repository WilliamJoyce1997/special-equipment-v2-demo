/** Small shared helpers using the existing CSS components. */
const UI={
    user:null,page:"dashboard",notice:"模拟业务数据，不构成法定检验证明、证书或许可",
    esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));},
    manager(){return !!this.user&&(this.user.platform_admin||this.user.memberships?.some(m=>String(m.organization)===localStorage.getItem("organization_id")&&m.business_role==="manager"));},
    org(){return Number(localStorage.getItem("organization_id"))||null;},
    orgName(){return this.user?.memberships?.find(m=>m.organization===this.org())?.organization__name||"平台范围";},
    btn(label,handler,kind="secondary"){return '<button type="button" class="btn btn-'+kind+' btn-sm" onclick="'+handler+'">'+this.esc(label)+'</button>';},
    card(title,body,actions=""){return '<div class="card"><div class="card-header"><h3 class="card-title">'+this.esc(title)+'</h3><div class="action-buttons">'+actions+'</div></div><div class="card-body">'+body+'</div></div>';},
    table(headers,rows){return '<div class="table-container"><table><thead><tr>'+headers.map(h=>'<th>'+this.esc(h)+'</th>').join("")+'</tr></thead><tbody>'+ (rows.length?rows.map(row=>'<tr>'+row.map(cell=>'<td>'+cell+'</td>').join("")+'</tr>').join(""):'<tr><td colspan="'+headers.length+'" class="empty-state">暂无数据</td></tr>')+'</tbody></table></div>';},
    field(name,label,type="text",value="",options=[],required=false){
        const id="f-"+name,common=' id="'+id+'" name="'+name+'" '+(required?'required ':'');
        let input=type==="select"?'<select class="form-select"'+common+'>'+options.map(([v,l])=>'<option value="'+this.esc(v)+'" '+(String(v)===String(value)?'selected':'')+'>'+this.esc(l)+'</option>').join("")+'</select>':type==="textarea"?'<textarea class="form-textarea"'+common+' rows="3">'+this.esc(value)+'</textarea>':'<input class="form-input" type="'+type+'"'+common+' value="'+this.esc(value)+'" '+(type==="number"?'min="0" step="any"':'')+'>';
        return '<div class="form-group"><label class="form-label" for="'+id+'">'+this.esc(label)+(required?' *':'')+'</label>'+input+'</div>';
    },
    val(form,name){return form.elements.namedItem(name)?.value??"";},
    formData(form){return Object.fromEntries(new FormData(form).entries());},
    async modal(title,body,submit,label="保存"){
        this.closeModal();const focus=document.activeElement;
        const div=document.createElement("div");div.id="businessModal";div.className="modal show";div.setAttribute("role","dialog");div.setAttribute("aria-modal","true");div.setAttribute("aria-labelledby","modalHeading");
        div.innerHTML='<div class="modal-content"><form id="businessForm"><div class="modal-header"><h3 class="modal-title" id="modalHeading">'+this.esc(title)+'</h3>'+this.btn("关闭","UI.closeModal()")+'</div><div class="modal-body">'+body+'<div id="formError" role="alert" class="message message-error" hidden></div></div><div class="modal-footer">'+this.btn("取消","UI.closeModal()")+'<button type="submit" class="btn btn-primary">'+this.esc(label)+'</button></div></form></div>';
        document.body.append(div);this.returnFocus=focus;
        const form=div.querySelector("form");
        form.addEventListener("submit",async e=>{e.preventDefault();if(!form.reportValidity())return;const button=form.querySelector('[type="submit"]');button.disabled=true;try{await submit(form);this.closeModal();}catch(err){const el=div.querySelector("#formError");el.hidden=false;el.textContent=err.message;}finally{button.disabled=false;}});
        div.addEventListener("keydown",e=>{if(e.key==="Escape")this.closeModal();if(e.key==="Tab"){const els=[...div.querySelectorAll('button,input,select,textarea')].filter(x=>!x.disabled&&!x.hidden);const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
        setTimeout(()=>form.querySelector("input,select,textarea")?.focus(),0);
    },
    closeModal(){document.getElementById("businessModal")?.remove();this.returnFocus?.focus();},
    toast(message,error=false){let box=document.getElementById("appMessage");if(!box){box=document.createElement("div");box.id="appMessage";box.setAttribute("role","status");document.querySelector(".content").prepend(box);}box.className="message message-"+(error?"error":"success");box.textContent=message;box.hidden=false;setTimeout(()=>box.hidden=true,7000);},
    async run(fn){try{return await fn();}catch(e){this.toast(e.message,true);}},
    async show(page){
        this.page=page;document.querySelectorAll(".page-container").forEach(el=>el.classList.toggle("active",el.id==="page-"+page));document.querySelectorAll(".nav-item").forEach(el=>el.classList.toggle("active",el.dataset.page===page));
        document.getElementById("pageTitle").textContent=({dashboard:"工作台",assets:"设备台账",workorders:"工单管理",maintenance:"保养计划",inspections:"点检记录",spareparts:"备件管理",reports:"报表统计"})[page];
        document.querySelector(".sidebar").classList.remove("show");
        const el=document.getElementById("page-"+page);el.innerHTML=this.card("加载中",'<div class="empty-state">正在读取数据…</div>');
        try{await ({dashboard:Dashboard,assets:Assets,workorders:WorkOrders,maintenance:Maintenance,inspections:Inspections,spareparts:SpareParts,reports:Reports})[page].render();}catch(e){el.innerHTML=this.card("加载失败",'<p role="alert">'+this.esc(e.message)+'</p>',this.btn("重试","UI.show(\''+page+'\')"));}
    },
    mount(page,html){document.getElementById("page-"+page).innerHTML=html;},
    status(value){const labels={active:"运行中",inactive:"停用/未投用",maintenance:"维护维修中",retired:"报废",registered:"建档",pending_acceptance:"待模拟准入确认",in_service:"在用",suspended:"停用",open:"待处理",assigned:"已分配",in_progress:"进行中",completed:"已完成",closed:"已关闭",canceled:"已取消",pending:"待执行",pass:"正常",fail:"异常",warning:"需关注",resolved:"已解决",pending_verification:"待复核",PM:"日常维护",CM:"维修",elevator:"电梯",unknown:"未分类"};
        return '<span class="badge">'+this.esc(labels[value]||value||"待确认")+'</span>';},
    datetime(value){return value?this.esc(new Date(value).toLocaleString("zh-CN",{hour12:false})):"—";},
    paged(headers,rows,page=1){
        this.tableCache={headers,rows,page};const size=15,html=this.table(headers,rows.slice((page-1)*size,page*size));
        return '<div id="pagedTable">'+html+'<div class="pagination">'+this.btn("上一页","UI.tablePage(-1)")+'<span>第'+page+'/'+Math.max(1,Math.ceil(rows.length/size))+'页，共'+rows.length+'条</span>'+this.btn("下一页","UI.tablePage(1)")+'</div></div>';
    },
    tablePage(delta){const {headers,rows,page}=this.tableCache;const p=Math.min(Math.max(1,page+delta),Math.max(1,Math.ceil(rows.length/15)));document.getElementById("pagedTable").outerHTML=this.paged(headers,rows,p);},
    async members(){return (await API.get("/auth/memberships/")).results;},
    async ownedAssets(){return (await API.getAssets()).results.filter(a=>a.using_organization===this.org());},
    async upload(path,refresh){const input=document.createElement("input");input.type="file";input.accept=".xlsx,.csv";input.onchange=()=>this.run(async()=>{const result=await API.upload(path,input.files[0]);this.toast("导入成功 "+result.success_count+"，失败 "+result.error_count+" "+(result.errors||[]).join("；"));await refresh();});input.click();}
};
