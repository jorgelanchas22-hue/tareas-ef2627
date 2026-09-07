# Classroom 50 · Integración con tareas-ef2627

## Objetivo

Usar Classroom 50 como capa de distribución, repositorio individual y trazabilidad de entregas, manteniendo la evaluación educativa (criterios, rúbricas, evidencias y calificación) dentro de la aplicación de Educación Física.

## Situación del repositorio

Repositorio base: `jorgelanchas22-hue/tareas-ef2627`

Cursos: 2.º ESO y 4.º ESO, curso 2026-2027.

Panel auxiliar preparado: `profesor/classroom50.html`.

## Configuración inicial

1. Entrar en https://classroom50.org/?lang=es con GitHub.
2. Autorizar la organización de GitHub que se vaya a utilizar para el curso.
3. Crear dos aulas: `EF 2.º ESO · 2026-2027` y `EF 4.º ESO · 2026-2027`.
4. Crear cada Assignment usando una plantilla adecuada.
5. Copiar el enlace de invitación de cada Assignment.
6. Abrir `profesor/classroom50.html` y guardar el enlace en la ficha de la tarea correspondiente.
7. En Google Classroom: Trabajo de clase → Crear → Tarea → añadir el enlace de invitación de Classroom 50.

## Arquitectura recomendada

- Google Classroom: publicación, fechas, avisos y acceso del alumnado.
- Classroom 50: repositorio individual, registro de entrega y, cuando proceda, comprobaciones automáticas.
- App tareas-ef2627/Firebase: desarrollo de las actividades, evidencias, criterios LOMLOE, rúbricas, propuestas de calificación y seguimiento del profesor.

## Importante sobre autograding

Las tareas de Educación Física no deben reducirse a tests automáticos. El autograding puede usarse para comprobar únicamente aspectos objetivos y estructurados de una entrega (por ejemplo, que exista un archivo exigido o que un JSON tenga determinados campos). La valoración de calidad, reflexión, desempeño, evidencias y criterios debe seguir en la app y bajo revisión docente.

## Privacidad

No incluir en repositorios públicos nombres completos, datos de salud, resultados de pruebas físicas u otra información personal del alumnado. Las entregas individuales deben configurarse como privadas cuando contengan información identificable.
