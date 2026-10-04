
window.efAccountApp=function(){return firebase.apps.find(a=>a.name==='efActivityAccount')||firebase.initializeApp(firebaseConfig,'efActivityAccount')};
window.efAccountReady=function(){const auth=efAccountApp().auth();return new Promise(resolve=>{const off=auth.onAuthStateChanged(user=>{off();resolve(user)})})};
window.efVerifiedAccount=function(user){return !!(user&&!user.isAnonymous&&user.emailVerified&&user.email&&user.providerData.some(p=>p.providerId==='google.com'))};
window.recordEFActivity=async function(identity,task,interaction=false){
 const user=await efAccountReady();if(!efVerifiedAccount(user))throw new Error('Inicia sesión con Google para registrar actividad.');
 if(!identity||!['2','4'].includes(identity.course)||!new RegExp('^'+identity.course+'[ABC]$').test(identity.group)||!identity.name.trim())throw new Error('Identificación incompleta.');
 const key=Array.from(new TextEncoder().encode(identity.name.trim())).map(b=>b.toString(16).padStart(2,'0')).join('');
 const ref=efAccountApp().database().ref('actividad_ef/2026-2027/'+identity.group+'/'+key),stamp=firebase.database.ServerValue.TIMESTAMP;
 const patch={nombre:identity.name.trim(),grupo:identity.group,curso:identity.course,ultimoAcceso:stamp,cuentaEmail:user.email,cuentaUid:user.uid,nombreCuenta:user.displayName||'',cuentaProveedor:'google.com'};
 if(task)patch['tareas/'+task+(interaction?'/ultimaInteraccion':'/ultimaApertura')]=stamp;
 await ref.update(patch);
};
