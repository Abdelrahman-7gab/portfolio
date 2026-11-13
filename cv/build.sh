#!/bin/sh
# Builds the CV PDFs into cv/build and copies the résumé to the site.
# Needs Tectonic (brew install tectonic). Usage: ./build.sh [resume cv coverletter]  (default: resume cv)
set -e
cd "$(dirname "$0")"
command -v tectonic >/dev/null || { echo "Tectonic is missing: brew install tectonic"; exit 1; }
mkdir -p build
for doc in ${*:-resume cv}; do
  tectonic -X compile "$doc.tex" --outdir build
done
[ -f build/resume.pdf ] && cp build/resume.pdf ../public/assets/abdelrahman-hegab-resume.pdf
echo "Done: cv/build/*.pdf, public/assets/abdelrahman-hegab-resume.pdf"
