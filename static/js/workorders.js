const WorkOrders={
    rows:[],filter:{},
    async render(){
        this.rows=(await API.getWorkOrders(this.filter)).results;
        const search='<form id="woFilters" class="search-bar"><input name="search" class="form-input" aria-label="搜索工单" placeholder="搜索工单号、摘要" value="'+UI.esc(this.filter.search||"")+'"><select name="status" class="form-select" aria-label="工单状态"><option value="">全部状态</option>'+["open","assigned","in_progress","completed","closed","canceled"].map(v=>'<option value="'+v+'" '+(v===this.filter.status?"selected":"")+'>'+({open:"待处理",assigned:"已分配",in_progress:"进行中",completed:"已完工",closed:"已关闭",canceled:"已取消"})[v]+'</option>').join("")+'</select><button class="btn btn-primary" type="submit">查询</button></form>';
        const actions=UI.manager()?UI.btn("创建工单","WorkOrders.form()","primary")+UI.btn("批量导入","WorkOrders.importFile()")+UI.btn("导出列表","WorkOrders.exportFile()"):"";
        UI.mount("workorders",UI.card("工单管理",search+UI.paged(["工单号","设备","类型","摘要","受托单位","执行人","状态","操作"],this.rows.map(w=>[UI.esc(w.wo_code),UI.esc(w.equipment_name),UI.status(w.wo_type),UI.esc(w.summary),UI.esc(w.service_org_name||"待分配"),UI.esc(w.assignee_name||"待分配"),UI.status(w.status),UI.btn("详情","WorkOrders.detail("+w.id+")")])),actions));
        document.getElementById("woFilters").onsubmit=e=>{e.preventDefault();this.filter=UI.formData(e.target);UI.run(()=>this.render());};
    },
    async form(id=null){
        await UI.run(async()=>{
            const assets=await UI.ownedAssets(),w=id?await API.getWorkOrder(id):{};
            let body='<div class="form-grid">'+UI.field("equipment","设备","select",w.equipment||"",assets.map(a=>[a.id,a.code+" · "+a.name]),true)+UI.field("wo_type","任务类型","select",w.wo_type||"CM",[["CM","维修任务"],["PM","日常维护"]])+UI.field("summary","任务摘要","text",w.summary||"",[],true)+UI.field("priority","优先级","select",w.priority||"medium",[["low","低"],["medium","中"],["high","高"],["critical","紧急"]])+UI.field("planned_start","计划开始","datetime-local",w.planned_start?.slice(0,16)||"")+UI.field("planned_end","计划结束","datetime-local",w.planned_end?.slice(0,16)||"")+'</div>'+UI.field("description","问题说明","textarea",w.description||"");
            await UI.modal(id?"编辑工单":"创建工单",body,async f=>{const data=UI.formData(f);data.equipment=Number(data.equipment);for(const k of ["planned_start","planned_end"])data[k]=data[k]||null;let created;if(id)await API.updateWorkOrder(id,data);else created=await API.createWorkOrder(data);UI.toast("任务已保存");await this.render();});
        });
    },
    async detail(id){
        await UI.run(async()=>{
            const [w,comments]=await Promise.all([API.getWorkOrder(id),API.all("/workorders/comments/",{work_order:id})]);this.selected=w;
            const owner=w.requesting_org===UI.org(),executor=w.assignee===UI.user.id&&w.service_org===UI.org();
            let actions=UI.btn("返回工单","WorkOrders.render()");
            if(owner&&w.source_inspection)actions+=UI.btn("查看来源点检","UI.show(\'inspections\').then(()=>Inspections.record("+w.source_inspection+"))");
            if(UI.manager()&&owner&&w.status==="open")actions+=UI.btn("分配任务","WorkOrders.assign("+id+")","primary")+UI.btn("编辑","WorkOrders.form("+id+")");
            if(executor&&w.status==="assigned")actions+=w.accepted_at?UI.btn("开始 / 维修进场","WorkOrders.move("+id+",\'start\')","primary"):UI.btn("接单","WorkOrders.move("+id+",\'accept\')","primary");
            if(executor&&w.status==="in_progress")actions+=UI.btn("处理过程","WorkOrders.progress("+id+")")+UI.btn("完工反馈","WorkOrders.complete("+id+")","primary");
            if(UI.manager()&&owner&&w.status==="completed")actions+=UI.btn("使用单位确认关闭","WorkOrders.move("+id+",\'close\')","primary");
            if(UI.manager()&&owner&&["open","assigned"].includes(w.status))actions+=UI.btn("取消任务","WorkOrders.cancel("+id+")","warning");
            const fields=[["设备",w.equipment_name],["工单类型",w.wo_type],["摘要",w.summary],["问题说明",w.description],["当前状态",w.status],["受托单位",w.service_org_name||"未分配"],["执行人员",w.assignee_name||"未分配"],["接单时间",w.accepted_at?new Date(w.accepted_at).toLocaleString():"未接单"],["处理措施",w.actions_taken],["根因",w.root_cause],["工时",w.labor_hours],["备件成本",w.parts_cost],["计划开始",w.planned_start],["计划结束",w.planned_end]];
            const process=UI.table(["时间","人员","类型","过程"],comments.results.map(c=>[UI.datetime(c.performed_at||c.created_at),UI.esc(c.author_name),UI.esc(c.event_kind),UI.esc(c.comment)]));
            UI.mount("workorders",UI.card("工单详情 · "+w.wo_code,UI.table(["项目","内容"],fields.map(([k,v])=>[UI.esc(k),UI.esc(v??"—")]))+'<p class="message message-warning">维修完工和关闭不代表设备获准使用。需使用单位复核异常，并在设备详情执行独立模拟复用确认。</p>',actions)+UI.card("处理过程与反馈",process));
        });
    },
    async assign(id){
        await UI.run(async()=>{
            const w=await API.getWorkOrder(id),auth=await API.get("/assets/"+w.equipment+"/service_authorizations/"),kind=w.wo_type==="PM"?"maintenance":"repair",providers=auth.filter(a=>a.service_kind===kind);
            if(!providers.length)throw Error("请先在设备详情授予对应维护/维修单位服务权限");
            await UI.modal("分配受托单位和人员",UI.field("service_org","受托单位","select","",providers.map(a=>[a.service_org,a.service_org_name]),true)+UI.field("assignee_id","执行人","select","",[],true),async f=>{const d=UI.formData(f);d.version=w.version;await API.post("/workorders/"+id+"/assign/",d);await this.detail(id);UI.toast("任务已分配");});
            const select=document.getElementById("f-service_org"),person=document.getElementById("f-assignee_id");
            const fill=()=>person.innerHTML=(providers.find(p=>String(p.service_org)===select.value)?.members||[]).map(m=>'<option value="'+m.id+'">'+UI.esc(m.full_name||m.username)+'</option>').join("");
            select.onchange=fill;fill();
        });
    },
    async move(id,action){
        await UI.run(async()=>{await API.post("/workorders/"+id+"/"+action+"/",{version:this.selected.version});UI.toast("业务动作已保存");await this.detail(id);});
    },
    async complete(id){
        await UI.modal("完工反馈",UI.field("actions_taken","处理措施","textarea","",[],true)+UI.field("root_cause","问题根因","textarea")+UI.field("labor_hours","工时","number","0")+UI.field("downtime_minutes","停机分钟","number","0")+UI.field("parts_cost","备件成本","number","0"),async f=>{const d=UI.formData(f);d.version=this.selected.version;await API.post("/workorders/"+id+"/complete/",d);await this.detail(id);UI.toast("完工反馈已保存，等待使用单位确认");});
    },
    async progress(id){
        await UI.modal("新增处理过程",UI.field("comment","处理过程记录","textarea","",[],true)+UI.field("is_internal","可见范围","select","false",[["false","任务双方可见"],["true","仅本单位内部"]]),async f=>{const d=UI.formData(f);d.work_order=id;d.is_internal=d.is_internal==="true";await API.post("/workorders/comments/",d);await this.detail(id);});
    },
    async cancel(id){
        await UI.modal("取消任务",UI.field("reason","取消原因","textarea","",[],true),async f=>{await API.post("/workorders/"+id+"/cancel/",{reason:UI.val(f,"reason"),version:this.selected.version});await this.detail(id);});
    },
    importFile(){UI.upload("/workorders/import_excel/",()=>this.render());},
    exportFile(){UI.run(()=>API.download("/workorders/export_csv/","工单列表.xlsx"));}
};
