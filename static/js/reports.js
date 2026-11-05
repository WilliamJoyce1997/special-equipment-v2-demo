const Reports={
    filters:{},
    chart(rows){
        const max=Math.max(1,...rows.map(r=>r.count));
        return '<div class="report-bars">'+rows.map(r=>'<div class="report-bar-row"><span>'+UI.status(r.label)+'</span><div class="report-bar-track"><div class="report-bar-fill" style="width:'+Math.round(r.count/max*100)+'%"></div></div><strong>'+r.count+'</strong></div>').join("")+'</div>'+(rows.length?"":'<p class="empty-state">暂无分布数据</p>');
    },
    async render(){
        const [s,assets,orgs]=await Promise.all([API.get("/reports/overview/",this.filters),API.getAssets(),API.get("/auth/organizations/")]);this.snapshot=s;
        const date=s.filters,form='<form id="reportFilters" class="search-bar">'+UI.field("from","开始日期（含）","date",date.from)+UI.field("to","结束日期（不含）","date",date.to)+UI.field("equipment","设备","select",this.filters.equipment||"",[["","授权范围全部"],...assets.results.map(a=>[a.id,a.code+" · "+a.name])])+UI.field("equipment_category","设备类别","select",this.filters.equipment_category||"",[["","全部类别"],["elevator","电梯"],["boiler","锅炉"],["pressure_vessel","压力容器"],["crane","起重机械"]])+UI.field("using_org","使用单位","select",this.filters.using_org||"",[["","授权范围全部"],...orgs.results.filter(o=>o.capabilities.includes("using")).map(o=>[o.id,o.name])])+UI.field("window_days","临期提醒窗口（天）","number",date.window_days)+'<button type="submit" class="btn btn-primary">刷新统计</button></form>';
        const rate=s.inspections.completion_rate===null?"无计划":s.inspections.completion_rate+"%";
        const cards=[["设备总量",s.assets.total],["待维修",s.workorders.pending],["维修已完工/关闭",s.workorders.completed],["点检完成率",rate],["点检异常记录",s.inspections.abnormal_records],["检验临期 / 逾期",s.examinations.expiring+" / "+s.examinations.overdue]].map(([label,value])=>'<div class="stat-card"><div class="stat-label">'+label+'</div><div class="stat-value">'+value+'</div></div>').join("");
        const reminders=[...s.examinations.overdue_assets,...s.examinations.expiring_assets];
        UI.mount("reports",UI.card("报表统计",form+'<p class="muted">范围：'+UI.esc(s.scope.organization_name)+'；生成时间：'+UI.datetime(s.generated_at)+'。设备为当前快照；维修按创建时间，点检完成率按计划任务日期，区间结束日不含。</p>')+'<div class="stats-grid">'+cards+'</div><div class="report-grid">'+UI.card("设备类别分布",this.chart(s.assets.categories))+UI.card("设备运行状态分布",this.chart(s.assets.statuses))+'</div>'+UI.card("点检任务与异常",'<p>完成 '+s.inspections.completed+' / 应执行 '+s.inspections.total+'；取消 '+s.inspections.canceled+'；异常记录 '+s.inspections.abnormal_records+'；异常项目 '+s.inspections.abnormal_items+'。</p><p>无计划时完成率显示“无计划”，不按记录数替代计划分母。</p>')+UI.card("模拟检验日期提醒",UI.table(["编号","设备","下次模拟日期","资料来源"],reminders.map(a=>[UI.esc(a.code),UI.esc(a.name),UI.esc(a.next_examination_date),UI.esc(a.examination_due_source)]))+'<p>日期待补：'+s.examinations.unknown+'。提醒窗口只是展示参数，不是法定周期。</p>')+UI.card("检测与检验结果",'<p class="message message-warning">'+UI.esc(s.examinations.result_message)+'</p>'));
        document.getElementById("reportFilters").onsubmit=e=>{e.preventDefault();this.filters=UI.formData(e.target);UI.run(()=>this.render());};
    }
};
