// ══════ IndexedDB Storage Layer ══════
export const IDB={
  _db:null,_ver:5,_name:'vbaBeastDB',
  _stores:['autoSave','workspaces','templates','hybrid','docConfig','docCenter','database','emailConfig'],
  open(){
    if(this._db)return Promise.resolve(this._db);
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(this._name,this._ver);
      req.onupgradeneeded=e=>{
        const db=e.target.result;
        this._stores.forEach(s=>{if(!db.objectStoreNames.contains(s))db.createObjectStore(s)});
      };
      req.onsuccess=e=>{this._db=e.target.result;resolve(this._db)};
      req.onerror=e=>reject(e.target.error);
    });
  },
  async get(store,key){
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readonly');
      const req=tx.objectStore(store).get(key);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=e=>reject(e.target.error);
    });
  },
  async put(store,key,val){
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readwrite');
      tx.objectStore(store).put(val,key);
      tx.oncomplete=()=>resolve();
      tx.onerror=e=>reject(e.target.error);
    });
  },
  async del(store,key){
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete=()=>resolve();
      tx.onerror=e=>reject(e.target.error);
    });
  },
  async clear(store){
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readwrite');
      tx.objectStore(store).clear();
      tx.oncomplete=()=>resolve();
      tx.onerror=e=>reject(e.target.error);
    });
  },
  async getAll(store){
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readonly');
      const req=tx.objectStore(store).getAll();
      req.onsuccess=()=>resolve(req.result||[]);
      req.onerror=e=>reject(e.target.error);
    });
  },
  async getAllKeys(store){
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readonly');
      const req=tx.objectStore(store).getAllKeys();
      req.onsuccess=()=>resolve(req.result||[]);
      req.onerror=e=>reject(e.target.error);
    });
  },
  async usage(){
    try{
      const est=await navigator.storage?.estimate?.();
      if(est)return{used:est.usage||0,max:est.quota||0,pct:est.quota?Math.round((est.usage/est.quota)*100):0};
    }catch(e){}
    return{used:0,max:0,pct:0};
  },
  async destroyAll(){
    if(this._db){this._db.close();this._db=null}
    return new Promise((resolve,reject)=>{
      const req=indexedDB.deleteDatabase(this._name);
      req.onsuccess=()=>resolve();
      req.onerror=e=>reject(e.target.error);
    });
  }
};
// Pre-open DB
IDB.open().catch(e=>console.warn('IndexedDB init:',e));
