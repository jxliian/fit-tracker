# FitTracker

Local-first mobile application for workout tracking with **Automatic Progressive Overload**, nutrition, and body metrics.

## Project Architecture

FitTracker uses **Clean Architecture** structured by *Features*:

- **`src/domain/`**: Framework-independent domain entities and value objects.
- **`src/database/`**: Local-first persistence layer using SQLite.
- **`src/features/`**: Isolated feature modules (`workout`, `progression`, `nutrition`, `metrics`).
- **`docs/latex/`**: Technical and academic report formally written in LaTeX.

## Quick Start

```bash
# Install dependencies
npm install

# Start Expo development server
npm start

# Validate TypeScript types
npm run type-check

# Run linters
npm run lint
```

## Technical Documentation (LaTeX)

To compile the formal academic documentation:

```bash
cd docs/latex
pdflatex main.tex
```

## Acknowledgments & Credits

We formally acknowledge **Hasan Yıldırım** for his open-source repository [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset), which provides the dataset of exercises, metadata, and media powering the offline local catalog of FitTracker.
