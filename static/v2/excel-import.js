/* Local Excel reader and preview dialog shared by personnel and product modules. */
window.V2ExcelImport=(()=>{
'use strict';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,cls,fn)=>{const n=el('button',cls,text);n.type='button';n.onclick=fn;return n;};

async function readWorksheet(file,sheetName,fields){
 const extension=/\.(xls|xlsx)$/i.exec(file?.name??'')?.[1]?.toLowerCase();
 if(!extension)throw Error('请选择 .xls 或 .xlsx 文件');
 if(!file.size||file.size>5*1024*1024)throw Error('文件大小须大于 0 且不超过 5 MB');
 if(typeof XLSX==='undefined')throw Error('本地 Excel 解析库未加载');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const signature=extension==='xls'?[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]:[0x50,0x4b,3,4];
 if(!signature.every((byte,index)=>bytes[index]===byte))throw Error('文件内容与扩展名不一致，或文件已损坏');
 let book;
 try{
  const options={type:'array',sheetRows:1002,cellNF:true,cellFormula:true};
  if(extension==='xls'){
   const compound=XLSX.CFB.read(bytes,{type:'array'});
   const stream=(XLSX.CFB.find(compound,'Workbook')||XLSX.CFB.find(compound,'Book'))?.content;
   if(!stream?.length)throw Error('Workbook stream missing');
   book=XLSX.read(stream,options);
  }else{
   book=XLSX.read(bytes,options);
   if(book.bookType!=='xlsx')throw Error('Unexpected workbook type');
  }
 }catch{throw Error('Excel 文件无法解析，可能已损坏、加密或格式不正确');}
 if(book.SheetNames.length!==1||book.SheetNames[0]!==sheetName)throw Error('工作表须与模板一致，仅保留 '+sheetName);
 const sheet=book.Sheets[sheetName];
 const range=XLSX.utils.decode_range(sheet['!fullref']||sheet['!ref']||'A1');
 if(range.e.r>1000)throw Error('第 2 行起最多支持 1000 行，请分批导入');
 if(range.s.r!==0||range.s.c!==0||range.e.c!==fields.length-1||sheet['!merges']?.length){
  throw Error('工作表结构或表头不一致，请按模板保留 '+fields.length+' 列及其顺序，勿合并单元格');
 }
 const cellAt=(r,c)=>sheet[XLSX.utils.encode_cell({r,c})];
 if(fields.some(([label],c)=>cellAt(0,c)?.v!==label||cellAt(0,c)?.f||cellAt(0,c)?.F)){
  throw Error('第 1 行表头名称或顺序与模板不一致');
 }
 return {cellAt,lastRow:range.e.r,date1904:!!book.Workbook?.WBProps?.date1904};
}

async function parse(file,{sheetName,fields,normalize,validate}){
 const {cellAt,lastRow,date1904}=await readWorksheet(file,sheetName,fields);
 const records=[],issues=[];
 for(let r=1;r<=lastRow;r++){
  const record={},problems=[];
  let hasData=false;
  for(const [c,[label,key,required]] of fields.entries()){
   const cell=cellAt(r,c),value=String(cell?.v??'').trim();
   const formula=cell?.f||cell?.F||cell?.t==='e';
   if(value||formula)hasData=true;
   if(formula)problems.push(label+'不能使用公式或错误值');
   else if(required&&!value)problems.push(label+'必填');
   record[key]=value;
   if(!value||formula)continue;
   try{record[key]=normalize(key,value,cell,date1904);}
   catch(error){problems.push(label+error.message);}
  }
  if(!hasData)continue;
  validate(record,problems);
  if(problems.length)issues.push('第 '+(r+1)+' 行：'+problems.join('；'));
  else records.push({...record,rowNumber:r+1});
 }
 return {records,issues};
}

function withLock(key,save){
 return navigator.locks?navigator.locks.request(key,save):save();
}

function store(key,value){
 try{localStorage.setItem(key,JSON.stringify(value));}
 catch{throw Error('保存失败，请检查浏览器本地存储权限或剩余空间');}
}

function isDateCell(cell){
 return cell.t==='d'||(cell.t==='n'&&XLSX.SSF.is_date(cell.z||''));
}

function show(api,{title,recordLabel,templateUrl,templateName,parse,save}){
 const root=el('div','valve-import excel-import'),label=el('label','','选择附件：'),file=el('input');
 const fileName=el('span','excel-import-filename','未选择任何文件');fileName.setAttribute('aria-hidden','true');
 file.type='file';file.accept='.xls,.xlsx';file.setAttribute('aria-label','选择附件');label.append(file,fileName);
 const notes=el('div','valve-import-notes'),link=el('a','','下载模板');
 link.href=templateUrl;link.download=templateName;
 const first=el('p','','1、上传附件格式需与模板格式完全一致');first.append(link);
 notes.append(el('p','','注意：'),first,el('p','','2、模板中字段名称为红色的，必须填写'),el('p','','3、仅支持 xls 和 xlsx 格式'));
 const summary=el('p','more-context-note'),error=el('p','form-error');
 summary.setAttribute('role','status');error.setAttribute('role','alert');
 let staged=[],selection=0,closed=false;
 const upload=button('上传','primary',async()=>{
  const records=staged;upload.disabled=true;file.disabled=true;error.textContent='';
  try{
   if(!await save(records,()=>closed)||closed)return;
   api.close();api.refresh();api.announce('已导入 '+records.length+' 条'+recordLabel+'记录，保存在当前浏览器');
  }catch(problem){
   if(!closed){error.textContent=problem.message;file.disabled=false;upload.disabled=false;}
  }
 });
 upload.disabled=true;
 file.onchange=async()=>{
  const ticket=++selection;staged=[];upload.disabled=true;error.textContent='';summary.textContent='';
  fileName.textContent=file.files[0]?.name||'未选择任何文件';
  if(!file.files.length)return;
  summary.textContent='正在本地解析 Excel…';
  try{
   const {records,issues}=await parse(file.files[0]);
   if(closed||ticket!==selection)return;
   summary.textContent='共 '+(records.length+issues.length)+' 行（不含空行），有效 '+records.length+' 行，错误 '+issues.length+' 行';
   if(issues.length){
    error.textContent=issues.slice(0,20).join('\n')+(issues.length>20?'\n仅显示前 20 个错误行。':'')+'\n请修正后重新选择文件。';
   }else if(!records.length)error.textContent='模板中没有可导入的数据行';
   else{staged=records;upload.disabled=false;}
  }catch(problem){
   if(closed||ticket!==selection)return;
   summary.textContent='';error.textContent=problem.message;
  }
 };
 const actions=el('div','valve-import-actions');actions.append(upload,button('取消','secondary',api.close));
 root.append(label,notes,el('p','more-context-note','文件仅在当前浏览器读取，确认后记录保存在当前浏览器。单次最多 1000 行、5 MB。'),summary,error,actions);
 api.show(title,root,'organization-dialog valve-import-dialog excel-import-dialog',()=>{closed=true;});
}

return {parse,show,withLock,store,isDateCell};
})();
