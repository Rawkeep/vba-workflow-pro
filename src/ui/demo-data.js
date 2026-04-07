// ══════ DEMO DATA ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: N, showX, XR, toast, L are cross-module dependencies from core
// TODO: autoSave is from ./auto-save.js
// TODO: renderSavedCases, renderSavedIE are cross-module dependencies from core
// TODO: loadTemplates is defined here and uses savedCases/savedIE

export const DEMOS={
sendungen:{name:'Sendungen_Export.xlsx',h:['Sendungsnr','Kunde','Land','Hafen','Incoterm','Betrag_EUR','Gewicht_kg','Gefahrgut','Status','Datum'],d:[
['SND-2024-001','Müller GmbH','DE','Hamburg','DAP','15200','2400','Nein','Versandt','2024-11-15'],
['SND-2024-002','Smith Corp','US','New York','FCA','8900','1200','Nein','In Bearbeitung','2024-11-18'],
['SND-2024-003','Asante Trading','GH','Tema','CFR','32500','8500','Nein','Zoll','2024-11-20'],
['SND-2024-004','Dubois SA','FR','Marseille','DAP','12000','3200','Ja','Versandt','2024-11-22'],
['SND-2024-005','Bello Imports','NG','Lagos','CIF','45000','12000','Nein','Prüfung','2024-11-25'],
['SND-2024-006','Weber AG','DE','Bremen','EXW','7800','950','Nein','Bezahlt','2024-11-28'],
['SND-2024-007','Diallo SARL','SN','Dakar','CFR','9100','2800','Nein','Versandt','2024-12-01'],
['SND-2024-008','Chen Industries','CN','Shanghai','FOB','28000','6500','Ja','Zoll','2024-12-03'],
['SND-2024-009','Kowalski Sp.','PL','Gdansk','DAP','5600','1800','Nein','Bezahlt','2024-12-05'],
['SND-2024-010','Al-Rahman LLC','AE','Dubai','CIF','67000','15000','Nein','In Bearbeitung','2024-12-08'],
['SND-2024-011','Santos Ltd','BR','Santos','FOB','19500','4200','Nein','Versandt','2024-12-10'],
['SND-2024-012','Yamamoto KK','JP','Yokohama','DAP','41000','7800','Ja','Prüfung','2024-12-12']
]},
rechnungen:{name:'Rechnungen_2024.xlsx',h:['Rechnungsnr','Kunde','Netto_EUR','MwSt_Satz','MwSt_EUR','Brutto_EUR','Zahlungsziel','Fällig_am','Status','Kategorie'],d:[
['RE-2024-101','Müller GmbH','12500','19','2375','14875','30 Tage','2024-12-15','Offen','Waren'],
['RE-2024-102','Weber AG','3400','19','646','4046','14 Tage','2024-12-02','Überfällig','Dienstleistung'],
['RE-2024-103','Smith Corp','8900','0','0','8900','60 Tage','2025-01-18','Offen','Export'],
['RE-2024-104','Dubois SA','6200','19','1178','7378','30 Tage','2024-12-22','Offen','Waren'],
['RE-2024-105','Bello Imports','45000','0','0','45000','90 Tage','2025-02-25','Offen','Export'],
['RE-2024-106','Chen Industries','28000','0','0','28000','45 Tage','2025-01-17','Offen','Export'],
['RE-2024-107','Kowalski Sp.','5600','19','1064','6664','30 Tage','2025-01-05','Bezahlt','Waren'],
['RE-2024-108','Al-Rahman LLC','67000','0','0','67000','60 Tage','2025-02-08','Offen','Export'],
['RE-2024-109','Santos Ltd','19500','0','0','19500','45 Tage','2025-01-24','Teilzahlung','Export'],
['RE-2024-110','Yamamoto KK','41000','0','0','41000','30 Tage','2025-01-12','Offen','Export']
]},
kunden:{name:'Kundenstamm.xlsx',h:['KundenNr','Firma','Anrede','Ansprechpartner','Email','Land','Stadt','Segment','Umsatz_2024','Letzte_Bestellung','Newsletter'],d:[
['K-001','Müller GmbH','Herr','Thomas Müller','t.mueller@mueller-gmbh.de','DE','Hamburg','Premium','89000','2024-12-01','Ja'],
['K-002','Weber AG','Frau','Lisa Weber','l.weber@weber-ag.de','DE','Bremen','Standard','23000','2024-11-15','Ja'],
['K-003','Smith Corp','Mr','John Smith','j.smith@smithcorp.us','US','New York','Premium','56000','2024-12-03','Nein'],
['K-004','Dubois SA','M.','Pierre Dubois','p.dubois@dubois.fr','FR','Marseille','Standard','18000','2024-11-22','Ja'],
['K-005','Asante Trading','Mr','Kwame Asante','k.asante@asante-trade.gh','GH','Accra','Neu','32500','2024-11-20','Ja'],
['K-006','Bello Imports','Mr','Ibrahim Bello','i.bello@belloimports.ng','NG','Lagos','Premium','120000','2024-12-08','Nein'],
['K-007','Diallo SARL','M.','Amadou Diallo','a.diallo@diallo.sn','SN','Dakar','Standard','9100','2024-12-01','Ja'],
['K-008','Chen Industries','Mr','Wei Chen','w.chen@chen-ind.cn','CN','Shanghai','Premium','95000','2024-12-05','Nein'],
['K-009','Kowalski Sp.','Pan','Jan Kowalski','j.kowalski@kowalski.pl','PL','Gdansk','Neu','5600','2024-12-05','Ja'],
['K-010','Al-Rahman LLC','Mr','Ahmed Al-Rahman','a.rahman@alrahman.ae','AE','Dubai','Premium','187000','2024-12-10','Ja'],
['K-011','Santos Ltd','Sr','Carlos Santos','c.santos@santos.br','BR','São Paulo','Standard','19500','2024-12-10','Nein'],
['K-012','Yamamoto KK','様','Kenji Yamamoto','k.yamamoto@yamamoto.jp','JP','Tokyo','Premium','141000','2024-12-12','Ja'],
['K-013','Fischer GmbH','Herr','Hans Fischer','h.fischer@fischer.de','DE','München','Standard','12000','2024-10-20','Ja'],
['K-014','Okonkwo Ltd','Mr','Chidi Okonkwo','c.okonkwo@okonkwo.ng','NG','Abuja','Neu','0','','Nein'],
['K-015','Petrov OOO','г-н','Dimitri Petrov','d.petrov@petrov.ru','RU','Moskau','Standard','8500','2024-09-15','Nein']
]},
container:{name:'Container_Tracking.xlsx',h:['Container_ID','Typ','Kunde','Abgangshafen','Zielhafen','ETD','ETA','Status','Gewicht_kg','Wert_EUR','Gefahrgut','Dokumente_OK'],d:[
['MSKU-4821937','40ft HC','Müller GmbH','Hamburg','Tema','2024-12-01','2024-12-18','Unterwegs','18500','45000','Nein','Ja'],
['TCLU-7293041','20ft','Smith Corp','Rotterdam','New York','2024-12-05','2024-12-19','Unterwegs','8200','22000','Nein','Ja'],
['MRKU-1938472','40ft','Bello Imports','Antwerpen','Lagos','2024-12-03','2024-12-22','Unterwegs','24000','78000','Ja','Nein'],
['HLXU-5827163','40ft HC','Chen Industries','Shanghai','Hamburg','2024-11-28','2024-12-30','Unterwegs','21000','95000','Nein','Ja'],
['CSQU-8194723','20ft','Al-Rahman LLC','Hamburg','Dubai','2024-12-10','2024-12-28','Am Hafen','12000','67000','Nein','Ja'],
['TCNU-3918274','40ft','Santos Ltd','Hamburg','Santos','2024-12-08','2025-01-05','Verladen','16500','38000','Nein','Nein'],
['MSKU-6182934','20ft Reefer','Yamamoto KK','Bremerhaven','Yokohama','2024-12-15','2025-01-18','Geplant','9800','41000','Nein','Ja'],
['HLXU-9271834','40ft HC','Diallo SARL','Marseille','Dakar','2024-12-12','2024-12-24','Verladen','19200','52000','Ja','Nein']
]}};

export function loadDemo(key){
  if(!key)key='sendungen';
  const d=DEMOS[key];if(!d)return;
  window.N('excel');S.xH=[...d.h];S.xD=d.d.map(r=>[...r]);S.xFn=d.name;
  S.selectedRows=new Set();S.hiddenCols=new Set();S.sortCol=-1;S.sortDir='asc';S.undoStack=[];S.redoStack=[];
  S.xBak=null;S.filtered=false;
  window.showX();window.XR();window.autoSave();
  window.L('Demo',d.name+' ('+d.d.length+' Zeilen)');window.toast('Demo: '+d.name+' ✓');
  // Load template presets for this demo
  loadTemplates(key);
}
export function loadTemplates(key){
  S.savedCases=[];S.savedIE=[];
  if(key==='sendungen'){
    S.savedCases.push({src:'Land',tgt:'Incoterm',cases:[{v:'DE',r:'DAP'},{v:'US',r:'FCA'},{v:'GH',r:'CFR'},{v:'NG',r:'CIF'},{v:'FR',r:'DAP'},{v:'CN',r:'FOB'}],elseVal:'EXW',name:'Land→Incoterm'});
    S.savedCases.push({src:'Gefahrgut',tgt:'Status',cases:[{v:'Ja',r:'DG Prüfung'}],elseVal:'',name:'Gefahrgut→Status'});
    S.savedIE.push({tgt:'Status',elseVal:'Standard',blocks:[{conds:[{col:'Betrag_EUR',op:'>',val:'30000',logic:''}],res:'Premium',type:'if'},{conds:[{col:'Betrag_EUR',op:'>',val:'10000',logic:''}],res:'Mittel',type:'elseif'}],name:'Betrag→Priorität'});
  }else if(key==='rechnungen'){
    S.savedIE.push({tgt:'Status',elseVal:'OK',blocks:[{conds:[{col:'Status',op:'=',val:'Überfällig',logic:''}],res:'MAHNUNG',type:'if'},{conds:[{col:'Brutto_EUR',op:'>',val:'50000',logic:''},{col:'Status',op:'=',val:'Offen',logic:'AND'}],res:'PRIORITÄT',type:'elseif'}],name:'Mahnung/Priorität'});
  }else if(key==='kunden'){
    S.savedCases.push({src:'Segment',tgt:'Segment',cases:[{v:'Premium',r:'⭐ Premium'},{v:'Standard',r:'📋 Standard'},{v:'Neu',r:'🆕 Neu'}],elseVal:'❓ Unbekannt',name:'Segment→Emoji'});
  }else if(key==='container'){
    S.savedIE.push({tgt:'Status',elseVal:'',blocks:[{conds:[{col:'Dokumente_OK',op:'=',val:'Nein',logic:''},{col:'Gefahrgut',op:'=',val:'Ja',logic:'AND'}],res:'⚠ STOPP: DG+Docs!',type:'if'},{conds:[{col:'Dokumente_OK',op:'=',val:'Nein',logic:''}],res:'⚠ Docs fehlen',type:'elseif'}],name:'Dokument-Check'});
  }
  window.renderSavedCases();window.renderSavedIE();
}
