const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),c={};c.window=c;vm.createContext(c);for(const n of ['config','fixtures','dossier'])vm.runInContext(fs.readFileSync('static/v2/'+n+'.js','utf8'),c);
assert.deepEqual(JSON.parse(JSON.stringify(c.V2Dossier.tabsFor('installation').map(t=>t.title))),['压力管道装置','压力管道管线']);
const D=c.V2Dossier,a=c.V2.fixtures.installation[0],b=c.V2.fixtures.installation[1],before=JSON.stringify(c.V2.fixtures);
assert.equal(D.linkedPipelines(a).length,1);assert(D.linkedPipelines(a).every(p=>p.installationId===a.id));assert.notEqual(D.linkedPipelines(a)[0].id,D.linkedPipelines(b)[0].id);assert.equal(D.linkedPipelines({id:'no-links'}).length,0);
assert.deepEqual(JSON.parse(JSON.stringify(D.tabsFor('pipeline').map(t=>t.title))),['设备主题信息','检验信息','元件信息','全部']);
assert.equal(JSON.stringify(c.V2.fixtures),before);console.log('PASS installation two tabs, linked isolation/empty, independent pipeline unchanged, source unchanged');

