const SpareParts={
    rows:[],
    async render(){
        this.rows=(await API.getSpareParts()).results;
        UI.mount("spareparts",UI.card("备件管理",UI.paged(["备件编码","名称","规格","单位","当前库存","最小库存","位置","操作"],this.rows.map(p=>[UI.esc(p.part_code),UI.esc(p.name),UI.esc(p.spec||"—"),UI.esc(p.unit),UI.esc(p.current_stock),UI.esc(p.min_stock),UI.esc(p.location||"—"),UI.btn("流水","SpareParts.transactions("+p.id+")")+(UI.manager()?UI.btn("入库","SpareParts.stock("+p.id+",\'in\')","success")+UI.btn("出库","SpareParts.stock("+p.id+",\'out\')","warning")+UI.btn("编辑","SpareParts.form("+p.id+")"):"")])),UI.manager()?UI.btn("新增备件","SpareParts.form()","primary"):""));
    },
    async form(id=null){
        await UI.run(async()=>{const p=id?await API.getSparePart(id):{};let body='<div class="form-grid">';
            for(const [key,label,type] of [["part_code","备件编码","text"],["name","备件名称","text"],["spec","规格","text"],["unit","单位","text"],["category","分类","text"],["min_stock","最小库存","number"],["safety_stock","安全库存","number"],["unit_cost","单位成本","number"],["location","库位","text"],["supplier","供应商（虚构）","text"]])body+=UI.field(key,label,type,p[key]??(type==="number"?"0":key==="unit"?"件":""),[],["part_code","name","unit"].includes(key));
            body+='</div>'+UI.field("notes","备注","textarea",p.notes||"")+'<p>新备件初始库存为0，通过“入库”写入库存与流水。P0不允许跨单位工单领用。</p>';
            await UI.modal(id?"编辑备件":"新增备件",body,async f=>{const d=UI.formData(f);if(id)await API.patch("/spareparts/"+id+"/",d);else await API.post("/spareparts/",d);UI.toast("备件资料已保存");await this.render();});
        });
    },
    async stock(id,direction){
        const key=crypto.randomUUID();
        await UI.modal(direction==="in"?"备件入库":"备件出库",UI.field("quantity","数量","number","1",[],true)+UI.field("reference","单据编号")+UI.field("notes","操作说明","textarea"),async f=>{const d=UI.formData(f);d.idempotency_key=key;await API.post("/spareparts/"+id+"/stock_"+direction+"/",d);UI.toast("库存与流水已同时保存");await this.render();});
    },
    async transactions(id){
        await UI.run(async()=>{const [part,rows]=await Promise.all([API.getSparePart(id),API.get("/spareparts/"+id+"/transactions/")]);await UI.modal("库存流水 · "+part.name,UI.table(["时间","方向","数量","变更前","变更后","操作人","说明"],rows.map(t=>[UI.datetime(t.created_at),t.transaction_type==="in"?"入库":"出库",UI.esc(t.quantity),UI.esc(t.stock_before),UI.esc(t.stock_after),UI.esc(t.operator_name),UI.esc(t.remark)])),async()=>{},"关闭");});
    }
};
