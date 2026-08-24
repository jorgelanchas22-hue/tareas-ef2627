(()=>{
const C={
'2.1.2':'Incorporar hábitos relacionados con procesos de activación corporal, dosificación del esfuerzo, alimentación saludable, educación postural, respiración, relajación, seguridad e higiene durante la práctica de actividades motrices, interiorizando las rutinas propias de una práctica motriz saludable y responsable.',
'2.1.3':'Identificar y adoptar de manera responsable y autónoma medidas generales para la prevención de lesiones antes, durante y después de la práctica de actividad física, en diferentes contextos y situaciones motrices, aprendiendo a reconocer situaciones de riesgo para actuar preventivamente.',
'2.1.4':'Identificar y actuar ante situaciones relacionadas con accidentes derivados de la práctica de actividad física de acuerdo a los protocolos de intervención, aplicando medidas básicas de primeros auxilios en diferentes contextos y ante diferentes tipos de lesiones.',
'2.1.5':'Analizar y valorar críticamente la incidencia que ciertas prácticas y comportamientos tienen en nuestra salud y en la convivencia, en diferentes contextos y situaciones, valorando su impacto y evitando activamente su reproducción en el entorno escolar y en las actividades de la vida cotidiana, haciendo uso para ello de herramientas informáticas.',
'2.2.1':'Desarrollar proyectos y aplicaciones de carácter individual, cooperativo o colaborativo, estableciendo mecanismos para reconducir los procesos de trabajo, utilizando con apoyo ocasional estrategias de autoevaluación y coevaluación tanto del proceso como del resultado, reconociendo y desarrollando así actitudes de superación, crecimiento y resiliencia.',
'2.2.3':'Evidenciar cierto grado de control y dominio corporal al emplear los componentes cualitativos y cuantitativos de la motricidad de manera eficiente y creativa, haciendo frente a las demandas de resolución de problemas con apoyo ocasional en situaciones motrices transferibles a su espacio vivencial con progresiva autonomía.',
'2.3.1':'Practicar una gran variedad de actividades motrices, valorando las implicaciones éticas de las actitudes antideportivas, y gestionando positivamente la competitividad en contextos diversos y actuando con deportividad al asumir los roles de público, participante u otros.',
'2.3.2':'Cooperar en la práctica de diferentes producciones motrices, especialmente a través de juegos y deportes no convencionales, para alcanzar el logro individual y grupal, participando en la toma de decisiones y asumiendo distintos roles asignados y responsabilidades.',
'2.3.3':'Hacer uso con progresiva autonomía de habilidades sociales, diálogo en la resolución de conflictos y respeto ante la diversidad, mostrando una actitud crítica y un compromiso activo frente a los estereotipos, las actuaciones discriminatorias y cualquier tipo de violencia.',
'4.1.2':'Incorporar de forma autónoma los procesos de activación corporal, autorregulación y dosificación del esfuerzo, alimentación saludable, educación postural, respiración, relajación, seguridad e higiene durante la práctica de actividades motrices, tomando conciencia e interiorizando las rutinas propias de una práctica motriz saludable y responsable.',
'4.1.5':'Adoptar actitudes comprometidas y transformadoras que rechacen los estereotipos sociales asociados al ámbito de lo corporal y los comportamientos que pongan en riesgo la salud, contrastando con autonomía cualquier información en base a criterios científicos de validez, fiabilidad y objetividad, haciendo uso para ello de herramientas informáticas.',
'4.1.6':'Explorar diferentes recursos y aplicaciones digitales reconociendo su potencial, así como sus riesgos para su uso en el ámbito de la actividad física y el deporte.',
'4.2.1':'Desarrollar proyectos motores de carácter individual, cooperativo o colaborativo, estableciendo mecanismos para reconducir los procesos de trabajo y asegurar una participación equilibrada, incluyendo estrategias de autoevaluación y coevaluación tanto del proceso como del resultado, consolidando actitudes de superación, crecimiento y resiliencia.',
'4.2.2':'Mostrar habilidades para la adaptación y la actuación ante situaciones con una creciente incertidumbre, aprovechando eficientemente las propias capacidades y aplicando procesos de percepción, decisión y ejecución en contextos reales o simulados, reflexionando sobre las soluciones y resultados obtenidos.',
'4.2.3':'Evidenciar control y dominio corporal al emplear los componentes cualitativos y cuantitativos de la motricidad de manera eficiente y creativa, resolviendo problemas de forma autónoma en situaciones motrices transferibles a su espacio vivencial.',
'4.3.1':'Practicar y participar activamente asumiendo responsabilidades en la organización de una gran variedad de actividades motrices, valorando las implicaciones éticas de las prácticas antideportivas, gestionando positivamente la competitividad y actuando con deportividad.',
'4.3.3':'Relacionarse y entenderse con el resto de participantes durante el desarrollo de diversas prácticas motrices con autonomía y haciendo uso efectivo de habilidades sociales y de diálogo en la resolución de conflictos y respeto ante la diversidad, posicionándose activamente frente a estereotipos, discriminación y violencia.',
'4.5.2':'Diseñar y organizar actividades físico-deportivas en el medio natural y urbano andaluz, asumiendo responsabilidades y aplicando normas de seguridad individuales y colectivas con autonomía.'
};
const MAP=[
['2%C2%BAESO/eval1-tarea1-nutricion',['2.1.2','2.1.5']],['2ºESO/eval1-tarea1-nutricion',['2.1.2','2.1.5']],
['2%C2%BAESO/eval1-tarea2-doms',['2.1.2','2.1.3']],['2ºESO/eval1-tarea2-doms',['2.1.2','2.1.3']],
['2%C2%BAESO/eval2-tarea1-mision-112',['2.1.3','2.1.4']],['2ºESO/eval2-tarea1-mision-112',['2.1.3','2.1.4']],
['2%C2%BAESO/eval2-tarea2-juega-limpio',['2.3.1','2.3.3']],['2ºESO/eval2-tarea2-juega-limpio',['2.3.1','2.3.3']],
['2%C2%BAESO/eval3-tarea1-inventa-deporte',['2.2.1','2.3.2']],['2ºESO/eval3-tarea1-inventa-deporte',['2.2.1','2.3.2']],
['2%C2%BAESO/eval3-tarea2-core',['2.1.2','2.2.3']],['2ºESO/eval3-tarea2-core',['2.1.2','2.2.3']],
['4%C2%BAESO/eval1-tarea1-mitos',['4.1.5','4.1.6']],['4ºESO/eval1-tarea1-mitos',['4.1.5','4.1.6']],
['4%C2%BAESO/eval1-tarea2-presion%20dentro',['4.1.2','4.3.1']],['4ºESO/eval1-tarea2-presion%20dentro',['4.1.2','4.3.1']],['4ºESO/eval1-tarea2-presion dentro',['4.1.2','4.3.1']],
['4%C2%BAESO/eval2-tarea1-estrategia',['4.2.2','4.2.3']],['4ºESO/eval2-tarea1-estrategia',['4.2.2','4.2.3']],
['4%C2%BAESO/eval2-tarea2-arbitraje',['4.3.1','4.3.3']],['4ºESO/eval2-tarea2-arbitraje',['4.3.1','4.3.3']],
['4%C2%BAESO/eval3-tarea1-reto-motriz',['4.2.1','4.2.3']],['4ºESO/eval3-tarea1-reto-motriz',['4.2.1','4.2.3']],
['4%C2%BAESO/eval3-tarea1-gymkhana-orientacion',['4.5.2','4.2.1']],['4ºESO/eval3-tarea1-gymkhana-orientacion',['4.5.2','4.2.1']]
];
function init(){
 const p=decodeURI(location.pathname); let cr=null; for(const [x,c] of MAP){if(p.includes(decodeURI(x))){cr=c;break}} if(!cr)return;
 const st=document.createElement('style');st.textContent=`.criteriosQualitas{border:3px solid #111;border-left:8px solid #dc0614;background:#fff;margin:16px 0 20px;padding:14px 16px;font-family:Arial,sans-serif;color:#1f2937}.criteriosQualitas .cqHead{font-size:12px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;margin-bottom:9px}.criteriosQualitas .cqSub{font-size:11px;color:#6b7280;margin-bottom:9px}.criteriosQualitas .cqItem{background:#f6f8fb;border:1px solid #ccd3dc;padding:9px 11px;margin:7px 0;line-height:1.42;font-size:12px}.criteriosQualitas .cqItem b{color:#174ea6;font-size:13px;margin-right:6px}.criteriosQualitas.compact{margin:0;border-width:0 0 3px 0;border-left:8px solid #dc0614}.criteriosQualitas.compact .cqItem{font-size:11px;padding:6px 9px}`;document.head.appendChild(st);
 const box=document.createElement('section');box.className='criteriosQualitas';box.innerHTML=`<div class="cqHead">Criterios de evaluación · Qualitas Educativa</div><div class="cqSub">Estos son los dos criterios que se evaluarán en esta tarea.</div>${cr.map(c=>`<div class="cqItem"><b>EFI.${c}</b>${C[c]}</div>`).join('')}`;
 const sub=document.querySelector('.sub'); if(sub){sub.insertAdjacentElement('afterend',box);return}
 const wrap=document.querySelector('.wrap'); if(wrap){wrap.insertBefore(box,wrap.firstChild);return}
 const bar=document.querySelector('.bar,.top'); if(bar){box.classList.add('compact');bar.insertAdjacentElement('afterend',box);const fr=document.querySelector('iframe');if(fr){requestAnimationFrame(()=>{fr.style.height=`calc(100vh - ${bar.offsetHeight+box.offsetHeight}px)`})}return}
 document.body.insertBefore(box,document.body.firstChild);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();