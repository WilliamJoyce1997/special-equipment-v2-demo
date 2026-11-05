/** Existing same-origin DRF API boundary; raw values are escaped at the rendering boundary. */
class API {
    static refreshPromise=null;
    static getAuthHeaders() {
        const token=localStorage.getItem("access_token"),org=localStorage.getItem("organization_id");
        return {"Content-Type":"application/json",...(token?{"Authorization":"Bearer "+token}:{}),...(org?{"X-Organization-ID":org}:{})};
    }
    static async refresh() {
        if (!this.refreshPromise) this.refreshPromise=(async()=>{
            const refresh=localStorage.getItem("refresh_token");
            if(!refresh)throw Error("登录已过期，请重新登录");
            const response=await fetch("/api/auth/refresh/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refresh})});
            if(!response.ok)throw Error("登录已过期，请重新登录");
            localStorage.setItem("access_token",(await response.json()).access);
        })().finally(()=>{this.refreshPromise=null;});
        return this.refreshPromise;
    }
    static async request(path,method="GET",data=null,params={},retried=false) {
        const query=new URLSearchParams(Object.entries(params).filter(([,v])=>v!==""&&v!==null&&v!==undefined)).toString();
        const url="/api"+path+(query?"?"+query:"");
        const form=typeof FormData!=="undefined" && data instanceof FormData;
        const headers=this.getAuthHeaders();if(form)delete headers["Content-Type"];
        const response=await fetch(url,{method,headers,...(data!==null?{body:form?data:JSON.stringify(data)}:{})});
        if(response.status===401 && path!=="/auth/login/" && !retried) {
            try{await this.refresh();return await this.request(path,method,data,params,true);}
            catch(e){this.clearSession();window.location.href="/static/login.html";throw e;}
        }
        if(response.status===204)return null;
        const result=await response.json().catch(()=>({}));
        if(!response.ok) {
            const flatten=x=>typeof x==="object"&&x!==null?Object.entries(x).map(([k,v])=>k+": "+flatten(v)).join("；"):String(x);
            const error=Error((result.message||result.detail||"请求失败")+" "+(result.fields?flatten(result.fields):flatten(result)));
            error.status=response.status;throw error;
        }
        return result;
    }
    static clearSession(){["access_token","refresh_token","user","organization_id"].forEach(k=>localStorage.removeItem(k));}
    static get(path,params={}){return this.request(path,"GET",null,params);}
    static post(path,data={}){return this.request(path,"POST",data);}
    static put(path,data={}){return this.request(path,"PUT",data);}
    static patch(path,data={}){return this.request(path,"PATCH",data);}
    static delete(path){return this.request(path,"DELETE");}
    static login(username,password){return this.post("/auth/login/",{username,password});}
    static async logout(){this.clearSession();}
    static getCurrentUser(){return this.get("/auth/users/me/");}
    static async all(path,params={}) {
        let page=1,rows=[],last;
        do{last=await this.get(path,{...params,page,page_size:100});rows.push(...(last.results||[]));page++;}while(last.next);
        return {count:rows.length,results:rows,next:null,previous:null};
    }
    static getAssets(params={}){return params.page?this.get("/assets/",params):this.all("/assets/",params);}
    static getAsset(id){return this.get("/assets/"+id+"/");}
    static createAsset(data){return this.post("/assets/",data);}
    static updateAsset(id,data){return this.patch("/assets/"+id+"/",data);}
    static deleteAsset(id){return this.delete("/assets/"+id+"/");}
    static getWorkOrders(params={}){return this.all("/workorders/",params);}
    static getWorkOrder(id){return this.get("/workorders/"+id+"/");}
    static createWorkOrder(data){return this.post("/workorders/",data);}
    static updateWorkOrder(id,data){return this.patch("/workorders/"+id+"/",data);}
    static getMaintenancePlans(params={}){return this.all("/maintenance/plans/",params);}
    static getMaintenancePlan(id){return this.get("/maintenance/plans/"+id+"/");}
    static createMaintenancePlan(data){return this.post("/maintenance/plans/",data);}
    static updateMaintenancePlan(id,data){return this.patch("/maintenance/plans/"+id+"/",data);}
    static getInspections(params={}){return this.all("/inspections/",params);}
    static getSpareParts(params={}){return this.all("/spareparts/",params);}
    static getSparePart(id){return this.get("/spareparts/"+id+"/");}
    static async download(path,filename) {
        let response=await fetch("/api"+path,{headers:this.getAuthHeaders()});
        if(response.status===401){await this.refresh();response=await fetch("/api"+path,{headers:this.getAuthHeaders()});}
        if(!response.ok)throw Error("下载失败，请检查权限");
        const url=URL.createObjectURL(await response.blob()),a=document.createElement("a");
        a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
    }
    static async upload(path,file){const form=new FormData();form.append("file",file);return this.post(path,form);}
}
if(typeof module!=="undefined"&&module.exports)module.exports=API;
