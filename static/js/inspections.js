const Inspections={
    tab:"tasks",plans:[],tasks:[],records:[],templates:[],
    today(){return new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Shanghai"});},
    async render(tab=this.tab){
        this.tab=tab;
        const values=await Promise.all(["plans/","tasks/","","templates/"].map(p=>API.all("/inspections/"+p)));
        [this.plans,this.tasks,this.records,this.templates]=values.map(v=>v.results);
        const tabs=[["tasks","点检任务"],["plans","点检计划"],["records","执行记录"],["templates","点检模板"]].map(([key,label])=>UI.btn(label,"Inspections.render(\'"+key+"\')",key===tab?"primary":"secondary")).join("");
        let body="",actions="";
        if(tab==="tasks"){
            body=UI.paged(["计划","设备","计划日期","执行人","状态","操作"],this.tasks.map(t=>[UI.esc(t.plan_title),UI.esc(t.equipment_name),UI.esc(t.scheduled_date),UI.esc(t.executor_name),UI.status(t.status),t.status==="pending"&&t.executor===UI.user.id?UI.btn("执行点检","Inspections.execute("+t.id+")","primary"):UI.esc(t.status==="completed"?"查看执行记录":"等待指派人员")]));
        }else if(tab==="plans"){
            body=UI.paged(["编码","计划","设备","执行人","日常频次","状态","操作"],this.plans.map(p=>[UI.esc(p.code),UI.esc(p.title),UI.esc(p.equipment_name),UI.esc(p.executor_name),p.frequency_days+"天",p.is_active?"启用":"停用",UI.manager()?UI.btn("生成当日任务","Inspections.generate("+p.id+")","primary")+UI.btn("编辑","Inspections.planForm("+p.id+")"):"只读"]));
            if(UI.manager())actions=UI.btn("新建点检计划","Inspections.planForm()","primary");
        }else if(tab==="templates"){
            body=UI.table(["编码","模板","点检项目","状态"],this.templates.map(t=>[UI.esc(t.code),UI.esc(t.name),UI.esc(t.items_template.map(i=>i.name).join("、")),t.is_active?"启用":"停用"]));
            if(UI.manager())actions=UI.btn("新增点检模板","Inspections.templateForm()","primary");
        }else{
            body=UI.paged(["设备","实际执行时间","执行人","结果","关联维修","操作"],this.records.map(r=>[UI.esc(r.equipment_name),UI.datetime(r.performed_at||r.created_at),UI.esc(r.inspector_name),UI.status(r.result),r.triggered_work_order?"#"+r.triggered_work_order:"—",UI.btn("记录详情","Inspections.record("+r.id+")")]));
        }
        UI.mount("inspections",UI.card("日常点检",'<div class="action-buttons tabs">'+tabs+'</div>'+body,actions));
    },
    async templateForm(){
        await UI.modal("新增日常点检模板",UI.field("code","模板编码","text","",[],true)+UI.field("name","模板名称","text","",[],true)+UI.field("item_names","点检项目（每行一项）","textarea","门区观察\n运行异响观察\n标识完整性",[],true)+UI.field("blocking","异常处理规则","select","true",[["true","异常阻断复用，需维修及使用单位复核"],["false","一般关注，不自动阻断"]]),async f=>{const d=UI.formData(f);const names=d.item_names.split("\n").map(x=>x.trim()).filter(Boolean);await API.post("/inspections/templates/",{code:d.code,name:d.name,items_template:names.map((name,i)=>({item_code:"item-"+(i+1),name,required:true,severity:d.blocking==="true"?"blocking":"warning",blocks_release:d.blocking==="true"}))});UI.toast("日常点检模板已保存");await this.render("templates");});
    },
    async planForm(id=null){
        await UI.run(async()=>{
            const [assets,members]=await Promise.all([UI.ownedAssets(),UI.members()]);const p=this.plans.find(x=>x.id===id)||{};
            if(!this.templates.length)throw Error("请先在点检模板页创建模板");
            const body='<div class="form-grid">'+UI.field("code","计划编码","text",p.code||"",[],true)+UI.field("title","点检计划名称","text",p.title||"",[],true)+UI.field("equipment","设备","select",p.equipment||"",assets.map(a=>[a.id,a.code+" · "+a.name]),true)+UI.field("template","点检模板","select",p.template||"",this.templates.filter(t=>t.is_active).map(t=>[t.id,t.name]),true)+UI.field("executor","执行人员","select",p.executor||"",members.filter(m=>["manager","operator"].includes(m.business_role)).map(m=>[m.user,m.full_name||m.username]),true)+UI.field("frequency_days","日常频次（天）","number",p.frequency_days||1,[],true)+UI.field("start_date","开始日期","date",p.start_date||this.today(),[],true)+UI.field("end_date","结束日期","date",p.end_date||"")+'</div>';
            await UI.modal(id?"编辑点检计划":"新建点检计划",body,async f=>{const d=UI.formData(f);d.end_date=d.end_date||null;d.frequency_days=Number(d.frequency_days);if(id)await API.patch("/inspections/plans/"+id+"/",d);else await API.post("/inspections/plans/",d);UI.toast("点检计划已保存");await this.render("plans");});
        });
    },
    async generate(id){await UI.run(async()=>{const r=await API.post("/inspections/plans/"+id+"/generate_tasks/",{from_date:this.today(),to_date:this.today()});UI.toast("新建任务 "+r.created+"，计划任务总数 "+r.tasks);await this.render("tasks");});},
    async execute(id){
        const t=this.tasks.find(x=>x.id===id),key=crypto.randomUUID();
        const now=new Date(),local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
        let body='<p class="message message-warning">日常点检记录，与法定检测/检验结果分开。</p>'+UI.field("performed_at","实际执行时间","datetime-local",local,[],true);
        t.template_snapshot.forEach((item,i)=>{body+='<fieldset><legend>'+UI.esc(item.name)+(item.blocks_release?" · 异常阻断":"")+'</legend>'+UI.field("result_"+i,"项目结果","select","normal",[["normal","正常"],["abnormal","异常"],["attention","需关注"]],true)+UI.field("value_"+i,"观察读数（可选）")+UI.field("note_"+i,"说明","textarea")+'</fieldset>';});
        body+=UI.field("notes","总体说明","textarea");
        await UI.modal("执行点检 · "+t.equipment_name,body,async f=>{const payload={task:id,performed_at:UI.val(f,"performed_at"),idempotency_key:key,notes:UI.val(f,"notes"),items:t.template_snapshot.map((item,i)=>({item_code:item.item_code,result:UI.val(f,"result_"+i),value:UI.val(f,"value_"+i),note:UI.val(f,"note_"+i)}))};const r=await API.post("/inspections/",payload);UI.toast("点检记录已提交");await this.record(r.id);},"提交点检");
    },
    async record(id){
        await UI.run(async()=>{
            const r=await API.get("/inspections/"+id+"/");
            let actions=UI.btn("返回记录","Inspections.render(\'records\')");
            if(r.issues.length&&!r.triggered_work_order)actions+=UI.btn("上报维修","Inspections.report("+id+")","primary");
            if(r.triggered_work_order)actions+=UI.btn("查看关联工单","UI.show(\'workorders\').then(()=>WorkOrders.detail("+r.triggered_work_order+"))");
            const items=UI.table(["项目","结果","读数","说明"],r.items.map(i=>[UI.esc(i.name||i.item),UI.esc({normal:"正常",abnormal:"异常",attention:"需关注"}[i.result]||(i.ok?"正常":"异常")),UI.esc(i.value||"—"),UI.esc(i.note||"—")]));
            const issues=UI.table(["项目编码","阻断复用","处理状态","复核依据","操作"],r.issues.map(i=>[UI.esc(i.item_code),i.blocks_release?"是":"否",UI.status(i.status),UI.esc(i.resolution_note||"—"),UI.manager()&&i.status!=="resolved"?UI.btn("复核已解决","Inspections.resolve("+i.id+","+id+")"):"—"]));
            UI.mount("inspections",UI.card("点检记录 #"+id,'<p>'+UI.esc(r.equipment_name)+' · '+UI.esc(r.inspector_name)+' · '+UI.datetime(r.performed_at||r.created_at)+' · '+UI.status(r.result)+'</p>'+items+'<p>'+UI.esc(r.notes||"")+'</p>',actions)+UI.card("异常问题与维修闭环",issues));
        });
    },
    async report(id){await UI.run(async()=>{const r=await API.post("/inspections/"+id+"/report_issue/");UI.toast((r.created?"已创建":"已关联")+"维修工单 "+r.wo_code);await this.record(id);});},
    async resolve(issue,id){
        await UI.modal("使用单位复核异常",'<p>须先由使用单位确认维修工单关闭。此处填写模拟复查依据，不是法定检验结论。</p>'+UI.field("resolution_note","复查依据","textarea","",[],true),async f=>{await API.post("/inspections/issues/"+issue+"/verify_resolution/",UI.formData(f));UI.toast("异常复核已记录；设备仍需独立模拟复用确认");await this.record(id);});
    }
};
