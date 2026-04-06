import { _appLog } from '../store.js';
import { $ } from '../utils.js';
import { toast } from '../nav.js';
import { IDB } from '../idb.js';

// ══════ DOCX BUILDER (Office Open XML) ══════
export let _docxHeader=null; // {base64,mime,width,height}
export let _docxFooter='';   // footer text

export async function _hydrateDocConfig(){
  try{
    const cfg=await IDB.get('docConfig','letterhead');
    if(cfg)_docxHeader=cfg;
    const ft=await IDB.get('docConfig','footer');
    if(ft)_docxFooter=ft;
  }catch(e){_appLog('hydrateDoc: '+e.message)}
}

export function _saveDocHeader(data){
  _docxHeader=data;
  IDB.put('docConfig','letterhead',data).catch(e=>_appLog('saveHeader: '+e.message));
}
export function _saveDocFooter(text){
  _docxFooter=text;
  IDB.put('docConfig','footer',text).catch(e=>_appLog('saveFooter: '+e.message));
}

// Minimal ZIP builder (STORE method, no compression)
export const _MiniZip={
  _crc32Tab:null,
  _initCRC(){
    if(this._crc32Tab)return;
    const t=new Int32Array(256);
    for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c}
    this._crc32Tab=t;
  },
  _crc32(buf){
    this._initCRC();const t=this._crc32Tab;let c=0xFFFFFFFF;
    for(let i=0;i<buf.length;i++)c=t[(c^buf[i])&0xFF]^(c>>>8);
    return(c^0xFFFFFFFF)>>>0;
  },
  _strToU8(s){return new TextEncoder().encode(s)},
  create(files){
    // files: [{name:string, data:Uint8Array}]
    const entries=[];let offset=0;
    // Local file headers + data
    const parts=[];
    for(const f of files){
      const nameBytes=this._strToU8(f.name);
      const crc=this._crc32(f.data);
      const hdr=new ArrayBuffer(30+nameBytes.length);
      const dv=new DataView(hdr);
      dv.setUint32(0,0x04034b50,true); // local sig
      dv.setUint16(4,20,true); // version
      dv.setUint16(6,0,true);  // flags
      dv.setUint16(8,0,true);  // compression: STORE
      dv.setUint16(10,0,true); // mod time
      dv.setUint16(12,0,true); // mod date
      dv.setUint32(14,crc,true);
      dv.setUint32(18,f.data.length,true); // compressed
      dv.setUint32(22,f.data.length,true); // uncompressed
      dv.setUint16(26,nameBytes.length,true);
      dv.setUint16(28,0,true); // extra length
      new Uint8Array(hdr).set(nameBytes,30);
      entries.push({name:nameBytes,crc,size:f.data.length,offset});
      const localHdr=new Uint8Array(hdr);
      parts.push(localHdr,f.data);
      offset+=localHdr.length+f.data.length;
    }
    // Central directory
    const cdStart=offset;
    for(const e of entries){
      const cd=new ArrayBuffer(46+e.name.length);
      const dv=new DataView(cd);
      dv.setUint32(0,0x02014b50,true); // central sig
      dv.setUint16(4,20,true); // version made
      dv.setUint16(6,20,true); // version needed
      dv.setUint16(8,0,true);
      dv.setUint16(10,0,true); // STORE
      dv.setUint16(12,0,true);
      dv.setUint16(14,0,true);
      dv.setUint32(16,e.crc,true);
      dv.setUint32(20,e.size,true);
      dv.setUint32(24,e.size,true);
      dv.setUint16(28,e.name.length,true);
      dv.setUint16(30,0,true); dv.setUint16(32,0,true);
      dv.setUint16(34,0,true); dv.setUint16(36,0,true);
      dv.setUint32(38,32,true); // ext attr
      dv.setUint32(42,e.offset,true);
      new Uint8Array(cd).set(e.name,46);
      parts.push(new Uint8Array(cd));
      offset+=cd.byteLength;
    }
    const cdSize=offset-cdStart;
    // End of central directory
    const eocd=new ArrayBuffer(22);
    const dv=new DataView(eocd);
    dv.setUint32(0,0x06054b50,true);
    dv.setUint16(4,0,true);dv.setUint16(6,0,true);
    dv.setUint16(8,entries.length,true);
    dv.setUint16(10,entries.length,true);
    dv.setUint32(12,cdSize,true);
    dv.setUint32(16,cdStart,true);
    dv.setUint16(20,0,true);
    parts.push(new Uint8Array(eocd));
    // Merge
    let total=0;for(const p of parts)total+=p.length;
    const result=new Uint8Array(total);
    let pos=0;for(const p of parts){result.set(p,pos);pos+=p.length}
    return result;
  },
  // Unzip: read ZIP file and return Map of filename→Uint8Array
  unzip(buf){
    const d=new DataView(buf instanceof ArrayBuffer?buf:buf.buffer);
    const u8=new Uint8Array(buf instanceof ArrayBuffer?buf:buf.buffer);
    const files=new Map();
    // Find end-of-central-directory (scan backwards)
    let eocdOff=-1;
    for(let i=u8.length-22;i>=0;i--){
      if(d.getUint32(i,true)===0x06054b50){eocdOff=i;break}
    }
    if(eocdOff<0)return files;
    const cdOff=d.getUint32(eocdOff+16,true);
    const cdCount=d.getUint16(eocdOff+10,true);
    let off=cdOff;
    for(let i=0;i<cdCount;i++){
      if(d.getUint32(off,true)!==0x02014b50)break;
      const nameLen=d.getUint16(off+28,true);
      const extraLen=d.getUint16(off+30,true);
      const commentLen=d.getUint16(off+32,true);
      const localOff=d.getUint32(off+42,true);
      const name=new TextDecoder().decode(u8.slice(off+46,off+46+nameLen));
      // Read from local file header
      const lNameLen=d.getUint16(localOff+26,true);
      const lExtraLen=d.getUint16(localOff+28,true);
      const compSize=d.getUint32(localOff+18,true);
      const dataStart=localOff+30+lNameLen+lExtraLen;
      files.set(name,u8.slice(dataStart,dataStart+compSize));
      off+=46+nameLen+extraLen+commentLen;
    }
    return files;
  }
};

export function _xmlEsc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

export function buildDocx(text,opts={}){
  const enc=s=>_MiniZip._strToU8(s);
  const hasHeader=!!(_docxHeader&&_docxHeader.base64);
  const hasFooter=!!(_docxFooter||opts.footer);
  const footerText=opts.footer||_docxFooter||'';

  // [Content_Types].xml
  let ctypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>`;
  if(hasHeader){
    ctypes+=`\n<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>`;
    const ext=_docxHeader.mime==='image/png'?'png':'jpeg';
    ctypes+=`\n<Default Extension="${ext}" ContentType="${_docxHeader.mime}"/>`;
  }
  if(hasFooter)ctypes+=`\n<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>`;
  ctypes+=`\n</Types>`;

  // _rels/.rels
  const rootRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  // word/_rels/document.xml.rels
  let docRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  if(hasHeader)docRels+=`\n<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>`;
  if(hasFooter)docRels+=`\n<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>`;
  docRels+=`\n</Relationships>`;

  // Header rels (image)
  let headerRels='';
  if(hasHeader){
    const ext=_docxHeader.mime==='image/png'?'png':'jpeg';
    headerRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.${ext}"/>
</Relationships>`;
  }

  // word/styles.xml
  const fontName=opts.font||'Calibri';
  const fontSize=opts.fontSize||24; // half-points (24=12pt)
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}"/>
<w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/>
<w:lang w:val="de-DE"/>
</w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/>
<w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr>
</w:style>
</w:styles>`;

  // word/document.xml
  const lines=text.split('\n');
  let bodyXml='';
  for(const line of lines){
    const trimmed=line;
    // Detect bold lines (all uppercase or starting with **)
    const isBold=trimmed===trimmed.toUpperCase()&&trimmed.length>2&&/[A-ZÄÖÜß]/.test(trimmed);
    bodyXml+=`<w:p><w:r>${isBold?'<w:rPr><w:b/></w:rPr>':''}<w:t xml:space="preserve">${_xmlEsc(trimmed)}</w:t></w:r></w:p>\n`;
  }

  // Section properties (header/footer references)
  let sectPr='<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708"/>';
  if(hasHeader)sectPr+=`<w:headerReference w:type="default" r:id="rId2" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>`;
  if(hasFooter)sectPr+=`<w:footerReference w:type="default" r:id="rId3" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>`;
  sectPr+='</w:sectPr>';

  const docXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:body>
${bodyXml}
${sectPr}
</w:body>
</w:document>`;

  // word/header1.xml
  let headerXml='';
  if(hasHeader){
    const w=(_docxHeader.width||600)*9525; // EMU
    const h=(_docxHeader.height||100)*9525;
    headerXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:p><w:r>
<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">
<wp:extent cx="${w}" cy="${h}"/>
<wp:docPr id="1" name="Briefkopf"/>
<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="letterhead"/><pic:cNvPicPr/></pic:nvPicPr>
<pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
</pic:pic></a:graphicData></a:graphic>
</wp:inline></w:drawing>
</w:r></w:p>
</w:hdr>`;
  }

  // word/footer1.xml
  let footerXml='';
  if(hasFooter){
    footerXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:color w:val="888888"/></w:rPr></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:color w:val="888888"/></w:rPr><w:t xml:space="preserve">${_xmlEsc(footerText)}</w:t></w:r></w:p>
</w:ftr>`;
  }

  // Build ZIP
  const files=[
    {name:'[Content_Types].xml',data:enc(ctypes)},
    {name:'_rels/.rels',data:enc(rootRels)},
    {name:'word/_rels/document.xml.rels',data:enc(docRels)},
    {name:'word/document.xml',data:enc(docXml)},
    {name:'word/styles.xml',data:enc(styles)}
  ];
  if(hasHeader){
    files.push({name:'word/header1.xml',data:enc(headerXml)});
    files.push({name:'word/_rels/header1.xml.rels',data:enc(headerRels)});
    // Decode base64 image
    const bin=atob(_docxHeader.base64);
    const imgBuf=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)imgBuf[i]=bin.charCodeAt(i);
    const ext=_docxHeader.mime==='image/png'?'png':'jpeg';
    files.push({name:`word/media/image1.${ext}`,data:imgBuf});
  }
  if(hasFooter){
    files.push({name:'word/footer1.xml',data:enc(footerXml)});
  }

  const zipData=_MiniZip.create(files);
  return new Blob([zipData],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}

// Briefkopf upload handler
export function uploadLetterhead(inp){
  const f=inp.files?.[0];
  if(!f)return;
  if(!f.type.startsWith('image/')){toast('Nur Bilddateien (PNG, JPG)');inp.value='';return}
  if(f.size>2*1024*1024){toast('Max. 2 MB');inp.value='';return}
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      // Scale to max 600px width for header
      let w=img.width,h=img.height;
      if(w>600){h=Math.round(h*(600/w));w=600}
      const base64=e.target.result.split(',')[1];
      _saveDocHeader({base64,mime:f.type,width:w,height:h,name:f.name});
      _renderLetterheadPreview();
      toast('Briefkopf gespeichert ✓');
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(f);
  inp.value='';
}

export function removeLetterhead(){
  _docxHeader=null;
  IDB.del('docConfig','letterhead').catch(e=>_appLog('delHeader: '+e.message));
  _renderLetterheadPreview();
  toast('Briefkopf entfernt');
}

export function _renderLetterheadPreview(){
  const wrap=$('lh-preview');
  if(!wrap)return;
  if(_docxHeader&&_docxHeader.base64){
    wrap.innerHTML=`<img src="data:${_docxHeader.mime};base64,${_docxHeader.base64}" style="max-width:100%;max-height:80px;border-radius:6px;border:1px solid var(--bdr)"> <button class="b bo bs" onclick="removeLetterhead()" style="font-size:10px" title="Briefkopf entfernen">✕ Entfernen</button>`;
    wrap.style.display='flex';
  }else{
    wrap.innerHTML='';
    wrap.style.display='none';
  }
}

export function saveFooterText(){
  const text=$('w-footer-input').value;
  _saveDocFooter(text);
  toast('Footer gespeichert ✓');
}
