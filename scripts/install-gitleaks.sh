#!/usr/bin/env bash
set -euo pipefail
target="${1:?Provide an installation directory}"
mkdir -p "$target"
curl --fail --location --silent --show-error \
 https://github.com/gitleaks/gitleaks/releases/download/v8.24.3/gitleaks_8.24.3_linux_x64.tar.gz \
 -o "$target/gitleaks.tar.gz"
(
 cd "$target"
 echo '9991e0b2903da4c8f6122b5c3186448b927a5da4deef1fe45271c3793f4ee29c  gitleaks.tar.gz' | sha256sum --check
 tar -xzf gitleaks.tar.gz gitleaks
 rm gitleaks.tar.gz
)
