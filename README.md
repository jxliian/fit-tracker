# FitTracker 🏋️‍♂️📊

Aplicación móvil local-first para el seguimiento de entrenamiento con **Sobrecarga Progresiva Automática**, nutrición y métricas corporales.

## Arquitectura del Proyecto

FitTracker utiliza **Clean Architecture** estructurada por *Features*:

- **`src/domain/`**: Entidades y objetos de valor independientes del framework.
- **`src/database/`**: Capa de persistencia local-first utilizando SQLite.
- **`src/features/`**: Módulos aislados (`workout`, `progression`, `nutrition`, `metrics`).
- **`docs/latex/`**: Memoria técnica y académica del proyecto formalmente redactada en LaTeX.

## Comandos Rápidos

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo Expo
npm start

# Validar tipos de TypeScript
npm run type-check

# Ejecutar linters
npm run lint
```

## Memoria Técnica (LaTeX)

Para compilar la documentación académica formal:

```bash
cd docs/latex
pdflatex main.tex
```
