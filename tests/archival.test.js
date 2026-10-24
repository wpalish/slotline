import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import definition from '../module.js';
import {WorkStore} from '../core/store.js';

const serviceData={name:'SYNTHETIC service',minutes:60,buffer:15};
const staffData={name:'SYNTHETIC staff'};
function commands(store){
  const save=(collection,data,id)=>{const result=store.transact({operation:'save',collection,data,id,revision:store.read().revision});return id||result.data[collection].at(-1).id;};
  const archive=(collection,id)=>store.transact({operation:'archive',collection,id,revision:store.read().revision});
  return {save,archive};
}
function unchangedRejection(store,operation,pattern){
  const before=store.read(),events=store.db.prepare('SELECT count(*) n FROM audit').get().n;
  assert.throws(operation,pattern);
  assert.deepEqual(store.read(),before,'Rejection preserves all records, computed times and revision.');
  assert.equal(store.db.prepare('SELECT count(*) n FROM audit').get().n,events,'Rejection adds no successful audit event.');
}

test('cancelled history permits resource archival and survives file restart and restore',()=>{
  const dir=mkdtempSync(join(tmpdir(),'slotline-archive-')),database=join(dir,'workspace.sqlite');
  let store=new WorkStore(definition,database);
  try{
    let {save,archive}=commands(store);
    const service=save('services',serviceData),staff=save('staff',staffData);
    const bookingData={service,staff,visitor:'SYNTHETIC visitor',start:'2099-10-25T10:00:00+05:00',status:'cancelled'};
    const booking=save('bookings',bookingData),original=structuredClone(store.read().data.bookings[0]);
    archive('staff',staff);archive('services',service);
    assert.deepEqual(store.read().data.bookings[0],original,'Archiving resources keeps the cancelled appointment and computed end unchanged.');
    const saved=store.read();store.close();store=new WorkStore(definition,database);
    assert.deepEqual(store.read(),saved,'Archived resources and historical booking survive real file restart.');
    ({save,archive}=commands(store));
    unchangedRejection(store,()=>save('bookings',{...bookingData,status:'booked'},booking),/действующ/);
    unchangedRejection(store,()=>save('bookings',{...bookingData,visitor:'SYNTHETIC new visitor',status:'booked'}),/действующ/);
    const restored=new WorkStore(definition);
    try{
      restored.restore(store.export());
      assert.deepEqual(restored.read().data,store.read().data,'Restore preserves archived-resource references and original booking end.');
      const restoredCommands=commands(restored);
      unchangedRejection(restored,()=>restoredCommands.save('bookings',{...bookingData,status:'booked'},booking),/действующ/);
    }finally{restored.close();}
  }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

test('active bookings and their resources cannot be hidden by archival; cancellation releases the resource',()=>{
  const store=new WorkStore(definition);
  try{
    const {save,archive}=commands(store),service=save('services',serviceData),staff=save('staff',staffData);
    const data={service,staff,visitor:'SYNTHETIC active',start:'2099-10-25T10:00:00+05:00',status:'booked'},booking=save('bookings',data);
    unchangedRejection(store,()=>archive('bookings',booking),/отмен/);
    unchangedRejection(store,()=>archive('staff',staff),/действующ/);
    unchangedRejection(store,()=>archive('services',service),/действующ/);
    save('bookings',{...data,status:'cancelled'},booking);
    archive('bookings',booking);archive('staff',staff);archive('services',service);
    assert.equal(store.read().data.bookings[0].status,'cancelled');
    assert.equal(store.read().data.bookings[0].archived,true);
    assert.ok(store.read().data.staff[0].archived&&store.read().data.services[0].archived);
  }finally{store.close();}
});

test('elapsed booked history can be archived without inventing cancellation; legacy archives remain readable',()=>{
  const store=new WorkStore(definition);
  try{
    const {save,archive}=commands(store),service=save('services',serviceData),staff=save('staff',staffData);
    const data={service,staff,visitor:'SYNTHETIC past interval',start:'2000-10-25T10:00:00+05:00',status:'booked'},booking=save('bookings',data);
    const original=structuredClone(store.read().data.bookings[0]);
    archive('bookings',booking);archive('staff',staff);archive('services',service);
    const archived=store.read().data.bookings[0];
    assert.equal(archived.status,'booked','Elapsed time is not a cancellation or proof of attendance.');
    assert.equal(archived.end,original.end);
    assert.equal(archived.archived,true);
    const restored=new WorkStore(definition);
    try{
      restored.restore(store.export());
      assert.deepEqual(restored.read().data,store.read().data);
    }finally{restored.close();}
    const legacy=new WorkStore(definition);
    try{
      const legacyCommands=commands(legacy),serviceId=legacyCommands.save('services',serviceData),staffId=legacyCommands.save('staff',staffData);
      legacyCommands.save('bookings',{service:serviceId,staff:staffId,visitor:'SYNTHETIC legacy archive',start:'2099-10-25T10:00:00+05:00',status:'booked'});
      const previous=legacy.read().data;
      previous.bookings[0].archived=true;
      const target=new WorkStore(definition);
      try{
        target.restore({...legacy.export(),data:previous});
        commands(target).save('staff',{name:'SYNTHETIC unrelated new staff'});
        assert.equal(target.read().data.bookings[0].archived,true,'Pre-existing archives are not silently rewritten.');
        assert.equal(target.read().data.bookings[0].status,'booked');
        unchangedRejection(target,()=>commands(target).save('bookings',{service:serviceId,staff:staffId,visitor:'SYNTHETIC overlap',start:'2099-10-25T10:30:00+05:00',status:'booked'}),/пересекается/);
      }finally{target.close();}
    }finally{legacy.close();}
  }finally{store.close();}
});
