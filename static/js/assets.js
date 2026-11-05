const Assets={
    rows:[],filter:{},
    async render(){
        this.rows=(await API.getAssets(this.filter)).results;
        const members=UI.manager();
        const actions=members?UI.btn("新增设备","Assets.form()","primary")+UI.btn("批量导入","Assets.importFile()")+UI.btn("下载模板","Assets.template()")+UI.btn("导出台账","Assets.exportFile()"):"";
        const search='<form id="assetFilters" class="search-bar"><input class="form-input" name="search" aria-label="搜索设备" placeholder="搜索编号、名称、型号…" value="'+UI.esc(this.filter.search||"")+'"><select class="form-select" name="status" aria-label="设备状态"><option value="">全部状态</option>'+["active","inactive","maintenance","retired"].map(v=>'<option value="'+v+'" '+(this.filter.status===v?'selected':'')+'>'+({active:"运行中",inactive:"停用/未投用",maintenance:"维护维修中",retired:"报废"})[v]+'</option>').join("")+'</select><button class="btn btn-primary" type="submit">查询</button></form>';
        const rows=this.rows.map(a=>[UI.esc(a.code),UI.esc(a.name),UI.status(a.equipment_category),UI.esc(a.process||"—"),UI.esc(a.equipment_id||"—"),UI.esc(a.model||"—"),UI.esc(a.location_display||a.installation_location||"—"),UI.status(a.status),UI.esc(a.responsible_person_name||"—"),UI.esc(a.next_examination_date||"待补"),UI.btn("详情","Assets.detail("+a.id+")")+(members?UI.btn("编辑","Assets.form("+a.id+")"):"")]);
        UI.mount("assets",UI.card("设备台账",search+UI.paged(["设备编码","设备名称","类别","工序","设备ID","型号","位置","状态","负责人","下次模拟检验","操作"],rows),actions));
        document.getElementById("assetFilters").onsubmit=e=>{e.preventDefault();this.filter=UI.formData(e.target);UI.run(()=>this.render());};
    },
    async form(id=null){
        await UI.run(async()=>{
            const [asset,members]=await Promise.all([id?API.getAsset(id):Promise.resolve({is_demo:true,equipment_category:"elevator"}),UI.members()]);
            let body='<p class="message message-warning">新建默认为建档/未投用。状态通过详情中的受控动作变更；检验日期仅作人工模拟资料。</p><div class="form-grid">';
            const people=[["","请选择负责人"],...members.filter(m=>["manager","operator"].includes(m.business_role)).map(m=>[m.user,m.full_name||m.username])];
            body+=UI.field("code","设备编号","text",asset.code||"",[],true)+UI.field("name","设备名称","text",asset.name||"",[],true)+UI.field("equipment_category","特种设备类别","select",asset.equipment_category||"",[["","未分类"],["elevator","电梯"],["boiler","锅炉"],["pressure_vessel","压力容器"],["pressure_pipeline","压力管道"],["crane","起重机械"],["passenger_ropeway","客运索道"],["amusement","大型游乐设施"],["special_vehicle","场内专用机动车辆"]],true)+UI.field("responsible_person","设备负责人","select",asset.responsible_person||"",people,true);
            for(const [key,label,type] of [["model","规格型号","text"],["specification","规格说明","text"],["installation_location","安装位置","text"],["vendor","厂商（虚构）","text"],["serial_number","序列号","text"],["process","工序","text"],["equipment_id","外部设备ID","text"],["factory","工厂","text"],["workshop","车间","text"],["line","产线","text"],["station","工位","text"],["start_date","投用资料日期","date"],["warranty_expiry","保修到期","date"],["last_examination_date","最近模拟检验日期","date"],["next_examination_date","下次模拟检验日期","date"],["current_meter_reading","当前计数读数","number"],["meter_unit","计数单位","text"],["asset_value","资产价值","number"],["cost_center","成本中心","text"],["expected_life_years","预计使用年限","number"]])body+=UI.field(key,label,type,asset[key]??"");
            body+=UI.field("criticality","重要性","select",asset.criticality||"normal",[["normal","一般"],["important","重要"],["critical","关键"]])+UI.field("notes","备注","textarea",asset.notes||"")+'</div>';
            await UI.modal(id?"编辑设备":"新增设备",body,async f=>{
                const data=UI.formData(f);
                for(const key of ["responsible_person","current_meter_reading","asset_value","expected_life_years"])data[key]=data[key]===""?(key==="current_meter_reading"?0:null):Number(data[key]);
                for(const key of ["start_date","warranty_expiry","last_examination_date","next_examination_date"])data[key]=data[key]||null;
                if(!id)data.is_demo=true;
                if(id)await API.updateAsset(id,data);else await API.createAsset(data);
                UI.toast("设备档案已保存");await this.render();
            });
        });
    },
    async detail(id,tab="basic"){
        await UI.run(async()=>{
            const a=await API.getAsset(id);this.selected=a;
            const own=a.using_organization===UI.org()||UI.user.platform_admin;
            const controls=UI.btn("返回台账","Assets.render()")+(UI.manager()&&own?UI.btn("编辑档案","Assets.form("+id+")")+UI.btn("服务单位授权","Assets.authorize("+id+")"):"");
            const tabs=UI.btn("基本档案","Assets.detail("+id+",\'basic\')")+ (own?UI.btn("生命周期","Assets.detail("+id+",\'timeline\')"):"");
            let content="";
            if(tab==="timeline"){
                const events=await API.all("/assets/"+id+"/timeline/");
                content='<ol class="lifecycle-timeline">'+events.results.map(e=>{
                    let link="";
                    if(e.source_type==="WorkOrder")link=UI.btn("查看工单","UI.show(\'workorders\').then(()=>WorkOrders.detail("+e.source_id+"))");
                    if(e.source_type==="InspectionRecord")link=UI.btn("查看点检","UI.show(\'inspections\').then(()=>Inspections.record("+e.source_id+"))");
                    return '<li><div>'+UI.datetime(e.occurred_at)+' · '+UI.esc(e.actor_org_name||"历史单位待补")+' · '+UI.esc(e.actor_name||"历史人员待补")+'</div><strong>'+UI.esc(e.summary)+'</strong><div class="muted">来源 '+UI.esc(e.source_type)+' #'+e.source_id+(e.is_historical?' · 历史导入':'')+'</div>'+link+'</li>';
                }).join("")+'</ol>';
                if(!events.count)content='<p class="empty-state">暂无可证明的生命周期事件</p>';
            } else{
                content=UI.table(["档案项目","内容"],[["设备编号",a.code],["设备名称",a.name],["类别",a.equipment_category],["型号/规格",(a.model||"")+" / "+(a.specification||"")],["使用单位",a.using_organization_name],["设备负责人",a.responsible_person_name],["安装位置",a.installation_location||a.location_display],["运行状态",a.status],["生命周期",a.lifecycle_stage||"历史阶段待确认"],["最近模拟检验",a.last_examination_date||"待补"],["下次模拟检验",a.next_examination_date||"待补"],["日期来源","人工模拟资料，非周期推算"],["最近/下次保养",(a.last_maintenance_date||"待补")+" / "+(a.next_maintenance_date||"待补")],["备注",a.notes]].map(([k,v])=>[UI.esc(k),UI.esc(v||"—")]));
                if(UI.manager()&&own){
                    if(["registered","suspended"].includes(a.lifecycle_stage))content+=UI.btn("申请模拟准入","Assets.state("+id+",\'request_admission\')","primary");
                    if(a.lifecycle_stage==="pending_acceptance")content+=UI.btn("确认模拟投入使用","Assets.state("+id+",\'confirm_admission\')","primary");
                    if(a.lifecycle_stage==="in_service")content+=UI.btn("停用设备","Assets.state("+id+",\'suspend\')","warning");
                }
                content+='<p class="message message-warning">安装登记、检测、检验结果及报废审批属于P1，当前未实现。日常点检与维护维修记录可在相应菜单及生命周期查看。</p>';
            }
            UI.mount("assets",UI.card("设备详情 · "+a.code,tabs+content,controls));
        });
    },
    async state(id,action){
        await UI.modal("受控模拟状态操作",'<p class="message message-warning">'+UI.notice+'。本操作仅允许已确认演示条件的虚构设备，不产生真实准用结论。</p>'+UI.field("reason","操作原因与模拟确认说明","textarea","",[],true),async f=>{await API.post("/assets/"+id+"/state-transitions/",{action,reason:UI.val(f,"reason"),version:this.selected.version});await this.detail(id);UI.toast("模拟状态已记录");},"提交确认");
    },
    async authorize(id){
        await UI.run(async()=>{
            const orgs=(await API.get("/auth/organizations/")).results.filter(o=>o.capabilities.includes("maintenance")||o.capabilities.includes("repair"));
            const existing=await API.get("/assets/"+id+"/service_authorizations/",{include_inactive:"1"});
            const body='<p>只授予本设备的指定服务；人员须为受托单位有效成员。</p>'+UI.table(["已授权单位","服务","有效期/状态","操作"],existing.map(a=>[UI.esc(a.service_org_name),UI.esc(a.service_kind),UI.esc((a.valid_from||"不限")+" 至 "+(a.valid_until||"不限")+" "+(a.effective?"有效":"未生效/撤销")),a.is_active?UI.btn("撤销","Assets.revoke("+id+","+a.service_org+",\'"+a.service_kind+"\')"):"已撤销"]))+UI.field("service_org","服务单位","select","",orgs.map(o=>[o.id,o.name]),true)+UI.field("service_kind","服务种类","select","repair",[["repair","维修"],["maintenance","维护"]],true)+UI.field("valid_from","授权开始日期","date")+UI.field("valid_until","授权结束日期","date");
            await UI.modal("服务单位授权",body,async f=>{const data=UI.formData(f);data.valid_from=data.valid_from||null;data.valid_until=data.valid_until||null;await API.post("/assets/"+id+"/service_authorizations/",data);UI.toast("设备服务授权已保存");await this.detail(id);});
        });
    },
    async revoke(id,service_org,service_kind){
        await UI.run(async()=>{await API.post("/assets/"+id+"/service_authorizations/",{service_org,service_kind,is_active:false});UI.closeModal();await this.detail(id);UI.toast("对应设备服务权限已撤销");});
    },
    importFile(){UI.upload("/assets/import_excel/",()=>this.render());},
    template(){UI.run(()=>API.download("/assets/download_template/","设备导入模板.xlsx"));},
    exportFile(){UI.run(()=>API.download("/assets/export_csv/","设备台账.xlsx"));}
};
