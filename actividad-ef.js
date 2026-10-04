
// Access is recorded only after selecting an identity; opening is not proof of work.
window.recordEFActivity=async function(identity,task){
 if(!identity||!['2','4'].includes(identity.course)||!new RegExp('^'+identity.course+'[ABC]$').test(identity.group)||!identity.name.trim())return;
 const auth=firebase.auth();if(!auth.currentUser)await auth.signInAnonymously();
 const key=Array.from(new TextEncoder().encode(identity.name.trim())).map(b=>b.toString(16).padStart(2,'0')).join('');
 const ref=firebase.database().ref('actividad_ef/2026-2027/'+identity.group+'/'+key),stamp=firebase.database.ServerValue.TIMESTAMP;
 const patch={nombre:identity.name.trim(),grupo:identity.group,curso:identity.course,ultimoAcceso:stamp};
 if(task)patch['tareas/'+task+'/ultimaApertura']=stamp;
 await ref.update(patch);
};
